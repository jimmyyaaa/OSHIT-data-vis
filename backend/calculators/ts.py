"""
TS 数据计算模块
计算 TS 交易相关的指标、日数据和用户排行
纯函数式实现 - 直接接收 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


TIMESTAMP_COL = 'Timestamp(UTC+8)'

# TS_Category 分类
TS_NORMAL = 0
TS_ONE_REF = 1
TS_TWO_REF = 2
TS_LUCKY_DRAW = 3


def calculate_ts(
    df_log_current: pd.DataFrame,
    df_log_prev: pd.DataFrame,
    df_price_current: Optional[pd.DataFrame] = None,
    df_price_prev: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    计算 TS 数据（纯函数式）
    
    Args:
        df_log_current: 当前周期的 TS_Log
        df_log_prev: 前一周期的 TS_Log
        df_price_current: 当前周期的 SHIT_Price_Log（可选）
        df_price_prev: 前一周期的 SHIT_Price_Log（可选）
    
    Returns:
        包含 metrics, dailyData, topUsers 的字典
    """
    # 处理空DataFrame
    if df_price_current is None:
        df_price_current = pd.DataFrame()
    if df_price_prev is None:
        df_price_prev = pd.DataFrame()
    
    # 计算平均价格
    avg_price_current = _calculate_avg_price(df_price_current)
    avg_price_prev = _calculate_avg_price(df_price_prev)
    
    # 计算指标
    metrics = _compute_metrics(
        df_log_current, df_log_prev,
        avg_price_current, avg_price_prev
    )
    
    # 计算日数据
    daily_data = _calculate_daily_data(df_log_current)
    
    # 计算用户排行
    top_users = _calculate_top_users(df_log_current)
    
    return {
        'metrics': metrics,
        'dailyData': daily_data,
        'topUsers': top_users
    }


def _compute_metrics(
    df_log_current: pd.DataFrame,
    df_log_prev: pd.DataFrame,
    avg_price_current: float = 1.0,
    avg_price_prev: float = 1.0
) -> Dict[str, Any]:
    """计算当前周期和前一周期的指标及 Delta"""
    
    # 使用传入的价格参数
    # 当前周期指标
    metrics_current = _compute_period_metrics(df_log_current, avg_price_current)
    
    # 前一周期指标
    metrics_prev = _compute_period_metrics(df_log_prev, avg_price_prev)
    
    # 计算 Delta（百分比）
    def calc_delta(current: float, prev: float) -> Optional[float]:
        if prev <= 0:
            return None
        return (current - prev) / prev * 100
    
    result = {}
    
    # Current
    for key, val in metrics_current.items():
        result[key + 'Current'] = val
    
    # Previous
    for key, val in metrics_prev.items():
        result[key + 'Prev'] = val
    
    # Delta
    for key in metrics_current.keys():
        result[key + 'Delta'] = calc_delta(metrics_current[key], metrics_prev[key])
    
    return result


def _compute_period_metrics(
    df_ts: pd.DataFrame,
    avg_price: float
) -> Dict[str, float]:
    """计算单个周期的所有指标"""
    
    if len(df_ts) == 0:
        return {
            'totalTx': 0.0,
            'tsClaim': 0.0,
            'totalAmount': 0.0,
            'uniqueAddresses': 0.0,
            'meanClaims': 0.0,
            'medianClaims': 0.0,
            'avgInterval': 0.0,
            'wolfTx': 0.0,
            'oneRefTx': 0.0,
            'twoRefTx': 0.0,
            'luckyDraws': 0.0,
            'luckyDrawAmount': 0.0,
            'luckyDrawAddresses': 0.0,
            'revenue': 0.0,
            'shitCost': 0.0,
            'roi': 0.0,
        }
    
    # 基础交易指标
    total_tx = len(df_ts)
    ts_claim = len(df_ts[df_ts['TS_Category'] == TS_NORMAL])
    total_amount = float(df_ts['SHIT Sent'].sum())
    unique_addresses = len(df_ts[df_ts['TS_Category'] == TS_NORMAL]['Receiver Address'].unique())
    
    # 按地址统计
    ts_normal = df_ts[df_ts['TS_Category'] == TS_NORMAL]
    addr_claims = ts_normal.groupby('Receiver Address').size()
    
    mean_claims = float(addr_claims.mean()) if len(addr_claims) > 0 else 0.0
    median_claims = float(addr_claims.median()) if len(addr_claims) > 0 else 0.0
    
    # 平均时间间隔（分钟）
    avg_interval = _calculate_avg_interval(df_ts)
    
    # 幸运抽奖
    lucky_draws = len(df_ts[df_ts['TS_Category'] == TS_LUCKY_DRAW])
    lucky_draw_amount = float(df_ts[df_ts['TS_Category'] == TS_LUCKY_DRAW]['SHIT Sent'].sum())
    lucky_draw_addresses = len(df_ts[df_ts['TS_Category'] == TS_LUCKY_DRAW]['Receiver Address'].unique())
    
    # Reference 分类 - 有包含关系：
    # wolfTx = Category == 0
    # twoRefTx = Category == 2
    # oneRefTx = Category == 1 的数量 - Category == 2 的数量（因为每个2都对应一个1）
    level2_count = len(df_ts[df_ts['TS_Category'] == TS_TWO_REF])
    level1_count = len(df_ts[df_ts['TS_Category'] == TS_ONE_REF]) - level2_count
    level0_count = len(df_ts[df_ts['TS_Category'] == TS_NORMAL]) - level1_count - level2_count
    
    wolf_tx = float(level0_count)
    one_ref_tx = float(level1_count)
    two_ref_tx = float(level2_count)
    
    # 收入和成本
    revenue = float(df_ts['SOL_Received'].sum()) if 'SOL_Received' in df_ts.columns else 0.0
    shit_cost = total_amount * avg_price
    roi = (revenue / shit_cost) if shit_cost > 0 else 0.0
    
    return {
        'totalTx': int(total_tx),
        'tsClaim': int(ts_claim),
        'totalAmount': float(total_amount),
        'uniqueAddresses': int(unique_addresses),
        'meanClaims': float(mean_claims),
        'medianClaims': float(median_claims),
        'avgInterval': float(avg_interval),
        'wolfTx': int(wolf_tx),
        'oneRefTx': int(one_ref_tx),
        'twoRefTx': int(two_ref_tx),
        'luckyDraws': int(lucky_draws),
        'luckyDrawAmount': float(lucky_draw_amount),
        'luckyDrawAddresses': int(lucky_draw_addresses),
        'revenue': float(revenue),
        'shitCost': float(shit_cost),
        'roi': float(roi),
    }


def _calculate_avg_interval(df: pd.DataFrame) -> float:
    """计算平均交易间隔（分钟）"""
    if len(df) == 0:
        return 0.0
    
    # 按地址排序，计算时间差 - 纯向量化，无循环
    df_sorted = df.sort_values(['Receiver Address', TIMESTAMP_COL])
    
    # 按地址计算时间差
    diffs = df_sorted.groupby('Receiver Address')[TIMESTAMP_COL].diff().dt.total_seconds() / 60
    
    # 过滤出有效的时间差（非 NaN）并计算平均值
    valid_diffs = diffs[diffs.notna()]
    
    return float(valid_diffs.mean()) if len(valid_diffs) > 0 else 0.0


def _calculate_daily_data(
    df_ts: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算日数据（使用 8am 边界）"""
    
    if len(df_ts) == 0:
        return []
    
    # 复制并添加日期列
    df = df_ts.copy()
    # 使用向量化操作计算交易日 (以 8am 为边界)
    # (ts - 8h).date() 会将 00:00-07:59 的交易归入前一天
    df['date'] = (df[TIMESTAMP_COL] - pd.Timedelta(hours=8)).dt.strftime('%Y-%m-%d')
    
    # 按日期聚合
    daily = df.groupby('date').agg({
        TIMESTAMP_COL: 'count',  # txCount
        'SHIT Sent': 'sum',       # shitSent
        'SOL_Received': 'sum'     # solReceived
    }).reset_index()
    
    # 重命名列 - 使用 rename 避免多级列问题
    daily = daily.rename(columns={
        TIMESTAMP_COL: 'txCount',
        'SHIT Sent': 'shitSent',
        'SOL_Received': 'solReceived'
    })
    
    return daily[['date', 'txCount', 'shitSent', 'solReceived']].astype({
        'txCount': 'int',
        'shitSent': 'float',
        'solReceived': 'float'
    }).to_dict('records')


def _calculate_top_users(
    df_ts: pd.DataFrame,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """计算用户交易排行 - 仅统计 TS_Category == 0 (Normal Claims)"""
    
    if len(df_ts) == 0:
        return []
    
    # 只保留 TS_Category == 0 的交易
    df_normal = df_ts[df_ts['TS_Category'] == TS_NORMAL]
    
    if len(df_normal) == 0:
        return []
    
    # 按地址聚合交易数和总金额 - 分别处理
    user_shit = df_normal.groupby('Receiver Address')['SHIT Sent'].sum()
    user_tx = df_normal.groupby('Receiver Address').size()
    
    # 合并结果
    user_stats = pd.DataFrame({
        'fullAddress': user_shit.index,
        'shitSent': user_shit.values,
        'txCount': user_tx.values
    })
    
    # 排序并取前 N
    user_stats = user_stats.sort_values('shitSent', ascending=False).head(top_n).reset_index(drop=True)
    
    # 添加缩写地址
    user_stats['address'] = user_stats['fullAddress'].apply(
        lambda addr: f"{addr[:4]}...{addr[-4:]}"
    )
    
    return user_stats[['address', 'fullAddress', 'shitSent', 'txCount']].astype({
        'shitSent': 'float',
        'txCount': 'int'
    }).to_dict('records')


def _calculate_avg_price(df_price: pd.DataFrame) -> float:
    """计算平均SHIT价格"""
    if len(df_price) == 0 or 'Price' not in df_price.columns:
        return 1.0
    
    prices = df_price['Price'].dropna()
    if len(prices) == 0:
        return 1.0
    
    return float(prices.mean())
