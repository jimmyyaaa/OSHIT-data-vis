"""
TS 数据计算模块 (SQL 版)
直接从数据库执行聚合逻辑，不再拉取原始日志到内存。
"""
import pandas as pd
import logging
import traceback
import time
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from utils.db_loader import get_db_engine
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

def calculate_ts_sql(start_date: str, end_date: str) -> Dict[str, Any]:
    """
    计算 TS 数据 (完全基于 SQL 聚合，多线程并行优化)
    """
    engine = get_db_engine()
    if engine is None:
        return _get_empty_response()

    start_total = time.time()
    try:
        # 1. 计算日期边界
        current_start = pd.to_datetime(start_date)
        current_end = pd.to_datetime(end_date) + pd.Timedelta(days=1)
        
        period_days = (current_end - current_start).days
        prev_start = current_start - pd.Timedelta(days=period_days)
        prev_end = current_start

        logger.info(f"[Perf] 开始计算 TS 数据: {start_date} ~ {end_date} (环比从 {prev_start.date()})")

        # 2. 获取平均价格 (一次性查出两个时段的价格)
        t0 = time.time()
        avg_prices = _fetch_combined_avg_prices(engine, prev_start, current_end, current_start)
        avg_price_prev = avg_prices['prev']
        avg_price_current = avg_prices['current']
        logger.info(f"[Perf] 价格查询耗时: {time.time() - t0:.2f}s")

        # 3. 使用线程池并行执行主要查询
        t_parallel = time.time()
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_curr = executor.submit(_fetch_period_metrics_sql, engine, current_start, current_end, avg_price_current)
            future_prev = executor.submit(_fetch_period_metrics_sql, engine, prev_start, prev_end, avg_price_prev)
            future_daily = executor.submit(_fetch_daily_data_sql, engine, current_start, current_end)
            future_top = executor.submit(_fetch_top_users_sql, engine, current_start, current_end)

            metrics_current = future_curr.result()
            metrics_prev = future_prev.result()
            daily_data = future_daily.result()
            top_users = future_top.result()
        
        logger.info(f"[Perf] 并行查询部分总耗时: {time.time() - t_parallel:.2f}s")

        # 4. 计算综合指标和 Delta
        final_metrics = _merge_metrics(metrics_current, metrics_prev)

        logger.info(f"[Perf] TS 总计耗时: {time.time() - start_total:.2f}s")
        
        return {
            'metrics': final_metrics,
            'dailyData': daily_data,
            'topUsers': top_users
        }
    except Exception as e:
        logger.error(f"SQL 计算 TS 数据失败: {str(e)}\n{traceback.format_exc()}")
        return _get_empty_response()

def _fetch_combined_avg_prices(engine, start_utc, end_utc, split_utc) -> Dict[str, float]:
    """一次性查询两个周期的平均价格"""
    query = """
    SELECT 
        AVG(CASE WHEN timestamp_utc >= :start AND timestamp_utc < :split THEN price END) as avg_prev,
        AVG(CASE WHEN timestamp_utc >= :split AND timestamp_utc < :end THEN price END) as avg_curr
    FROM shit_price_history 
    WHERE timestamp_utc >= :start AND timestamp_utc < :end
    """
    try:
        with engine.connect() as conn:
            row = conn.execute(text(query), {
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "split": split_utc.strftime('%Y-%m-%d %H:%M:%S')
            }).fetchone()
            return {
                'prev': float(row[0]) if row and row[0] is not None else 1.0,
                'current': float(row[1]) if row and row[1] is not None else 1.0
            }
    except Exception:
        return {'prev': 1.0, 'current': 1.0}

def _fetch_period_metrics_sql(engine, start_utc, end_utc, avg_price: float) -> Dict[str, float]:
    """单周期 SQL 聚合指标计算"""
    # 核心 SQL: 一次性聚合所有基础计数和总和
    query = """
    SELECT
        COUNT(CASE WHEN amount IN (500, 1500) THEN 1 END) as tsClaim,
        SUM(amount) as totalAmount,
        COUNT(DISTINCT CASE WHEN amount IN (500, 1500) THEN to_user END) as uniqueAddresses,
        COUNT(CASE WHEN amount NOT IN (500, 1500, 50, 150, 25, 75) THEN 1 END) as luckyDraws,
        SUM(CASE WHEN amount NOT IN (500, 1500, 50, 150, 25, 75) THEN amount ELSE 0 END) as luckyDrawAmount,
        COUNT(DISTINCT CASE WHEN amount NOT IN (500, 1500, 50, 150, 25, 75) THEN to_user END) as luckyDrawAddresses,
        COUNT(CASE WHEN amount IN (50, 150) THEN 1 END) as ref1Count,
        COUNT(CASE WHEN amount IN (25, 75) THEN 1 END) as ref2Count,
        SUM(SolSentToTreasury) as revenue,
        COUNT(*) as totalTx
    FROM take_a_SHIT
    WHERE block_time_dt >= :start AND block_time_dt < :end
    """

    try:
        params = {
            "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
            "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
        }
        with engine.connect() as conn:
            row = conn.execute(text(query), params).fetchone()
            
            ts_claim = int(row[0] or 0)
            total_amount = float(row[1] or 0.0)
            unique_addresses = int(row[2] or 0)
            lucky_draws = int(row[3] or 0)
            lucky_draw_amount = float(row[4] or 0.0)
            lucky_draw_addresses = int(row[5] or 0)
            ref1 = int(row[6] or 0)
            ref2 = int(row[7] or 0)
            revenue = float(row[8] or 0.0)
            total_tx = int(row[9] or 0)
            
            # 计算衍生指标 (层级逻辑: ref1 包含 ref2, tsClaim 包含 ref1)
            two_ref_tx = ref2
            one_ref_tx = ref1 - ref2
            wolf_tx = ts_claim - ref1
            
            shit_cost = total_amount * avg_price
            roi = (revenue / shit_cost) if shit_cost > 0 else 0.0
            
            return {
                'totalTx': total_tx,
                'tsClaim': ts_claim,
                'totalAmount': total_amount,
                'uniqueAddresses': unique_addresses,
                'meanClaims': (ts_claim / unique_addresses) if unique_addresses > 0 else 0.0,
                'wolfTx': wolf_tx,
                'oneRefTx': one_ref_tx,
                'twoRefTx': two_ref_tx,
                'luckyDraws': lucky_draws,
                'luckyDrawAmount': lucky_draw_amount,
                'luckyDrawAddresses': lucky_draw_addresses,
                'revenue': revenue,
                'shitCost': shit_cost,
                'roi': roi
            }
    except Exception as e:
        logger.error(f"SQL 获取周期指标失败: {e}")
        return {}

def _fetch_daily_data_sql(engine, start_utc, end_utc) -> List[Dict[str, Any]]:
    """日数据 SQL 聚合"""
    query = """
    SELECT 
        DATE(block_time_dt) as date,
        COUNT(*) as txCount,
        SUM(amount) as shitSent,
        SUM(SolSentToTreasury) as solReceived
    FROM take_a_SHIT
    WHERE block_time_dt >= :start AND block_time_dt < :end
    GROUP BY date
    ORDER BY date
    """
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params={
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
            })
            if df.empty: return []
            df['date'] = df['date'].astype(str)
            return df.to_dict('records')
    except Exception:
        return []

def _fetch_top_users_sql(engine, start_utc, end_utc) -> List[Dict[str, Any]]:
    """前10大户 SQL 聚合"""
    query = """
    SELECT 
        to_user as fullAddress,
        SUM(amount) as shitSent,
        COUNT(*) as txCount
    FROM take_a_SHIT
    WHERE block_time_dt >= :start AND block_time_dt < :end
        AND amount IN (500, 1500)
    GROUP BY to_user
    ORDER BY shitSent DESC
    LIMIT 10
    """
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params={
                "start": start_utc.strftime('%Y-%m-%d %H:%M:%S'),
                "end": end_utc.strftime('%Y-%m-%d %H:%M:%S')
            })
            if df.empty: return []
            df['address'] = df['fullAddress'].apply(lambda x: f"{x[:4]}...{x[-4:]}")
            return df.to_dict('records')
    except Exception:
        return []

def _merge_metrics(current: Dict[str, Any], prev: Dict[str, Any]) -> Dict[str, Any]:
    """合并本期和环比指标并计算 Delta"""
    result = {}
    
    def calc_delta(curr_val, prev_val):
        if prev_val is None or prev_val <= 0: return None
        return (curr_val - prev_val) / prev_val * 100

    keys = current.keys() if current else prev.keys()
    for key in keys:
        curr_val = current.get(key, 0)
        prev_val = prev.get(key, 0)
        
        result[f"{key}Current"] = curr_val
        result[f"{key}Prev"] = prev_val
        result[f"{key}Delta"] = calc_delta(curr_val, prev_val)
        
    return result

def _get_empty_response():
    return {
        'metrics': {},
        'dailyData': [],
        'topUsers': []
    }
