"""
DeFi 数据计算模块
计算 DeFi 相关的指标和日数据
纯函数式实现 - 直接接收 df_current 和 df_prev
"""
from typing import Dict, Any, List, Optional
import pandas as pd


TIMESTAMP_COL = 'Timestamp(UTC+8)'


def calculate_defi(
    df_current: pd.DataFrame,
    df_prev: pd.DataFrame,
    df_price: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    计算 DeFi 数据（纯函数式）
    
    Args:
        df_current: 当前周期的 Liq_Pool_Activity
        df_prev: 前一周期的 Liq_Pool_Activity
        df_price: SHIT_Price_Log 数据（可选，用于K线图）
    
    Returns:
        包含 metrics, dailyData, 以及可选的 hourlyPrice 的字典
    """
    # 计算指标
    metrics = _compute_metrics(df_current, df_prev)
    
    # 计算日数据
    daily_data = _calculate_daily_data(df_current)
    
    # 计算小时级别的价格K线（仅当有价格数据时）
    hourly_price = _calculate_hourly_price(df_price) if df_price is not None and len(df_price) > 0 else []
    
    return {
        'metrics': metrics,
        'dailyData': daily_data,
        'hourlyPrice': hourly_price
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
    
    result = {
        # BUY
        'buyShitAmountCurrent': metrics_current['buyShitAmount'],
        'buyCountCurrent': metrics_current['buyCount'],
        'buyUsdtAmountCurrent': metrics_current['buyUsdtAmount'],
        'buyShitAmountPrev': metrics_prev['buyShitAmount'],
        'buyCountPrev': metrics_prev['buyCount'],
        'buyUsdtAmountPrev': metrics_prev['buyUsdtAmount'],
        'buyShitAmountDelta': calc_delta(metrics_current['buyShitAmount'], metrics_prev['buyShitAmount']),
        'buyCountDelta': calc_delta(metrics_current['buyCount'], metrics_prev['buyCount']),
        'buyUsdtAmountDelta': calc_delta(metrics_current['buyUsdtAmount'], metrics_prev['buyUsdtAmount']),
        
        # SELL
        'sellShitAmountCurrent': metrics_current['sellShitAmount'],
        'sellCountCurrent': metrics_current['sellCount'],
        'sellUsdtAmountCurrent': metrics_current['sellUsdtAmount'],
        'sellShitAmountPrev': metrics_prev['sellShitAmount'],
        'sellCountPrev': metrics_prev['sellCount'],
        'sellUsdtAmountPrev': metrics_prev['sellUsdtAmount'],
        'sellShitAmountDelta': calc_delta(metrics_current['sellShitAmount'], metrics_prev['sellShitAmount']),
        'sellCountDelta': calc_delta(metrics_current['sellCount'], metrics_prev['sellCount']),
        'sellUsdtAmountDelta': calc_delta(metrics_current['sellUsdtAmount'], metrics_prev['sellUsdtAmount']),
        
        # TS SELL
        'tsSellShitAmountCurrent': metrics_current['tsSellShitAmount'],
        'tsSellUsdtAmountCurrent': metrics_current['tsSellUsdtAmount'],
        'tsSellShitAmountPrev': metrics_prev['tsSellShitAmount'],
        'tsSellUsdtAmountPrev': metrics_prev['tsSellUsdtAmount'],
        'tsSellShitAmountDelta': calc_delta(metrics_current['tsSellShitAmount'], metrics_prev['tsSellShitAmount']),
        'tsSellUsdtAmountDelta': calc_delta(metrics_current['tsSellUsdtAmount'], metrics_prev['tsSellUsdtAmount']),
        
        # LIQ ADD
        'liqAddUsdtCurrent': metrics_current['liqAddUsdt'],
        'liqAddCountCurrent': metrics_current['liqAddCount'],
        'liqAddUsdtPrev': metrics_prev['liqAddUsdt'],
        'liqAddCountPrev': metrics_prev['liqAddCount'],
        'liqAddUsdtDelta': calc_delta(metrics_current['liqAddUsdt'], metrics_prev['liqAddUsdt']),
        'liqAddCountDelta': calc_delta(metrics_current['liqAddCount'], metrics_prev['liqAddCount']),
        
        # LIQ REMOVE
        'liqRemoveUsdtCurrent': metrics_current['liqRemoveUsdt'],
        'liqRemoveCountCurrent': metrics_current['liqRemoveCount'],
        'liqRemoveUsdtPrev': metrics_prev['liqRemoveUsdt'],
        'liqRemoveCountPrev': metrics_prev['liqRemoveCount'],
        'liqRemoveUsdtDelta': calc_delta(metrics_current['liqRemoveUsdt'], metrics_prev['liqRemoveUsdt']),
        'liqRemoveCountDelta': calc_delta(metrics_current['liqRemoveCount'], metrics_prev['liqRemoveCount']),
    }
    
    return result


def _compute_period_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """计算单个周期的指标"""
    
    if len(df) == 0:
        return {
            'buyShitAmount': 0.0,
            'buyCount': 0,
            'buyUsdtAmount': 0.0,
            'sellShitAmount': 0.0,
            'sellCount': 0,
            'sellUsdtAmount': 0.0,
            'tsSellShitAmount': 0.0,
            'tsSellUsdtAmount': 0.0,
            'liqAddUsdt': 0.0,
            'liqAddCount': 0,
            'liqRemoveUsdt': 0.0,
            'liqRemoveCount': 0,
        }
    
    # BUY 交易
    buy_df = df[df['Activity'] == 'BUY']
    buy_shit_amount = float((buy_df['SHIT Change'].abs()).sum()) if not buy_df.empty else 0.0
    buy_count = len(buy_df)
    buy_usdt_amount = float((buy_df['USDT Change'].abs()).sum()) if not buy_df.empty else 0.0
    
    # SELL 交易
    sell_df = df[df['Activity'] == 'SELL']
    sell_shit_amount = float((sell_df['SHIT Change'].abs()).sum()) if not sell_df.empty else 0.0
    sell_count = len(sell_df)
    sell_usdt_amount = float((sell_df['USDT Change'].abs()).sum()) if not sell_df.empty else 0.0
    
    # TS Sell (13k-20k 范围)
    ts_sell_df = sell_df[
        (sell_df['SHIT Change'].abs() >= 13000) & 
        (sell_df['SHIT Change'].abs() <= 20000)
    ]
    ts_sell_shit_amount = float((ts_sell_df['SHIT Change'].abs()).sum()) if not ts_sell_df.empty else 0.0
    ts_sell_usdt_amount = float((ts_sell_df['USDT Change'].abs()).sum()) if not ts_sell_df.empty else 0.0
    
    # Liquidity Add
    liq_add_df = df[df['Activity'] == 'LIQ_ADD']
    liq_add_usdt = float((liq_add_df['USDT Change'].abs()).sum()) if not liq_add_df.empty else 0.0
    liq_add_count = len(liq_add_df)
    
    # Liquidity Remove
    liq_remove_df = df[df['Activity'] == 'LIQ_REMOVE']
    liq_remove_usdt = float((liq_remove_df['USDT Change'].abs()).sum()) if not liq_remove_df.empty else 0.0
    liq_remove_count = len(liq_remove_df)
    
    return {
        'buyShitAmount': buy_shit_amount,
        'buyCount': buy_count,
        'buyUsdtAmount': buy_usdt_amount,
        'sellShitAmount': sell_shit_amount,
        'sellCount': sell_count,
        'sellUsdtAmount': sell_usdt_amount,
        'tsSellShitAmount': ts_sell_shit_amount,
        'tsSellUsdtAmount': ts_sell_usdt_amount,
        'liqAddUsdt': liq_add_usdt,
        'liqAddCount': liq_add_count,
        'liqRemoveUsdt': liq_remove_usdt,
        'liqRemoveCount': liq_remove_count,
    }


def _calculate_daily_data(
    df: pd.DataFrame
) -> List[Dict[str, Any]]:
    """计算日数据"""
    
    if len(df) == 0:
        return []
    
    # 复制并添加日期列
    data = df.copy()
    data['date'] = data[TIMESTAMP_COL].dt.strftime('%Y-%m-%d')
    
    # 按日期和活动类型聚合
    daily_activity = data.groupby(['date', 'Activity'])['USDT Change'].apply(
        lambda x: float(abs(x).sum())
    ).unstack(fill_value=0.0)
    
    # 确保所有列都存在
    for col in ['BUY', 'SELL', 'LIQ_ADD', 'LIQ_REMOVE']:
        if col not in daily_activity.columns:
            daily_activity[col] = 0.0
    
    # 重置索引并重命名列，避免硬编码顺序
    daily_activity = daily_activity.reset_index()
    daily_activity = daily_activity.rename(columns={
        'BUY': 'buyUsdt',
        'SELL': 'sellUsdt',
        'LIQ_ADD': 'liqAddUsdt',
        'LIQ_REMOVE': 'liqRemoveUsdt'
    })
    
    # 计算 TS Sell（13k-20k范围）- 纯向量化，无循环
    ts_sell_data = data[
        (data['Activity'] == 'SELL') &
        (data['SHIT Change'].abs() >= 13000) &
        (data['SHIT Change'].abs() <= 20000)
    ]
    ts_sell_by_date = ts_sell_data.groupby('date')['USDT Change'].apply(
        lambda x: float(abs(x).sum())
    )
    
    daily_activity['tsSellUsdt'] = daily_activity['date'].map(ts_sell_by_date).fillna(0.0)
    daily_activity['netFlow'] = daily_activity['buyUsdt'] - daily_activity['sellUsdt']
    
    return daily_activity[['date', 'buyUsdt', 'sellUsdt', 'netFlow', 'liqAddUsdt', 'liqRemoveUsdt', 'tsSellUsdt']].to_dict('records')


def _calculate_hourly_price(df_price: pd.DataFrame) -> List[Dict]:
    """
    Calculate hourly OHLC (Open, Close, Low, High) candlestick data from price log.
    
    Args:
        df_price: Price dataframe with columns [Timestamp(UTC+8), Price]
        
    Returns:
        List of dicts with format: [{'time': '2025-12-17 10:00', 'ohlc': [open, close, low, high]}, ...]
    """
    if df_price is None or df_price.empty:
        return []
    
    # Use the correct timestamp column name
    timestamp_col = 'Timestamp(UTC+8)'
    if timestamp_col not in df_price.columns:
        return []
    
    # Find the price column (usually 'Price')
    price_col = 'Price'
    if price_col not in df_price.columns:
        # Try to find any numeric column that's not the timestamp
        numeric_cols = df_price.select_dtypes(include=['number']).columns.tolist()
        if not numeric_cols:
            return []
        price_col = numeric_cols[0]
    
    # Ensure timestamp is datetime
    df_price = df_price.copy()
    df_price[timestamp_col] = pd.to_datetime(df_price[timestamp_col])
    
    # Group by hour and calculate OHLC
    hourly_data = []
    for hour_time, group in df_price.groupby(df_price[timestamp_col].dt.floor('H')):
        if group.empty:
            continue
            
        prices = group[price_col].astype(float)
        open_price = float(prices.iloc[0])
        close_price = float(prices.iloc[-1])
        low_price = float(prices.min())
        high_price = float(prices.max())
        
        hourly_data.append({
            'time': hour_time.strftime('%Y-%m-%d %H:%M'),
            'ohlc': [open_price, close_price, low_price, high_price]
        })
    
    return hourly_data
