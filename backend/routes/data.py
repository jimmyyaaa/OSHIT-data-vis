"""
数据加载和处理路由
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from data_cache import data_cache
from .schemas import LoadDataResponse, LoadDataRequest

router = APIRouter(prefix="", tags=["Data"])


@router.post("/loadData", response_model=LoadDataResponse)
async def load_data(request: LoadDataRequest):
    """
    加载数据的统一入口。
    
    支持两种加载策略：
    1. force_refresh=true: 清空缓存，从 Google Sheet 重新加载数据
    2. force_refresh=false: 优先使用缓存，如果无缓存则从 Google Sheet 加载
    
    Args:
        request: 包含 force_refresh 标志的请求对象
    
    Returns:
        LoadDataResponse: 包含时间戳和缓存大小
    """
    try:
        await data_cache.load_data(force_refresh=request.force_refresh)
        
        # 获取缓存信息
        cache_info = data_cache.get_cache_info()
        
        # 将 ISO format 时间戳转为毫秒时间戳
        timestamp_str = cache_info.get('last_update', '')
        timestamp_ms = int(datetime.fromisoformat(timestamp_str).timestamp() * 1000) if timestamp_str else int(datetime.now().timestamp() * 1000)
        
        return LoadDataResponse(
            timestamp=timestamp_str,
            timestamp_ms=timestamp_ms,
            cache_size_mb=cache_info.get('disk_cache_size_mb')
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
