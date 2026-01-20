"""
异常检测计算模块
使用 SQL 直接聚合数据并应用异常判定规则
"""
import pandas as pd
import logging
from typing import Dict, Any, List
from sqlalchemy import text
from utils.db_loader import get_db_engine

logger = logging.getLogger(__name__)

def calculate_anomalies(date_str: str) -> Dict[str, Any]:
    """
    计算指定日期的异常记录 (SQL 版)
    
    Args:
        date_str: 目标日期 YYYY-MM-DD
        
    Returns:
        包含 summary 和 anomalies 列表的字典
    """
    engine = get_db_engine()
    if engine is None:
        return {"summary": {"totalCount": 0, "highRiskCount": 0, "mediumRiskCount": 0, "lowRiskCount": 0}, "anomalies": []}
    
    anomalies = []
    
    # 基础日期对象
    base_dt = pd.to_datetime(date_str)
    
    # 1. TS 异常检测 (8:00 AM 边界)
    # TS 周期: T 08:00 到 T+1 08:00 (UTC+8)
    # 数据库存储的是 UTC，所以对应 UTC: T 00:00 到 T+1 00:00
    ts_start_utc = base_dt  # UTC+8 08:00 -> UTC 00:00
    ts_end_utc = base_dt + pd.Timedelta(days=1)
    
    ts_anomalies = _detect_ts_anomalies_sql(engine, ts_start_utc, ts_end_utc, date_str)
    anomalies.extend(ts_anomalies)
    
    # 2. POS 异常检测 (12:00 PM 边界)
    # POS 周期: T 12:00 到 T+1 12:00 (UTC+8)
    # 对应 UTC: T 04:00 到 T+1 04:00
    pos_start_utc = base_dt + pd.Timedelta(hours=4)
    pos_end_utc = pos_start_utc + pd.Timedelta(days=1)
    
    pos_anomalies = _detect_pos_anomalies_sql(engine, pos_start_utc, pos_end_utc, date_str)
    anomalies.extend(pos_anomalies)
    
    # 3. Staking 异常检测 (00:00 AM 边界)
    # Staking 周期: T 00:00 到 T+1 00:00 (UTC+8)
    # 对应 UTC: T-1 16:00 到 T 16:00
    staking_start_utc = base_dt - pd.Timedelta(hours=8)
    staking_end_utc = staking_start_utc + pd.Timedelta(days=1)
    
    staking_anomalies = _detect_staking_anomalies_sql(engine, staking_start_utc, staking_end_utc, date_str)
    anomalies.extend(staking_anomalies)
    
    # 汇总统计
    summary = {
        "totalCount": len(anomalies),
        "highRiskCount": len([a for a in anomalies if a["severity"] == "high"]),
        "mediumRiskCount": len([a for a in anomalies if a["severity"] == "medium"]),
        "lowRiskCount": len([a for a in anomalies if a["severity"] == "low"])
    }
    
    return {
        "summary": summary,
        "anomalies": anomalies
    }

def _detect_ts_anomalies_sql(engine, start_utc, end_utc, date_label):
    """使用 SQL 检测 TS 异常"""
    # SQL 逻辑：聚合 draw 次数和 claim 次数
    # Category 0,1,2 是 Claim (500, 1500, 50, 150, 25, 75)
    # 其他是 Draw
    query = """
    SELECT 
        to_user as address,
        SUM(CASE WHEN amount IN (500, 1500) THEN 1 ELSE 0 END) as claims,
        SUM(CASE WHEN amount NOT IN (500, 1500, 50, 150, 25, 75) THEN 1 ELSE 0 END) as draws
    FROM take_a_SHIT
    WHERE block_time_dt >= :start AND block_time_dt < :end
    GROUP BY to_user
    HAVING 
        draws > 3 OR 
        draws < 3 OR 
        claims > 20 OR
        (draws = 3 AND claims < 20)
    """
    
    res = []
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params={
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
            })
            
        for _, row in df.iterrows():
            addr = row['address']
            claims = int(row['claims'])
            draws = int(row['draws'])
            
            # 规则判定
            if draws > 3:
                res.append({
                    "date": date_label,
                    "address": addr,
                    "type": "TS_LUCKY_DRAW_OVER",
                    "description": f"抽奖次数异常: {draws}次 (标准为3次)",
                    "severity": "high",
                    "data": {"luckyDraws": draws, "claims": claims}
                })
            elif draws < 3:
                res.append({
                    "date": date_label,
                    "address": addr,
                    "type": "TS_LUCKY_DRAW_UNDER",
                    "description": f"抽奖次数不足: {draws}次 (标准为3次)",
                    "severity": "medium",
                    "data": {"luckyDraws": draws, "claims": claims}
                })
            
            if claims > 20:
                res.append({
                    "date": date_label,
                    "address": addr,
                    "type": "TS_OVER_CLAIM",
                    "description": f"TS 领取次数过多: {claims}次 (上限20次)",
                    "severity": "medium",
                    "data": {"luckyDraws": draws, "claims": claims}
                })
            elif draws == 3 and claims < 20:
                res.append({
                    "date": date_label,
                    "address": addr,
                    "type": "TS_INCONSISTENT",
                    "description": f"抽奖满额但领取不足: 抽奖3次，TS领取仅{claims}次",
                    "severity": "medium",
                    "data": {"luckyDraws": draws, "claims": claims}
                })
    except Exception as e:
        logger.error(f"TS 异常 SQL 查询失败: {e}")
        
    return res

def _detect_pos_anomalies_sql(engine, start_utc, end_utc, date_label):
    """使用 SQL 检测 POS 异常"""
    query = """
    SELECT 
        to_user as address,
        COUNT(*) as count
    FROM shit_pos_rewards
    WHERE block_time_dt >= :start AND block_time_dt < :end
    GROUP BY to_user
    HAVING count > 1
    """
    
    res = []
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params={
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
            })
            
        for _, row in df.iterrows():
            res.append({
                "date": date_label,
                "address": row['address'],
                "type": "POS_DUPLICATE",
                "description": f"POS 同日重复领取: {row['count']}次",
                "severity": "medium",
                "data": {"count": int(row['count'])}
            })
    except Exception as e:
        logger.error(f"POS 异常 SQL 查询失败: {e}")
    return res

def _detect_staking_anomalies_sql(engine, start_utc, end_utc, date_label):
    """使用 SQL 检测 Staking 异常"""
    query = """
    SELECT 
        to_user as address,
        COUNT(*) as count
    FROM shit_staking_rewards
    WHERE block_time_dt >= :start AND block_time_dt < :end
    GROUP BY to_user
    HAVING count > 1
    """
    
    res = []
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params={
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
            })
            
        for _, row in df.iterrows():
            res.append({
                "date": date_label,
                "address": row['address'],
                "type": "STAKING_DUPLICATE",
                "description": f"质押奖励同日重复领取: {row['count']}次",
                "severity": "medium",
                "data": {"count": int(row['count'])}
            })
    except Exception as e:
        logger.error(f"Staking 异常 SQL 查询失败: {e}")
    return res
