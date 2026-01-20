import os
import pandas as pd
import logging
from typing import Optional
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

def get_db_engine():
    """创建并返回 SQLAlchemy 数据库引擎 (指向 TS_History 数据库)"""
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", 3306)
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD") or os.getenv("DB_PASS")
    database = os.getenv("DB_NAME_TS") or "TS_History"
    ca_path = os.getenv("DB_SSL_CA")
    
    if not all([host, user, password, database]):
        logger.error(f"数据库配置缺失: host={host}, user={user}, password={'***' if password else None}, database={database}")
        return None
    
    # 构造连接字符串 (使用 pymysql)
    connection_string = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
    
    connect_args = {}
    if ca_path:
        if os.path.exists(ca_path):
            connect_args["ssl"] = {
                "ca": ca_path,
                "check_hostname": True
            }
        else:
            logger.warning(f"SSL CA 证书文件未找到: {ca_path}")
            
    return create_engine(connection_string, connect_args=connect_args)

def load_ts_log_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库的 take_a_SHIT 表加载 TS_Log 数据。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = "SELECT block_time_dt, to_user, amount, SolSentToTreasury FROM take_a_SHIT"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤 (数据库中 block_time_dt 通常存的是 UTC)
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在执行 TS SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: block_time_dt (UTC) -> Timestamp(UTC+8)
        # 数据库中 block_time_dt 如果是 DATETIME 类型且存的是 UTC
        df['block_time_dt'] = pd.to_datetime(df['block_time_dt'])
        
        # 处理时区感知的 datetime
        if df['block_time_dt'].dt.tz is None:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_localize('UTC')
        else:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['block_time_dt'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        df = df.rename(columns={
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL_Received'
        })
        
        # 3. 类型转换
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL_Received'] = df['SOL_Received'].astype(float)
        
        # 4. 根据金额重新计算 TS_Category
        # 规则与之前保持一致：500/1500 -> 0, 50/150 -> 1, 25/75 -> 2, 其他 -> 3
        df['TS_Category'] = 3  # 默认为 3 (Lucky Draw)
        df.loc[df['SHIT Sent'].isin([500.0, 1500.0]), 'TS_Category'] = 0
        df.loc[df['SHIT Sent'].isin([50.0, 150.0]), 'TS_Category'] = 1
        df.loc[df['SHIT Sent'].isin([25.0, 75.0]), 'TS_Category'] = 2
        
        logger.info(f"从 RDS 成功加载了 {len(df)} 条 TS_Log 数据")
        return df
        
    except Exception as e:
        logger.error(f"从 RDS 加载数据失败: {e}")
        return pd.DataFrame()
    
def load_pos_log_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库的 shit_pos_rewards 表加载 POS_Log 数据。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = "SELECT block_time_dt, to_user, amount, SolSentToTreasury FROM shit_pos_rewards"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从 POS 数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"POS 数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: block_time_dt (UTC) -> Timestamp(UTC+8)
        df['block_time_dt'] = pd.to_datetime(df['block_time_dt'])
        if df['block_time_dt'].dt.tz is None:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_localize('UTC')
        else:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['block_time_dt'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射，适配现有 POS 计算逻辑
        df = df.rename(columns={
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL Received'
        })
        
        # 3. 类型转换
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL Received'] = df['SOL Received'].astype(float)
        
        logger.info(f"从 POS 数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从 POS 数据库加载数据失败: {e}")
        return pd.DataFrame()

def load_shitcode_log_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库的 shit_code 表加载 ShitCode_Log 数据。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = "SELECT block_time_dt, to_user, amount, SolSentToTreasury FROM SHIT_code"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从 ShitCode 数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"ShitCode 数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: block_time_dt (UTC) -> Timestamp(UTC+8)
        df['block_time_dt'] = pd.to_datetime(df['block_time_dt'])
        if df['block_time_dt'].dt.tz is None:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_localize('UTC')
        else:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['block_time_dt'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        df = df.rename(columns={
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL Received'
        })
        
        # 3. 类型转换
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL Received'] = df['SOL Received'].astype(float)
        
        logger.info(f"从 ShitCode 数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从 ShitCode 数据库加载数据失败: {e}")
        return pd.DataFrame()
    
def load_staking_amount_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库加载 Staking_Amount_Log 数据 (来自事件表)。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    table_name = "shit_staking_events"
    query = f"SELECT block_time_dt, user_address, amount, event_type FROM {table_name}"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从 Staking event 数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"Staking event 数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: block_time_dt (UTC) -> Timestamp(UTC+8)
        df['block_time_dt'] = pd.to_datetime(df['block_time_dt'])
        if df['block_time_dt'].dt.tz is None:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_localize('UTC')
        else:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['block_time_dt'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        # Staking 计算逻辑期望的字段: Type (STAKE/UNSTAKE), SHIT Amount, Address
        df = df.rename(columns={
            'user_address': 'Address',
            'amount': 'SHIT Amount',
            'event_type': 'Type'
        })
        
        # 3. 类型转换
        df['SHIT Amount'] = df['SHIT Amount'].astype(float)
        
        logger.info(f"从 Staking event 数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从 Staking event 数据库加载数据失败: {e}")
        return pd.DataFrame()

def load_staking_reward_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库加载 Staking_Reward_Log 数据。
    符合 POS 格式: 无 type, 包含 SolSentToTreasury。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = f"SELECT block_time_dt, to_user, amount, SolSentToTreasury FROM shit_staking_rewards"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从 Staking Reward 数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"Staking Reward 数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: block_time_dt (UTC) -> Timestamp(UTC+8)
        df['block_time_dt'] = pd.to_datetime(df['block_time_dt'])
        if df['block_time_dt'].dt.tz is None:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_localize('UTC')
        else:
            df['block_time_dt'] = df['block_time_dt'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['block_time_dt'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        df = df.rename(columns={
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL Received'
        })
        
        # 3. 类型转换
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL Received'] = df['SOL Received'].astype(float)
        
        logger.info(f"从 Staking Reward 数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从 Staking Reward 数据库加载数据失败: {e}")
        return pd.DataFrame()
    

def load_defi_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库的 liq_pool_activity 表加载 DeFi 数据。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = "SELECT timestamp_utc, from_address, activity, shit_change, usdt_change FROM liq_pool_activity"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 字符串进行过滤
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE timestamp_utc >= :start AND timestamp_utc < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从 DeFi 数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"DeFi 数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 时区转换: timestamp_utc (UTC) -> Timestamp(UTC+8)
        df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'])
        if df['timestamp_utc'].dt.tz is None:
            df['timestamp_utc'] = df['timestamp_utc'].dt.tz_localize('UTC')
        else:
            df['timestamp_utc'] = df['timestamp_utc'].dt.tz_convert('UTC')
            
        df['Timestamp(UTC+8)'] = df['timestamp_utc'].dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        df = df.rename(columns={
            'from_address': 'FromAddress',
            'activity': 'Activity',
            'shit_change': 'SHIT Change',
            'usdt_change': 'USDT Change'
        })
        
        # 3. 类型转换
        df['SHIT Change'] = df['SHIT Change'].astype(float)
        df['USDT Change'] = df['USDT Change'].astype(float)
        
        logger.info(f"从 DeFi 数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从 DeFi 数据库加载数据失败: {e}")
        return pd.DataFrame()

def load_price_history_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    直接从数据库的 shit_price_history 表加载价格数据。
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    query = "SELECT timestamp_utc, timestamp_utc8, price FROM shit_price_history"
    params = {}
    
    if start_dt is not None and end_dt is not None:
        # 数据库中通常存的是 UTC 时间
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        query += " WHERE timestamp_utc >= :start AND timestamp_utc < :end"
        params = {
            "start": utc_start.strftime('%Y-%m-%d %H:%M:%S'),
            "end": utc_end.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        logger.info(f"正在从价格数据库执行 SQL 查询: {query} 参数: {params}")
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        
        if df.empty:
            logger.warning(f"价格数据库返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 1. 字段映射和时区处理
        # 计算逻辑期望的字段是 Timestamp(UTC+8) 和 Price
        df['Timestamp(UTC+8)'] = pd.to_datetime(df['timestamp_utc8'])
        df = df.rename(columns={
            'price': 'Price'
        })
        
        # 3. 类型转换
        df['Price'] = df['Price'].astype(float)
        
        # 只保留需要的列
        df = df[['Timestamp(UTC+8)', 'Price']]
        
        logger.info(f"从价格数据库成功加载了 {len(df)} 条记录")
        return df
        
    except Exception as e:
        logger.error(f"从价格数据库加载数据失败: {e}")
        return pd.DataFrame()
    
