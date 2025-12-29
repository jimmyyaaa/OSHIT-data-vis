"""
路由包
"""
from .calculate import router as calculate_router
from .data import router as data_router
from .ai import router as ai_router

__all__ = ['calculate_router', 'data_router', 'ai_router']
