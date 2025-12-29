"""
Revenue 数据计算模块
汇总各个模块的 SOL 收入
纯函数式实现 - 直接接收各模块的 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd


TIMESTAMP_COL = 'Timestamp(UTC+8)'


def calculate_revenue(
    df_ts_current: pd.DataFrame,
    df_ts_prev: pd.DataFrame,
    df_pos_current: pd.DataFrame,
    df_pos_prev: pd.DataFrame,
    df_staking_current: pd.DataFrame,
    df_staking_prev: pd.DataFrame,
    df_shitcode_current: pd.DataFrame,
    df_shitcode_prev: pd.DataFrame
) -> Dict[str, Any]:
    """
    计算 Revenue 数据（纯函数式）
    
    Args:
        df_ts_current: 当前周期的 TS_Log
        df_ts_prev: 前一周期的 TS_Log
        df_pos_current: 当前周期的 POS_Log
        df_pos_prev: 前一周期的 POS_Log
        df_staking_current: 当前周期的 Staking_Log
        df_staking_prev: 前一周期的 Staking_Log
        df_shitcode_current: 当前周期的 ShitCode_Log
        df_shitcode_prev: 前一周期的 ShitCode_Log
    
    Returns:
        包含 metrics, dailyData, composition 的字典
    """
    # 计算指标
    metrics = _compute_metrics(
        df_ts_current, df_ts_prev,
        df_pos_current, df_pos_prev,
        df_staking_current, df_staking_prev,
        df_shitcode_current, df_shitcode_prev
    )
    
    # 计算日数据
    daily_data = _calculate_daily_data(
        df_ts_current, df_pos_current,
        df_staking_current, df_shitcode_current
    )
    
    # 计算收入构成
    composition = _calculate_composition(
        df_ts_current, df_pos_current,
        df_staking_current, df_shitcode_current
    )
    
    return {
        'metrics': metrics,
        'dailyData': daily_data,
        'composition': composition
    }


def _compute_metrics(
    df_ts_current: pd.DataFrame,
    df_ts_prev: pd.DataFrame,
    df_pos_current: pd.DataFrame,
    df_pos_prev: pd.DataFrame,
    df_staking_current: pd.DataFrame,
    df_staking_prev: pd.DataFrame,
    df_shitcode_current: pd.DataFrame,
    df_shitcode_prev: pd.DataFrame
) -> Dict[str, Any]:
    """计算当前周期和前一周期的指标及 Delta"""
    
    # 当前周期指标
    metrics_current = _compute_period_metrics(
        df_ts_current, df_pos_current,
        df_staking_current, df_shitcode_current
    )
    
    # 前一周期指标
    metrics_prev = _compute_period_metrics(
        df_ts_prev, df_pos_prev,
        df_staking_prev, df_shitcode_prev
    )
    
    # 计算 Delta（百分比）
    def calc_delta(current: float, prev: float) -> Optional[float]:
        if prev <= 0:
            return None
        return (current - prev) / prev * 100
    
    return {
        # Current
        'tsRevenueCurrent': metrics_current['tsRevenue'],
        'posRevenueCurrent': metrics_current['posRevenue'],
        'stakingRevenueCurrent': metrics_current['stakingRevenue'],
        'shitCodeRevenueCurrent': metrics_current['shitCodeRevenue'],
        'totalRevenueCurrent': metrics_current['totalRevenue'],
        
        # Previous
        'tsRevenuePrev': metrics_prev['tsRevenue'],
        'posRevenuePrev': metrics_prev['posRevenue'],
        'stakingRevenuePrev': metrics_prev['stakingRevenue'],
        'shitCodeRevenuePrev': metrics_prev['shitCodeRevenue'],
        'totalRevenuePrev': metrics_prev['totalRevenue'],
        
        # Delta
        'tsRevenueDelta': calc_delta(metrics_current['tsRevenue'], metrics_prev['tsRevenue']),
        'posRevenueDelta': calc_delta(metrics_current['posRevenue'], metrics_prev['posRevenue']),
        'stakingRevenueDelta': calc_delta(metrics_current['stakingRevenue'], metrics_prev['stakingRevenue']),
        'shitCodeRevenueDelta': calc_delta(metrics_current['shitCodeRevenue'], metrics_prev['shitCodeRevenue']),
        'totalRevenueDelta': calc_delta(metrics_current['totalRevenue'], metrics_prev['totalRevenue']),
    }


def _compute_period_metrics(
    df_ts: pd.DataFrame,
    df_pos: pd.DataFrame,
    df_staking: pd.DataFrame,
    df_shitcode: pd.DataFrame
) -> Dict[str, float]:
    """计算单个周期的指标"""
    
    # TS Revenue
    ts_revenue = float(df_ts['SOL_Received'].sum()) if len(df_ts) > 0 and 'SOL_Received' in df_ts.columns else 0.0
    
    # POS Revenue
    pos_revenue = float(df_pos['SOL Received'].sum()) if len(df_pos) > 0 and 'SOL Received' in df_pos.columns else 0.0
    
    # Staking Revenue
    staking_revenue = float(df_staking['SOL Received'].sum()) if len(df_staking) > 0 and 'SOL Received' in df_staking.columns else 0.0
    
    # ShitCode Revenue
    shitcode_revenue = float(df_shitcode['SOL Received'].sum()) if len(df_shitcode) > 0 and 'SOL Received' in df_shitcode.columns else 0.0
    
    total_revenue = ts_revenue + pos_revenue + staking_revenue + shitcode_revenue
    
    return {
        'tsRevenue': ts_revenue,
        'posRevenue': pos_revenue,
        'stakingRevenue': staking_revenue,
        'shitCodeRevenue': shitcode_revenue,
        'totalRevenue': total_revenue,
    }


def _calculate_daily_data(
    df_ts: pd.DataFrame,
    df_pos: pd.DataFrame,
    df_staking: pd.DataFrame,
    df_shitcode: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算日数据"""
    
    def apply_boundary(df: pd.DataFrame, boundary_hour: int) -> pd.DataFrame:
        """应用时间边界"""
        result = df.copy()
        result['date'] = result[TIMESTAMP_COL].apply(
            lambda ts: (ts - pd.Timedelta(days=1)).strftime('%Y-%m-%d') 
            if ts.hour < boundary_hour else ts.strftime('%Y-%m-%d')
        )
        return result
    
    # 应用各自的边界，聚合收入
    ts_daily = apply_boundary(df_ts, 8).groupby('date')['SOL_Received'].sum() if len(df_ts) > 0 else pd.Series()
    pos_daily = apply_boundary(df_pos, 12).groupby('date')['SOL Received'].sum() if len(df_pos) > 0 else pd.Series()
    staking_daily = df_staking.copy()
    staking_daily['date'] = staking_daily[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    staking_daily = staking_daily.groupby('date')['SOL Received'].sum() if len(df_staking) > 0 else pd.Series()
    
    shitcode_daily = df_shitcode.copy()
    shitcode_daily['date'] = shitcode_daily[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    shitcode_daily = shitcode_daily.groupby('date')['SOL Received'].sum() if len(df_shitcode) > 0 else pd.Series()
    
    # 合并所有日期
    all_dates = sorted(set(ts_daily.index) | set(pos_daily.index) | set(staking_daily.index) | set(shitcode_daily.index))
    
    result = [
        {
            'date': date,
            'tsRevenue': float(ts_daily.get(date, 0)),
            'posRevenue': float(pos_daily.get(date, 0)),
            'stakingRevenue': float(staking_daily.get(date, 0)),
            'shitCodeRevenue': float(shitcode_daily.get(date, 0)),
            'totalRevenue': float(
                ts_daily.get(date, 0) + pos_daily.get(date, 0) + 
                staking_daily.get(date, 0) + shitcode_daily.get(date, 0)
            )
        }
        for date in all_dates
    ]
    
    return result


def _calculate_composition(
    df_ts: pd.DataFrame,
    df_pos: pd.DataFrame,
    df_staking: pd.DataFrame,
    df_shitcode: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算收入来源构成"""
    
    metrics = _compute_period_metrics(df_ts, df_pos, df_staking, df_shitcode)
    
    # 构建构成数据
    composition_data = [
        ('TS', metrics['tsRevenue']),
        ('POS', metrics['posRevenue']),
        ('Staking', metrics['stakingRevenue']),
        ('ShitCode', metrics['shitCodeRevenue'])
    ]
    
    # 过滤非零项并排序
    result = [
        {'source': source, 'amount': amount}
        for source, amount in composition_data
        if amount > 0
    ]
    result.sort(key=lambda x: x['amount'], reverse=True)
    
    return result
