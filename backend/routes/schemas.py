"""
数据计算 API 的 Pydantic 模型/Schema 定义
"""
from pydantic import BaseModel
from typing import Dict, Any, List, Optional


# ============================================
# 通用模型
# ============================================

class DateRangeRequest(BaseModel):
    """日期范围请求"""
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


class SingleDateRequest(BaseModel):
    """单日期请求"""
    date: str  # YYYY-MM-DD


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """登录响应"""
    access_token: str
    token_type: str
    username: str
    role: str


# ============================================
# Staking Models
# ============================================

class StakingMetrics(BaseModel):
    """Staking 指标"""
    # Current Period (6)
    totalStakeCurrent: float
    totalUnstakeCurrent: float
    netStakeCurrent: float
    stakeCountCurrent: int
    rewardCountCurrent: int
    rewardAmountCurrent: float
    
    # Previous Period (6)
    totalStakePrev: Optional[float] = None
    totalUnstakePrev: Optional[float] = None
    netStakePrev: Optional[float] = None
    stakeCountPrev: Optional[int] = None
    rewardCountPrev: Optional[int] = None
    rewardAmountPrev: Optional[float] = None
    
    # Delta Percentage (6) - None means "NA" for frontend
    totalStakeDelta: Optional[float] = None
    totalUnstakeDelta: Optional[float] = None
    netStakeDelta: Optional[float] = None
    stakeCountDelta: Optional[float] = None
    rewardCountDelta: Optional[float] = None
    rewardAmountDelta: Optional[float] = None


class DailyDataEntry(BaseModel):
    """日数据条目"""
    date: str
    stake: float
    rewards: float


class TopStaker(BaseModel):
    """质押大户"""
    address: str
    fullAddress: str
    amount: float


class StakingCalculateResponse(BaseModel):
    """Staking 计算响应"""
    metrics: StakingMetrics
    dailyData: List[DailyDataEntry]
    topStakers: List[TopStaker]


# ============================================
# TS Models
# ============================================

class TSMetrics(BaseModel):
    """TS 指标"""
    # Current (19)
    totalTxCurrent: int
    tsClaimCurrent: int
    totalAmountCurrent: float
    uniqueAddressesCurrent: int
    meanClaimsCurrent: float
    medianClaimsCurrent: float
    avgIntervalCurrent: float
    wolfTxCurrent: int
    oneRefTxCurrent: int
    twoRefTxCurrent: int
    luckyDrawsCurrent: int
    luckyDrawAmountCurrent: float
    luckyDrawAddressesCurrent: int
    revenueCurrent: float
    shitCostCurrent: float
    roiCurrent: float
    
    # Previous (16)
    totalTxPrev: Optional[int] = None
    tsClaimPrev: Optional[int] = None
    totalAmountPrev: Optional[float] = None
    uniqueAddressesPrev: Optional[int] = None
    meanClaimsPrev: Optional[float] = None
    medianClaimsPrev: Optional[float] = None
    avgIntervalPrev: Optional[float] = None
    wolfTxPrev: Optional[int] = None
    oneRefTxPrev: Optional[int] = None
    twoRefTxPrev: Optional[int] = None
    luckyDrawsPrev: Optional[int] = None
    luckyDrawAmountPrev: Optional[float] = None
    luckyDrawAddressesPrev: Optional[int] = None
    revenuePrev: Optional[float] = None
    shitCostPrev: Optional[float] = None
    roiPrev: Optional[float] = None
    
    # Delta (16) - None means "NA"
    totalTxDelta: Optional[float] = None
    tsClaimDelta: Optional[float] = None
    totalAmountDelta: Optional[float] = None
    uniqueAddressesDelta: Optional[float] = None
    meanClaimsDelta: Optional[float] = None
    medianClaimsDelta: Optional[float] = None
    avgIntervalDelta: Optional[float] = None
    wolfTxDelta: Optional[float] = None
    oneRefTxDelta: Optional[float] = None
    twoRefTxDelta: Optional[float] = None
    luckyDrawsDelta: Optional[float] = None
    luckyDrawAmountDelta: Optional[float] = None
    luckyDrawAddressesDelta: Optional[float] = None
    revenueDelta: Optional[float] = None
    shitCostDelta: Optional[float] = None
    roiDelta: Optional[float] = None


class DailyTSDataEntry(BaseModel):
    """TS 日数据条目"""
    date: str
    txCount: int
    shitSent: float
    solReceived: float


class HeatmapData(BaseModel):
    """热力图数据"""
    dates: List[str]
    hours: List[int]
    data: List[List[int]]


class TopTSUser(BaseModel):
    """TS 活跃用户"""
    address: str
    fullAddress: str
    txCount: int
    shitSent: float


class RepeatRankingEntry(BaseModel):
    """重复领取排行条目"""
    address: str
    count: int


class TSCalculateResponse(BaseModel):
    """TS 计算响应"""
    metrics: TSMetrics
    dailyData: List[DailyTSDataEntry]
    heatmapData: HeatmapData
    topUsers: List[TopTSUser]
    repeatRanking: List[RepeatRankingEntry]


# ============================================
# POS Models
# ============================================

class POSMetrics(BaseModel):
    """POS 指标"""
    # Current (7)
    totalTxCurrent: int
    totalAmountCurrent: float
    maxAmountCurrent: float
    minAmountCurrent: float
    totalRevenueCurrent: float
    emissionEfficiencyCurrent: float
    avgRewardCurrent: float
    
    # Previous (7)
    totalTxPrev: Optional[int] = None
    totalAmountPrev: Optional[float] = None
    maxAmountPrev: Optional[float] = None
    minAmountPrev: Optional[float] = None
    totalRevenuePrev: Optional[float] = None
    emissionEfficiencyPrev: Optional[float] = None
    avgRewardPrev: Optional[float] = None
    
    # Delta (7) - None means "NA"
    totalTxDelta: Optional[float] = None
    totalAmountDelta: Optional[float] = None
    maxAmountDelta: Optional[float] = None
    minAmountDelta: Optional[float] = None
    totalRevenueDelta: Optional[float] = None
    emissionEfficiencyDelta: Optional[float] = None
    avgRewardDelta: Optional[float] = None


class DailyPOSDataEntry(BaseModel):
    """POS 日数据条目"""
    date: str
    shitSent: float
    solReceived: float


class TopPOSUser(BaseModel):
    """POS 巨鲸用户"""
    address: str
    fullAddress: str
    shitSent: float
    txCount: int


class DuplicateAddressEntry(BaseModel):
    """重复交易地址条目"""
    address: str
    date: str
    txCount: int


class POSCalculateResponse(BaseModel):
    """POS 计算响应"""
    metrics: POSMetrics
    dailyData: List[DailyPOSDataEntry]
    topUsers: List[TopPOSUser]
    duplicateAddresses: List[DuplicateAddressEntry]


# ============================================
# ShitCode Models
# ============================================

class ShitCodeMetrics(BaseModel):
    """ShitCode 指标"""
    # Current (4)
    claimCountCurrent: int
    claimAmountCurrent: float
    uniqueAddressesCurrent: int
    avgClaimPerAddressCurrent: Optional[float]
    
    # Previous (4)
    claimCountPrev: Optional[int] = None
    claimAmountPrev: Optional[float] = None
    uniqueAddressesPrev: Optional[int] = None
    avgClaimPerAddressPrev: Optional[float] = None
    
    # Delta (4)
    claimCountDelta: Optional[float] = None
    claimAmountDelta: Optional[float] = None
    uniqueAddressesDelta: Optional[float] = None
    avgClaimPerAddressDelta: Optional[float] = None


class DailyShitCodeDataEntry(BaseModel):
    """ShitCode 日数据"""
    date: str
    claimCount: int
    claimAmount: float
    solReceived: float


class TopShitCodeUser(BaseModel):
    """Top ShitCode 用户"""
    address: str
    fullAddress: str
    claimCount: int
    claimAmount: float


class ShitCodeCalculateResponse(BaseModel):
    """ShitCode 计算响应"""
    metrics: ShitCodeMetrics
    dailyData: List[DailyShitCodeDataEntry]
    topUsers: List[TopShitCodeUser]


# ============================================
# Revenue Models
# ============================================

class RevenueMetrics(BaseModel):
    """Revenue 指标"""
    # Current (5)
    tsRevenueCurrent: float
    posRevenueCurrent: float
    stakingRevenueCurrent: float
    shitCodeRevenueCurrent: float
    totalRevenueCurrent: float
    
    # Previous (5)
    tsRevenuePrev: Optional[float] = None
    posRevenuePrev: Optional[float] = None
    stakingRevenuePrev: Optional[float] = None
    shitCodeRevenuePrev: Optional[float] = None
    totalRevenuePrev: Optional[float] = None
    
    # Delta (5)
    tsRevenueDelta: Optional[float] = None
    posRevenueDelta: Optional[float] = None
    stakingRevenueDelta: Optional[float] = None
    shitCodeRevenueDelta: Optional[float] = None
    totalRevenueDelta: Optional[float] = None


class DailyRevenueDataEntry(BaseModel):
    """Revenue 日数据"""
    date: str
    tsRevenue: float
    posRevenue: float
    stakingRevenue: float
    shitCodeRevenue: float
    totalRevenue: float


class RevenueCompositionEntry(BaseModel):
    """收入来源构成"""
    source: str
    amount: float


class RevenueCalculateResponse(BaseModel):
    """Revenue 计算响应"""
    metrics: RevenueMetrics
    dailyData: List[DailyRevenueDataEntry]
    composition: List[RevenueCompositionEntry]


# ============================================
# DeFi Models
# ============================================

class DeFiMetrics(BaseModel):
    """DeFi 指标"""
    # BUY
    buyShitAmountCurrent: float
    buyCountCurrent: int
    buyUsdtAmountCurrent: float
    buyShitAmountPrev: Optional[float] = None
    buyCountPrev: Optional[int] = None
    buyUsdtAmountPrev: Optional[float] = None
    buyShitAmountDelta: Optional[float] = None
    buyCountDelta: Optional[float] = None
    buyUsdtAmountDelta: Optional[float] = None
    
    # SELL
    sellShitAmountCurrent: float
    sellCountCurrent: int
    sellUsdtAmountCurrent: float
    sellShitAmountPrev: Optional[float] = None
    sellCountPrev: Optional[int] = None
    sellUsdtAmountPrev: Optional[float] = None
    sellShitAmountDelta: Optional[float] = None
    sellCountDelta: Optional[float] = None
    sellUsdtAmountDelta: Optional[float] = None
    
    # TS Sell (13k-20k)
    tsSellShitAmountCurrent: float
    tsSellUsdtAmountCurrent: float
    tsSellShitAmountPrev: Optional[float] = None
    tsSellUsdtAmountPrev: Optional[float] = None
    tsSellShitAmountDelta: Optional[float] = None
    tsSellUsdtAmountDelta: Optional[float] = None
    
    # LIQ ADD
    liqAddUsdtCurrent: float
    liqAddCountCurrent: int
    liqAddUsdtPrev: Optional[float] = None
    liqAddCountPrev: Optional[int] = None
    liqAddUsdtDelta: Optional[float] = None
    liqAddCountDelta: Optional[float] = None
    
    # LIQ REMOVE
    liqRemoveUsdtCurrent: float
    liqRemoveCountCurrent: int
    liqRemoveUsdtPrev: Optional[float] = None
    liqRemoveCountPrev: Optional[int] = None
    liqRemoveUsdtDelta: Optional[float] = None
    liqRemoveCountDelta: Optional[float] = None


class DailyDeFiDataEntry(BaseModel):
    """DeFi 日数据"""
    date: str
    buyUsdt: float
    sellUsdt: float
    netFlow: float
    liqAddUsdt: float
    liqRemoveUsdt: float
    tsSellUsdt: float


class DeFiCalculateResponse(BaseModel):
    """DeFi 计算响应"""
    metrics: DeFiMetrics
    dailyData: List[DailyDeFiDataEntry]
    hourlyPrice: Optional[List[Dict[str, Any]]] = []


# ============================================
# 数据加载模型
# ============================================

class LoadDataRequest(BaseModel):
    """Request model for loading data"""
    force_refresh: bool = False


class LoadDataResponse(BaseModel):
    """Response model for data loading status"""
    timestamp: str  # ISO format string
    timestamp_ms: int  # milliseconds since epoch
    cache_size_mb: Optional[float] = None


# ============================================
# AI 总结模型
# ============================================

class AISummaryRequest(BaseModel):
    """Request model for AI summary"""
    data_context: str
    system_instruction: str


class AISummaryResponse(BaseModel):
    """Response model for AI summary"""
    summary: str


# ============================================
# Anomaly Detection Models
# ============================================

class AnomalyDetail(BaseModel):
    """异常详细数据"""
    date: str
    address: str
    type: str          # 如: TS_LUCKY_DRAW, TS_OVER_CLAIM, DUPLICATE_CLAIM
    description: str   # 易读的描述内容
    severity: str      # high, medium, low
    data: Dict[str, Any] # 原始数据支撑，如 {"luckyDraws": 5, "claims": 22}


class AnomalySummary(BaseModel):
    """异常统计摘要"""
    totalCount: int
    highRiskCount: int
    mediumRiskCount: int
    lowRiskCount: int


class AnomalyCalculateResponse(BaseModel):
    """异常检测计算响应"""
    summary: AnomalySummary
    anomalies: List[AnomalyDetail]

