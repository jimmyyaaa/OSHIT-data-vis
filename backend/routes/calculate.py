"""
数据计算路由
提供各个数据模块的计算 API
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List, Optional
import pandas as pd
import logging
import traceback

# 配置logging
logger = logging.getLogger(__name__)

# 导入所有 Pydantic 模型
from .schemas import (
    DateRangeRequest,
    StakingMetrics, DailyDataEntry, TopStaker, StakingCalculateResponse,
    TSMetrics, DailyTSDataEntry, HeatmapData, TopTSUser, RepeatRankingEntry, TSCalculateResponse,
    POSMetrics, DailyPOSDataEntry, TopPOSUser, DuplicateAddressEntry, POSCalculateResponse,
    ShitCodeMetrics, DailyShitCodeDataEntry, TopShitCodeUser, ShitCodeCalculateResponse,
    RevenueMetrics, DailyRevenueDataEntry, RevenueCompositionEntry, RevenueCalculateResponse,
    DeFiMetrics, DailyDeFiDataEntry, DeFiCalculateResponse
)

# 创建路由
router = APIRouter(prefix="/calculate", tags=["calculate"])

@router.post("/staking", response_model=StakingCalculateResponse)
async def calculate_staking(request: DateRangeRequest):
    """
    计算 Staking 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        StakingCalculateResponse: 包含指标、日数据和大户排行
    """
    try:
        from data_cache import data_cache
        from calculators.staking import calculate_staking as staking_calc
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取数据
        df_staking_amount = data_cache.data.get('Staking_Amount_Log')
        df_staking_log = data_cache.data.get('Staking_Log')
        
        if df_staking_amount is None or df_staking_log is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缺少 Staking_Amount_Log 或 Staking_Log"
            )
        
        # 日期范围计算（UTC+8 00:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 分割数据
        df_amount_current = df_staking_amount[(df_staking_amount[timestamp_col] >= current_start) & (df_staking_amount[timestamp_col] < current_end)].copy()
        df_amount_prev = df_staking_amount[(df_staking_amount[timestamp_col] >= prev_start) & (df_staking_amount[timestamp_col] < current_start)].copy()
        df_log_current = df_staking_log[(df_staking_log[timestamp_col] >= current_start) & (df_staking_log[timestamp_col] < current_end)].copy()
        df_log_prev = df_staking_log[(df_staking_log[timestamp_col] >= prev_start) & (df_staking_log[timestamp_col] < current_start)].copy()
        
        # 调用纯函数
        result = staking_calc(df_amount_current, df_log_current, df_amount_prev, df_log_prev)
        
        return StakingCalculateResponse(
            metrics=StakingMetrics(**result['metrics']),
            dailyData=[DailyDataEntry(**item) for item in result['dailyData']],
            topStakers=[TopStaker(**item) for item in result['topStakers']]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# TS Routes
# ============================================

@router.post("/ts", response_model=TSCalculateResponse)
async def calculate_ts(request: DateRangeRequest):
    """
    计算 TS 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        TSCalculateResponse: 包含指标、日数据、热力图、用户排行和重复领取排行
    """
    try:
        from data_cache import data_cache
        from calculators.ts import calculate_ts as ts_calc
        from utils.db_loader import load_ts_log_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取其他辅助数据
        df_ts_discord = data_cache.data.get('TS_Discord')
        df_shit_price = data_cache.data.get('SHIT_Price_Log')
        
        # 日期范围计算（UTC+8 08:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=8, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 从数据库按需加载 TS_Log 数据 (涵盖当前和前一周期)
        logger.info(f"正在从数据库加载 TS_Log: {prev_start} 到 {current_end}")
        df_ts_log_all = load_ts_log_from_db(prev_start, current_end)
        
        if df_ts_log_all.empty:
            logger.warning("未找到 TS_Log 数据")
            df_log_current = pd.DataFrame()
            df_log_prev = pd.DataFrame()
        else:
            # 分割TS_Log数据
            df_log_current = df_ts_log_all[(df_ts_log_all[timestamp_col] >= current_start) & (df_ts_log_all[timestamp_col] < current_end)].copy()
            df_log_prev = df_ts_log_all[(df_ts_log_all[timestamp_col] >= prev_start) & (df_ts_log_all[timestamp_col] < current_start)].copy()
        
        # 分割TS_Discord数据（如果存在）
        df_discord_current = pd.DataFrame()
        df_discord_prev = pd.DataFrame()
        if df_ts_discord is not None and len(df_ts_discord) > 0:
            df_discord_current = df_ts_discord[(df_ts_discord[timestamp_col] >= current_start) & (df_ts_discord[timestamp_col] < current_end)].copy()
            df_discord_prev = df_ts_discord[(df_ts_discord[timestamp_col] >= prev_start) & (df_ts_discord[timestamp_col] < current_start)].copy()
        
        # 分割SHIT_Price_Log数据（使用自然日边界）
        price_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        price_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        prev_price_start = (pd.to_datetime(request.start_date) - pd.Timedelta(days=period_length)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_price_end = price_start
        
        df_price_current = pd.DataFrame()
        df_price_prev = pd.DataFrame()
        if df_shit_price is not None and len(df_shit_price) > 0:
            df_price_current = df_shit_price[(df_shit_price[timestamp_col] >= price_start) & (df_shit_price[timestamp_col] < price_end)].copy()
            df_price_prev = df_shit_price[(df_shit_price[timestamp_col] >= prev_price_start) & (df_shit_price[timestamp_col] < prev_price_end)].copy()
        
        # 调用纯函数
        result = ts_calc(df_log_current, df_log_prev, df_discord_current, df_discord_prev, df_price_current, df_price_prev)
        
        return TSCalculateResponse(
            metrics=TSMetrics(**result['metrics']),
            dailyData=[DailyTSDataEntry(**item) for item in result['dailyData']],
            heatmapData=HeatmapData(dates=[], hours=[], data=[]),  # TODO: 需要从结果中提取或生成热力图
            topUsers=[TopTSUser(**item) for item in result['topUsers']],
            repeatRanking=[]  # TODO: 需要从结果中提取或生成
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TS Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# POS Routes
# ============================================

@router.post("/pos", response_model=POSCalculateResponse)
async def calculate_pos(request: DateRangeRequest):
    """
    计算 POS 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        POSCalculateResponse: 包含指标、日数据、巨鲸排行
    """
    try:
        # 从 data_cache 获取数据
        from data_cache import data_cache
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取 POS_Log 数据
        df_pos = data_cache.data.get('POS_Log')
        if df_pos is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缺少 POS_Log 数据表"
            )
        
        # 获取日期范围（POS 使用 12pm 作为日期边界）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 按日期范围分割数据
        # current_range: [current_start, current_end) (左闭右开)
        # prev_range: [prev_start, current_start) (左闭右开)
        df_current = df_pos[(df_pos[timestamp_col] >= current_start) & (df_pos[timestamp_col] < current_end)].copy()
        df_prev = df_pos[(df_pos[timestamp_col] >= prev_start) & (df_pos[timestamp_col] < current_start)].copy()
        
        # 直接调用计算函数（不创建 class 实例）
        from calculators.pos import calculate_pos
        result = calculate_pos(df_current, df_prev)
        
        return POSCalculateResponse(
            metrics=POSMetrics(**result['metrics']),
            dailyData=[DailyPOSDataEntry(**item) for item in result['dailyData']],
            topUsers=[TopPOSUser(**item) for item in result['topUsers']],
            duplicateAddresses=[]  # POS 不需要重复交易地址
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[POS Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# ShitCode Routes
# ============================================

@router.post("/shitcode", response_model=ShitCodeCalculateResponse)
async def calculate_shitcode(request: DateRangeRequest):
    """
    计算 ShitCode 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        ShitCodeCalculateResponse: 包含指标、日数据和用户排行
    """
    try:
        from data_cache import data_cache
        from calculators.shitcode import calculate_shitcode as shitcode_calc
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取数据
        df_shitcode = data_cache.data.get('ShitCode_Log')
        
        if df_shitcode is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缺少 ShitCode_Log"
            )
        
        # 日期范围计算（UTC+8 00:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 分割数据
        df_current = df_shitcode[(df_shitcode[timestamp_col] >= current_start) & (df_shitcode[timestamp_col] < current_end)].copy()
        df_prev = df_shitcode[(df_shitcode[timestamp_col] >= prev_start) & (df_shitcode[timestamp_col] < current_start)].copy()
        
        # 调用纯函数
        result = shitcode_calc(df_current, df_prev)
        
        return ShitCodeCalculateResponse(
            metrics=ShitCodeMetrics(**result['metrics']),
            dailyData=[DailyShitCodeDataEntry(**item) for item in result['dailyData']],
            topUsers=[TopShitCodeUser(**item) for item in result['topUsers']]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ShitCode Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# Revenue Routes
# ============================================

@router.post("/revenue", response_model=RevenueCalculateResponse)
async def calculate_revenue(request: DateRangeRequest):
    """
    计算 Revenue 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        RevenueCalculateResponse: 包含指标、日数据和来源构成
    """
    try:
        from data_cache import data_cache
        from calculators.revenue import calculate_revenue as revenue_calc
        from utils.db_loader import load_ts_log_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取其他数据源
        df_pos = data_cache.data.get('POS_Log')
        df_staking = data_cache.data.get('Staking_Log')
        df_shitcode = data_cache.data.get('ShitCode_Log')
        
        if df_pos is None or df_staking is None or df_shitcode is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缺少必要的数据源 (POS, Staking 或 ShitCode)"
            )
        
        timestamp_col = 'Timestamp(UTC+8)'
        
        # 计算时间范围
        ts_period = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        
        # TS（8am边界）
        ts_start = pd.to_datetime(request.start_date).replace(hour=8, minute=0, second=0, microsecond=0)
        ts_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        ts_prev_start = ts_start - pd.Timedelta(days=ts_period)
        
        # 从数据库加载 TS 数据
        df_ts_all = load_ts_log_from_db(ts_prev_start, ts_end)
        df_ts_current = df_ts_all[(df_ts_all[timestamp_col] >= ts_start) & (df_ts_all[timestamp_col] < ts_end)].copy()
        df_ts_prev = df_ts_all[(df_ts_all[timestamp_col] >= ts_prev_start) & (df_ts_all[timestamp_col] < ts_start)].copy()
        
        # POS（12pm边界）
        pos_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0, second=0, microsecond=0)
        pos_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        pos_prev_start = pos_start - pd.Timedelta(days=ts_period)
        
        df_pos_current = df_pos[(df_pos[timestamp_col] >= pos_start) & (df_pos[timestamp_col] < pos_end)].copy()
        df_pos_prev = df_pos[(df_pos[timestamp_col] >= pos_prev_start) & (df_pos[timestamp_col] < pos_start)].copy()
        
        # Staking（00:00边界）
        stake_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        stake_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        stake_prev_start = stake_start - pd.Timedelta(days=ts_period)
        
        df_staking_current = df_staking[(df_staking[timestamp_col] >= stake_start) & (df_staking[timestamp_col] < stake_end)].copy()
        df_staking_prev = df_staking[(df_staking[timestamp_col] >= stake_prev_start) & (df_staking[timestamp_col] < stake_start)].copy()
        
        # ShitCode（00:00边界）
        df_shitcode_current = df_shitcode[(df_shitcode[timestamp_col] >= stake_start) & (df_shitcode[timestamp_col] < stake_end)].copy()
        df_shitcode_prev = df_shitcode[(df_shitcode[timestamp_col] >= stake_prev_start) & (df_shitcode[timestamp_col] < stake_start)].copy()
        
        # 调用纯函数
        result = revenue_calc(
            df_ts_current, df_ts_prev,
            df_pos_current, df_pos_prev,
            df_staking_current, df_staking_prev,
            df_shitcode_current, df_shitcode_prev
        )
        
        return RevenueCalculateResponse(
            metrics=RevenueMetrics(**result['metrics']),
            dailyData=[DailyRevenueDataEntry(**item) for item in result['dailyData']],
            composition=[RevenueCompositionEntry(**item) for item in result['composition']]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Revenue Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================
# DeFi Routes
# ============================================

@router.post("/defi", response_model=DeFiCalculateResponse)
async def calculate_defi(request: DateRangeRequest):
    """
    计算 DeFi 数据
    
    Args:
        request: 包含 start_date 和 end_date 的请求
    
    Returns:
        DeFiCalculateResponse: 包含指标、日数据和小时级别的价格K线
    """
    try:
        from data_cache import data_cache
        from calculators.defi import calculate_defi as defi_calc
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取数据
        df_defi = data_cache.data.get('Liq_Pool_Activity')
        df_price = data_cache.data.get('SHIT_Price_Log')
        
        if df_defi is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缺少 Liq_Pool_Activity"
            )
        
        # 日期范围计算（UTC+8 00:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 分割数据
        df_current = df_defi[(df_defi[timestamp_col] >= current_start) & (df_defi[timestamp_col] < current_end)].copy()
        df_prev = df_defi[(df_defi[timestamp_col] >= prev_start) & (df_defi[timestamp_col] < current_start)].copy()
        
        # 分割价格数据（如果存在）
        df_price_current = None
        if df_price is not None and len(df_price) > 0:
            df_price_current = df_price[(df_price[timestamp_col] >= current_start) & (df_price[timestamp_col] < current_end)].copy()
        
        # 调用纯函数
        result = defi_calc(df_current, df_prev, df_price_current)
        
        return DeFiCalculateResponse(
            metrics=DeFiMetrics(**result['metrics']),
            dailyData=[DailyDeFiDataEntry(**item) for item in result['dailyData']],
            hourlyPrice=result.get('hourlyPrice', [])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DeFi Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
