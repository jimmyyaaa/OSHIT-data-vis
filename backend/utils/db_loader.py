import os
import pandas as pd
import logging
from typing import Optional
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

def get_db_engine():
    """创建并返回 SQLAlchemy 数据库引擎"""
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", 3306)
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD") or os.getenv("DB_PASS")
    database = os.getenv("DB_NAME")
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
    直接从 RDS 数据库的 take_a_SHIT 表加载 TS_Log 数据。
    如果提供了 start_dt 和 end_dt (UTC+8)，则将其转换为 UTC 格式进行 SQL 过滤。
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
        logger.info(f"正在执行 SQL 查询: {query} 参数: {params}")
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
