"""
Staking 数据计算模块
计算质押相关的指标、日数据和大户排行
纯函数式实现 - 直接接收 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd


TIMESTAMP_COL = 'Timestamp(UTC+8)'


def calculate_staking(
    df_amount_current: pd.DataFrame,
    df_log_current: pd.DataFrame,
    df_amount_prev: pd.DataFrame,
    df_log_prev: pd.DataFrame
) -> Dict[str, Any]:
    """
    计算 Staking 数据（纯函数式）
    
    Args:
        df_amount_current: 当前周期的 Staking_Amount_Log
        df_log_current: 当前周期的 Staking_Log
        df_amount_prev: 前一周期的 Staking_Amount_Log
        df_log_prev: 前一周期的 Staking_Log
    
    Returns:
        包含 metrics, dailyData, topStakers 的字典
    """
    # 计算指标
    metrics = _compute_metrics(
        df_amount_current, df_log_current,
        df_amount_prev, df_log_prev
    )
    
    # 计算日数据
    daily_data = _calculate_daily_data(df_amount_current, df_log_current)
    
    # 计算大户排行
    top_stakers = _calculate_top_stakers(df_amount_current)
    
    return {
        'metrics': metrics,
        'dailyData': daily_data,
        'topStakers': top_stakers
    }


def _compute_metrics(
    df_amount_current: pd.DataFrame,
    df_log_current: pd.DataFrame,
    df_amount_prev: pd.DataFrame,
    df_log_prev: pd.DataFrame
) -> Dict[str, Any]:
    """计算当前周期和前一周期的指标及 Delta"""
    
    # 当前周期指标
    total_stake_current = float(
        df_amount_current[df_amount_current['Type'] == 'STAKE']['SHIT Amount'].sum()
    )
    total_unstake_current = float(
        df_amount_current[df_amount_current['Type'] == 'UNSTAKE']['SHIT Amount'].sum()
    )
    net_stake_current = total_stake_current - total_unstake_current
    stake_count_current = int(
        len(df_amount_current[df_amount_current['Type'] == 'STAKE'])
    )
    reward_count_current = int(len(df_log_current))
    reward_amount_current = float(df_log_current['SHIT Sent'].sum())
    
    # 前一周期指标
    total_stake_prev = float(
        df_amount_prev[df_amount_prev['Type'] == 'STAKE']['SHIT Amount'].sum()
    )
    total_unstake_prev = float(
        df_amount_prev[df_amount_prev['Type'] == 'UNSTAKE']['SHIT Amount'].sum()
    )
    net_stake_prev = total_stake_prev - total_unstake_prev
    stake_count_prev = int(
        len(df_amount_prev[df_amount_prev['Type'] == 'STAKE'])
    )
    reward_count_prev = int(len(df_log_prev))
    reward_amount_prev = float(df_log_prev['SHIT Sent'].sum())
    
    # 计算 Delta（百分比）
    def calc_delta(current: float, prev: float) -> Optional[float]:
        if prev <= 0:
            return None
        return (current - prev) / prev * 100
    
    return {
        # Current
        'totalStakeCurrent': total_stake_current,
        'totalUnstakeCurrent': total_unstake_current,
        'netStakeCurrent': net_stake_current,
        'stakeCountCurrent': stake_count_current,
        'rewardCountCurrent': reward_count_current,
        'rewardAmountCurrent': reward_amount_current,
        
        # Previous
        'totalStakePrev': total_stake_prev,
        'totalUnstakePrev': total_unstake_prev,
        'netStakePrev': net_stake_prev,
        'stakeCountPrev': stake_count_prev,
        'rewardCountPrev': reward_count_prev,
        'rewardAmountPrev': reward_amount_prev,
        
        # Delta
        'totalStakeDelta': calc_delta(total_stake_current, total_stake_prev),
        'totalUnstakeDelta': calc_delta(total_unstake_current, total_unstake_prev),
        'netStakeDelta': calc_delta(net_stake_current, net_stake_prev),
        'stakeCountDelta': calc_delta(stake_count_current, stake_count_prev),
        'rewardCountDelta': calc_delta(reward_count_current, reward_count_prev),
        'rewardAmountDelta': calc_delta(reward_amount_current, reward_amount_prev),
    }


def _calculate_daily_data(
    df_amount: pd.DataFrame,
    df_log: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算日数据"""
    
    # 聚合 STAKE 数据
    stake_daily = df_amount[df_amount['Type'] == 'STAKE'].copy()
    stake_daily['date'] = stake_daily[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    stake_agg = stake_daily.groupby('date')['SHIT Amount'].sum()
    
    # 聚合奖励数据
    reward_daily = df_log.copy()
    reward_daily['date'] = reward_daily[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    reward_agg = reward_daily.groupby('date')['SHIT Sent'].sum()
    
    # 合并日期并构建结果
    all_dates = sorted(set(stake_agg.index) | set(reward_agg.index))
    result = [
        {
            'date': date,
            'stake': float(stake_agg.get(date, 0)),
            'rewards': float(reward_agg.get(date, 0))
        }
        for date in all_dates
    ]
    
    return result


def _calculate_top_stakers(
    df_amount: pd.DataFrame,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """计算质押大户排行"""
    
    if len(df_amount) == 0:
        return []
    
    # 筛选 STAKE 记录并聚合
    stake_data = df_amount[df_amount['Type'] == 'STAKE']
    staker_stats = stake_data.groupby('Address', as_index=False).agg({
        'SHIT Amount': 'sum'
    }).sort_values('SHIT Amount', ascending=False).head(top_n)
    
    # 添加缩写地址
    staker_stats['address'] = staker_stats['Address'].apply(
        lambda addr: f"{addr[:4]}...{addr[-4:]}"
    )
    staker_stats = staker_stats.rename(columns={'Address': 'fullAddress', 'SHIT Amount': 'amount'})
    
    return staker_stats[['address', 'fullAddress', 'amount']].astype({
        'amount': 'float'
    }).to_dict('records')
