import os
import pandas as pd
from sqlalchemy import create_engine, text
import logging

logger = logging.getLogger(__name__)

def get_db_engine():
    """创建并返回 SQLAlchemy 数据库引擎"""
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    database = os.getenv("DB_NAME")
    
    if not all([host, user, password, database]):
        logger.error("数据库配置缺失，请检查 .env 文件")
        return None
        
    # 构造连接字符串
    connection_string = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{database}"
    
    try:
        engine = create_engine(connection_string)
        return engine
    except Exception as e:
        logger.error(f"创建数据库引擎失败: {e}")
        return None

def load_ts_log_from_db(start_dt=None, end_dt=None):
    """
    从数据库加载 TS_Log 数据并进行字段映射和时区转换
    如果提供了 start_dt 和 end_dt (UTC+8)，则进行时间范围过滤
    """
    engine = get_db_engine()
    if engine is None:
        return pd.DataFrame()
        
    # SQL 查询：基础查询
    query = """
    SELECT 
        block_time_dt,
        transfer_index,
        to_user,
        amount,
        SolSentToTreasury
    FROM take_a_SHIT
    """
    
    params = {}
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 以匹配数据库
        db_start = start_dt - pd.Timedelta(hours=8)
        db_end = end_dt - pd.Timedelta(hours=8)
        query += " WHERE block_time_dt >= :start AND block_time_dt < :end"
        params = {"start": db_start, "end": db_end}
    
    try:
        # 使用 SQLAlchemy 的 text() 包装查询，并传参防止注入
        df = pd.read_sql(text(query), engine, params=params)
        
        if df.empty:
            logger.warning(f"数据库中未找到数据 (范围: {start_dt} 到 {end_dt})")
            return df
            
        # 1. 时区转换: block_time_dt (UTC+0) -> Timestamp(UTC+8)
        df['Timestamp(UTC+8)'] = pd.to_datetime(df['block_time_dt']) + pd.Timedelta(hours=8)
        
        # 2. 字段映射
        df = df.rename(columns={
            'transfer_index': 'TS_Category',
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL_Received'
        })
        
        # 3. 类型转换 (Decimal -> float)
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL_Received'] = df['SOL_Received'].astype(float)
        
        # 4. 根据金额重新计算 TS_Category
        # 规则：500/1500 -> 0, 50/150 -> 1, 25/75 -> 2, 其他 -> 3
        df['TS_Category'] = 3  # 默认为 3 (Lucky Draw)
        df.loc[df['SHIT Sent'].isin([500.0, 1500.0]), 'TS_Category'] = 0
        df.loc[df['SHIT Sent'].isin([50.0, 150.0]), 'TS_Category'] = 1
        df.loc[df['SHIT Sent'].isin([25.0, 75.0]), 'TS_Category'] = 2
        
        logger.info(f"从数据库成功加载了 {len(df)} 条 TS_Log 数据")
        return df
        
    except Exception as e:
        logger.error(f"从数据库加载数据失败: {e}")
        return pd.DataFrame()
