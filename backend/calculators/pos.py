"""
POS 数据计算模块
计算 POS 分红相关的指标、日数据、巨鲸排行
纯函数式实现 - 直接接收 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd


TIMESTAMP_COL = 'Timestamp(UTC+8)'


def calculate_pos(
    df_current: pd.DataFrame,
    df_prev: pd.DataFrame
) -> Dict[str, Any]:
    """
    计算 POS 数据（纯函数式）
    
    Args:
        df_current: 当前周期的 DataFrame
        df_prev: 前一周期的 DataFrame
    
    Returns:
        包含 metrics, dailyData, topUsers 的字典
    """
    # 计算指标
    metrics = _compute_metrics(df_current, df_prev)
    
    # 计算日数据
    daily_data = _calculate_daily_data(df_current)
    
    # 计算巨鲸排行
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
    """计算 POS 指标及 Delta"""
    
    # 当前周期指标
    metrics_current = _compute_period_metrics(df_current)
    # 前一周期指标
    metrics_prev = _compute_period_metrics(df_prev)
    
    # 计算 Delta
    def calc_delta(current: float, prev: float) -> Optional[float]:
        if prev <= 0:
            return None
        return (current - prev) / prev * 100
    
    result = {
        # Current
        **{k + 'Current': v for k, v in metrics_current.items()},
        # Previous
        **{k + 'Prev': v for k, v in metrics_prev.items()},
    }
    
    # Add Delta
    for key in metrics_current.keys():
        current_val = metrics_current[key]
        prev_val = metrics_prev[key]
        result[key + 'Delta'] = calc_delta(current_val, prev_val)
    
    return result


def _compute_period_metrics(df_pos: pd.DataFrame) -> Dict[str, float]:
    """计算单个周期的所有指标"""
    
    total_tx = len(df_pos)
    
    # 处理空 DataFrame
    if total_tx == 0:
        return {
            'totalTx': 0.0,
            'totalAmount': 0.0,
            'maxAmount': 0.0,
            'minAmount': 0.0,
            'totalRevenue': 0.0,
            'avgReward': 0.0,
        }
    
    # SHIT 相关指标
    amounts = df_pos['SHIT Sent'].dropna()
    total_amount = float(amounts.sum())
    max_amount = float(amounts.max()) if len(amounts) > 0 else 0.0
    min_amount = float(amounts.min()) if len(amounts) > 0 else 0.0
    
    # 收入相关指标
    total_revenue = float(df_pos['SOL Received'].sum())
    avg_reward = total_amount / total_tx if total_tx > 0 else 0.0
    
    return {
        'totalTx': float(total_tx),
        'totalAmount': total_amount,
        'maxAmount': max_amount,
        'minAmount': min_amount,
        'totalRevenue': total_revenue,
        'avgReward': avg_reward,
    }


def _calculate_daily_data(df_pos: pd.DataFrame) -> List[Dict[str, Any]]:
    """计算日数据（使用 12pm 边界）"""
    
    if len(df_pos) == 0:
        return []
    
    # 复制并添加日期列
    df = df_pos.copy()
    df['date'] = df[TIMESTAMP_COL].apply(
        lambda ts: (ts - pd.Timedelta(days=1)).strftime('%Y-%m-%d') if ts.hour < 12 else ts.strftime('%Y-%m-%d')
    )
    
    # 按日期聚合
    daily = df.groupby('date').agg({
        'SHIT Sent': 'sum',
        'SOL Received': 'sum'
    }).reset_index()
    
    daily.columns = ['date', 'shitSent', 'solReceived']
    
    return daily.astype({
        'shitSent': 'float',
        'solReceived': 'float'
    }).to_dict('records')


def _calculate_top_users(df_pos: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    """计算巨鲸排行"""
    
    if len(df_pos) == 0:
        return []
    
    # 按地址聚合 - 分别处理每个聚合
    user_shit = df_pos.groupby('Receiver Address')['SHIT Sent'].sum()
    user_tx = df_pos.groupby('Receiver Address').size()
    
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
