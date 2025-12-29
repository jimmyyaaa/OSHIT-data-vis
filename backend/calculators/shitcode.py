"""
ShitCode 数据计算模块
计算 ShitCode 相关的指标、日数据和用户排行
纯函数式实现 - 直接接收 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd


TIMESTAMP_COL = 'Timestamp(UTC+8)'


def calculate_shitcode(
    df_current: pd.DataFrame,
    df_prev: pd.DataFrame
) -> Dict[str, Any]:
    """
    计算 ShitCode 数据（纯函数式）
    
    Args:
        df_current: 当前周期的 ShitCode_Log
        df_prev: 前一周期的 ShitCode_Log
    
    Returns:
        包含 metrics, dailyData, topUsers 的字典
    """
    # 计算指标
    metrics = _compute_metrics(df_current, df_prev)
    
    # 计算日数据
    daily_data = _calculate_daily_data(df_current)
    
    # 计算用户排行
    top_users = _calculate_top_users(df_current)
    
    return {
        'metrics': metrics,
        'dailyData': daily_data,
        'topUsers': top_users
    }


def _compute_metrics(
    df_current: pd.DataFrame,
    df_prev: pd.DataFrame
) -> Dict[str, Any]:
    """计算当前周期和前一周期的指标及 Delta"""
    
    # 当前周期指标
    metrics_current = _compute_period_metrics(df_current)
    
    # 前一周期指标
    metrics_prev = _compute_period_metrics(df_prev)
    
    # 计算 Delta（百分比）
    def calc_delta(current: Any, prev: Any) -> Optional[float]:
        if prev is None or prev <= 0:
            return None
        return (current - prev) / prev * 100
    
    return {
        # Current
        'claimCountCurrent': metrics_current['claimCount'],
        'claimAmountCurrent': metrics_current['claimAmount'],
        'uniqueAddressesCurrent': metrics_current['uniqueAddresses'],
        'avgClaimPerAddressCurrent': metrics_current['avgClaimPerAddress'],
        
        # Previous
        'claimCountPrev': metrics_prev['claimCount'],
        'claimAmountPrev': metrics_prev['claimAmount'],
        'uniqueAddressesPrev': metrics_prev['uniqueAddresses'],
        'avgClaimPerAddressPrev': metrics_prev['avgClaimPerAddress'],
        
        # Delta
        'claimCountDelta': calc_delta(metrics_current['claimCount'], metrics_prev['claimCount']),
        'claimAmountDelta': calc_delta(metrics_current['claimAmount'], metrics_prev['claimAmount']),
        'uniqueAddressesDelta': calc_delta(metrics_current['uniqueAddresses'], metrics_prev['uniqueAddresses']),
        'avgClaimPerAddressDelta': calc_delta(
            metrics_current['avgClaimPerAddress'] or 0,
            metrics_prev['avgClaimPerAddress'] or 0
        ) if metrics_current['avgClaimPerAddress'] and metrics_prev['avgClaimPerAddress'] else None,
    }


def _compute_period_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """计算单个周期的指标"""
    
    if len(df) == 0:
        return {
            'claimCount': 0,
            'claimAmount': 0.0,
            'uniqueAddresses': 0,
            'avgClaimPerAddress': None,
        }
    
    claim_count = len(df)
    claim_amount = float(df['SHIT Sent'].sum())
    unique_addresses = int(df['Receiver Address'].nunique())
    avg_claim_per_address = claim_amount / unique_addresses if unique_addresses > 0 else None
    
    return {
        'claimCount': claim_count,
        'claimAmount': claim_amount,
        'uniqueAddresses': unique_addresses,
        'avgClaimPerAddress': avg_claim_per_address,
    }


def _calculate_daily_data(
    df: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算日数据"""
    
    if len(df) == 0:
        return []
    
    # 提取日期
    df = df.copy()
    df['date'] = df[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    
    # 按日期聚合
    daily = df.groupby('date').agg({
        TIMESTAMP_COL: 'count',  # claimCount
        'SHIT Sent': 'sum',       # claimAmount
        'SOL Received': 'sum'     # solReceived
    }).reset_index()
    
    # 重命名列 - 直接赋值，避免多级列问题
    daily = daily.rename(columns={
        TIMESTAMP_COL: 'claimCount',
        'SHIT Sent': 'claimAmount',
        'SOL Received': 'solReceived'
    })
    
    return daily[['date', 'claimCount', 'claimAmount', 'solReceived']].astype({
        'claimCount': 'int',
        'claimAmount': 'float',
        'solReceived': 'float'
    }).to_dict('records')


def _calculate_top_users(
    df: pd.DataFrame,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """计算用户排行"""
    
    if len(df) == 0:
        return []
    
    # 按地址聚合
    user_stats = df.groupby('Receiver Address', as_index=False).agg({
        'SHIT Sent': ['sum', 'count']
    })
    
    # 扁平化多级列名
    user_stats.columns = ['fullAddress', 'claimAmount', 'claimCount']
    
    # 排序并取前 N
    user_stats = user_stats.sort_values('claimAmount', ascending=False).head(top_n)
    
    # 添加缩写地址
    user_stats['address'] = user_stats['fullAddress'].apply(
        lambda addr: f"{addr[:4]}...{addr[-4:]}"
    )
    
    # 转换为字典列表，只保留需要的列
    return user_stats[['address', 'fullAddress', 'claimCount', 'claimAmount']].astype({
        'claimCount': 'int',
        'claimAmount': 'float'
    }).to_dict('records')
