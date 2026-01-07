import os
import pandas as pd
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def load_ts_log_from_db(start_dt: Optional[pd.Timestamp] = None, end_dt: Optional[pd.Timestamp] = None):
    """
    从 Lambda 接口(fetchTSdb)加载 TS_Log 数据并进行字段映射和时区转换。
    如果提供了 start_dt 和 end_dt (UTC+8)，则将其转换为 UTC ISO 格式进行过滤。
    """
    lambda_url = os.getenv("TS_LAMBDA_URL")
    if not lambda_url:
        logger.error("环境变量 TS_LAMBDA_URL 缺失，请检查 .env 文件")
        return pd.DataFrame()
        
    params = {}
    if start_dt is not None and end_dt is not None:
        # 将 UTC+8 时间转换为 UTC+0 ISO 格式 (例如: 2026-01-05T23:00:00Z)
        utc_start = start_dt - pd.Timedelta(hours=8)
        utc_end = end_dt - pd.Timedelta(hours=8)
        
        params = {
            "starttime": utc_start.strftime('%Y-%m-%dT%H:%M:%SZ'),
            "endtime": utc_end.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
    
    try:
        # 使用分页辅助函数获取所有数据
        rows = _fetch_all_paged_data(lambda_url, params)
        
        if not rows:
            logger.warning(f"Lambda 返回数据为空 (范围: {start_dt} 到 {end_dt})")
            return pd.DataFrame()
            
        # 构造 DataFrame
        df = pd.DataFrame(rows)
        
        # 1. 时区转换: block_time_dt (UTC+0 ISO) -> Timestamp(UTC+8)
        # 修正：先转为带时区的时间，转换时区后，最后去掉时区信息 (tz_localize(None)) 以兼容 tz-naive 比较
        df['Timestamp(UTC+8)'] = pd.to_datetime(df['block_time_dt']).dt.tz_convert('Asia/Shanghai').dt.tz_localize(None)
        
        # 2. 字段映射
        df = df.rename(columns={
            'transfer_index': 'TS_Category',
            'to_user': 'Receiver Address',
            'amount': 'SHIT Sent',
            'SolSentToTreasury': 'SOL_Received'
        })
        
        # 3. 类型转换 (String/Decimal -> float)
        df['SHIT Sent'] = df['SHIT Sent'].astype(float)
        df['SOL_Received'] = df['SOL_Received'].astype(float)
        
        # 4. 根据金额重新计算 TS_Category
        # 规则：500/1500 -> 0, 50/150 -> 1, 25/75 -> 2, 其他 -> 3
        df['TS_Category'] = 3  # 默认为 3 (Lucky Draw)
        df.loc[df['SHIT Sent'].isin([500.0, 1500.0]), 'TS_Category'] = 0
        df.loc[df['SHIT Sent'].isin([50.0, 150.0]), 'TS_Category'] = 1
        df.loc[df['SHIT Sent'].isin([25.0, 75.0]), 'TS_Category'] = 2
        
        logger.info(f"从 Lambda 成功加载了 {len(df)} 条 TS_Log 数据")
        return df
        
    except Exception as e:
        logger.error(f"从 Lambda 加载数据失败: {e}")
        return pd.DataFrame()

def _fetch_all_paged_data(url: str, base_params: dict) -> list:
    """
    使用 Cursor 分页获取所有数据的辅助函数
    """
    all_rows = []
    limit = 1500
    cursor_dt = None
    cursor_id = None
    max_retries = 3
    
    while True:
        # 构造 POST Payload
        payload = base_params.copy()
        payload.update({"limit": limit})
        
        if cursor_dt and cursor_id is not None:
            payload.update({
                "cursorDt": cursor_dt,
                "cursorId": cursor_id
            })
        
        success = False
        for attempt in range(max_retries):
            try:
                logger.info(f"正在请求 Cursor 数据: cursorDt={cursor_dt}, cursorId={cursor_id} (尝试 {attempt+1}/{max_retries})")
                # 必须使用 POST 请求和 JSON Body
                response = requests.post(url, json=payload, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                rows = data.get('rows', [])
                all_rows.extend(rows)
                
                logger.info(f"已获取 {len(all_rows)} 条数据 (本次采集 {len(rows)} 条)")
                
                # 检查是否有下一个游标
                next_cursor = data.get('nextCursor')
                if not next_cursor:
                    return all_rows # 抓取完毕
                
                cursor_dt = next_cursor.get('cursorDt')
                cursor_id = next_cursor.get('cursorId')
                
                success = True
                break # 跳出重试循环
                
            except Exception as e:
                logger.warning(f"分页请求失败: {e}")
                if attempt == max_retries - 1:
                    raise e
    
    return all_rows
