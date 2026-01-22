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
    DateRangeRequest, SingleDateRequest,
    StakingMetrics, DailyDataEntry, TopStaker, StakingCalculateResponse,
    TSMetrics, DailyTSDataEntry, HeatmapData, TopTSUser, RepeatRankingEntry, TSCalculateResponse,
    POSMetrics, DailyPOSDataEntry, TopPOSUser, DuplicateAddressEntry, POSCalculateResponse,
    ShitCodeMetrics, DailyShitCodeDataEntry, TopShitCodeUser, ShitCodeCalculateResponse,
    RevenueMetrics, DailyRevenueDataEntry, RevenueCompositionEntry, RevenueCalculateResponse,
    DeFiMetrics, DailyDeFiDataEntry, DeFiCalculateResponse,
    AnomalyCalculateResponse, AnomalySummary, AnomalyDetail
)

# 创建路由
router = APIRouter(prefix="/calculate", tags=["calculate"])

@router.post("/staking", response_model=StakingCalculateResponse)
def calculate_staking(request: DateRangeRequest):
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
        from utils.db_loader import load_staking_amount_from_db, load_staking_reward_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 日期范围计算（UTC+8 12:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 从数据库加载数据
        df_staking_amount_all = load_staking_amount_from_db(prev_start, current_end)
        df_staking_log_all = load_staking_reward_from_db(prev_start, current_end)
        
        # 分割 Staking Amount 数据
        df_amount_current = df_staking_amount_all[(df_staking_amount_all[timestamp_col] >= current_start) & (df_staking_amount_all[timestamp_col] < current_end)].copy()
        df_amount_prev = df_staking_amount_all[(df_staking_amount_all[timestamp_col] >= prev_start) & (df_staking_amount_all[timestamp_col] < current_start)].copy()
        
        # 分割 Staking Reward (Log) 数据
        df_log_current = df_staking_log_all[(df_staking_log_all[timestamp_col] >= current_start) & (df_staking_log_all[timestamp_col] < current_end)].copy()
        df_log_prev = df_staking_log_all[(df_staking_log_all[timestamp_col] >= prev_start) & (df_staking_log_all[timestamp_col] < current_start)].copy()
        
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
def calculate_ts(request: DateRangeRequest):
    """
    计算 TS 数据 (SQL 直接聚合模式)
    """
    try:
        from data_cache import data_cache
        from calculators.ts import calculate_ts_sql
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 直接调用 SQL 计算逻辑
        result = calculate_ts_sql(request.start_date, request.end_date)
        
        return TSCalculateResponse(
            metrics=TSMetrics(**result['metrics']),
            dailyData=[DailyTSDataEntry(**item) for item in result['dailyData']],
            heatmapData=HeatmapData(dates=[], hours=[], data=[]), 
            topUsers=[TopTSUser(**item) for item in result['topUsers']],
            repeatRanking=[]  
        )
    
    except Exception as e:
        logger.error(f"[TS Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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
def calculate_pos(request: DateRangeRequest):
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
        from calculators.pos import calculate_pos
        from utils.db_loader import load_pos_log_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 获取日期范围（POS 使用 12pm 作为日期边界）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 从数据库加载数据
        df_pos_all = load_pos_log_from_db(prev_start, current_end)
        
        # 按日期范围分割数据
        df_current = df_pos_all[(df_pos_all[timestamp_col] >= current_start) & (df_pos_all[timestamp_col] < current_end)].copy()
        df_prev = df_pos_all[(df_pos_all[timestamp_col] >= prev_start) & (df_pos_all[timestamp_col] < current_start)].copy()
        
        # 调用纯函数
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
def calculate_shitcode(request: DateRangeRequest):
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
        from utils.db_loader import load_shitcode_log_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 日期范围计算（UTC+8 00:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start
        
        # 从数据库加载数据
        df_shitcode_all = load_shitcode_log_from_db(prev_start, current_end)
        
        # 分割数据
        df_current = df_shitcode_all[(df_shitcode_all[timestamp_col] >= current_start) & (df_shitcode_all[timestamp_col] < current_end)].copy()
        df_prev = df_shitcode_all[(df_shitcode_all[timestamp_col] >= prev_start) & (df_shitcode_all[timestamp_col] < current_start)].copy()
        
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
def calculate_revenue(request: DateRangeRequest):
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
        from utils.db_loader import (
            load_ts_log_from_db, 
            load_pos_log_from_db, 
            load_staking_reward_from_db, 
            load_shitcode_log_from_db
        )
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
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
        
        df_pos_all = load_pos_log_from_db(pos_prev_start, pos_end)
        df_pos_current = df_pos_all[(df_pos_all[timestamp_col] >= pos_start) & (df_pos_all[timestamp_col] < pos_end)].copy()
        df_pos_prev = df_pos_all[(df_pos_all[timestamp_col] >= pos_prev_start) & (df_pos_all[timestamp_col] < pos_start)].copy()
        
        # Staking（12:00pm边界）
        stake_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0, second=0, microsecond=0)
        stake_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        stake_prev_start = stake_start - pd.Timedelta(days=ts_period)
        
        df_staking_all = load_staking_reward_from_db(stake_prev_start, stake_end)
        df_staking_current = df_staking_all[(df_staking_all[timestamp_col] >= stake_start) & (df_staking_all[timestamp_col] < stake_end)].copy()
        df_staking_prev = df_staking_all[(df_staking_all[timestamp_col] >= stake_prev_start) & (df_staking_all[timestamp_col] < stake_start)].copy()
        
        # ShitCode（00:00边界）
        df_shitcode_all = load_shitcode_log_from_db(stake_prev_start, stake_end)
        df_shitcode_current = df_shitcode_all[(df_shitcode_all[timestamp_col] >= stake_start) & (df_shitcode_all[timestamp_col] < stake_end)].copy()
        df_shitcode_prev = df_shitcode_all[(df_shitcode_all[timestamp_col] >= stake_prev_start) & (df_shitcode_all[timestamp_col] < stake_start)].copy()
        
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
def calculate_defi(request: DateRangeRequest):
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
        from utils.db_loader import load_defi_from_db, load_price_history_from_db
        
        if not data_cache.is_cached:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="数据未缓存，请先调用 /loadData"
            )
        
        # 日期范围计算（UTC+8 00:00）
        timestamp_col = 'Timestamp(UTC+8)'
        current_start = pd.to_datetime(request.start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = (pd.to_datetime(request.end_date) + pd.Timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        period_length = (pd.to_datetime(request.end_date) - pd.to_datetime(request.start_date)).days + 1
        prev_start = current_start - pd.Timedelta(days=period_length)
        prev_end = current_start

        # 从数据库加载 DeFi 活动数据
        df_defi_all = load_defi_from_db(prev_start, current_end)
        
        # 从数据库按需加载价格数据
        df_price_all = load_price_history_from_db(current_start, current_end)
        
        # 分割数据
        df_current = df_defi_all[(df_defi_all[timestamp_col] >= current_start) & (df_defi_all[timestamp_col] < current_end)].copy()
        df_prev = df_defi_all[(df_defi_all[timestamp_col] >= prev_start) & (df_defi_all[timestamp_col] < current_start)].copy()
        
        # 分割价格数据（如果存在）
        df_price_current = None
        if not df_price_all.empty:
            df_price_current = df_price_all[(df_price_all[timestamp_col] >= current_start) & (df_price_all[timestamp_col] < current_end)].copy()
        
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


# ============================================
# Anomaly Detection Routes
# ============================================

@router.post("/anomalies", response_model=AnomalyCalculateResponse)
def calculate_anomalies(request: SingleDateRequest):
    """
    计算特定日期的异常行为检测
    
    Args:
        request: 包含 date (YYYY-MM-DD) 的请求
    
    Returns:
        AnomalyCalculateResponse: 汇总统计和异常明细
    """
    try:
        from calculators.anomaly import calculate_anomalies as anomaly_calc
        
        # 直接调用计算函数
        result = anomaly_calc(request.date)
        
        return AnomalyCalculateResponse(
            summary=AnomalySummary(**result['summary']),
            anomalies=[AnomalyDetail(**item) for item in result['anomalies']]
        )
    
    except Exception as e:
        logger.error(f"[Anomaly Error] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
