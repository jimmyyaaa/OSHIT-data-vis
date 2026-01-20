from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv
from data_cache import data_cache
from routes import calculate_router, data_router, ai_router, auth_router

# 配置logging - 显示所有日志级别
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OSHIT Data API", 
    version="1.0.0",
    description="API for OSHIT data visualization",
)

# Load environment-specific .env file
environment = os.getenv("ENVIRONMENT", "local")
if environment == "production":
    load_dotenv(".env.production")
elif environment == "local":
    load_dotenv(".env.local")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Specify allowed methods
    allow_headers=["*"],
)

# 启动事件：应用启动时自动加载缓存数据
@app.on_event("startup")
async def startup_event():
    """应用启动时自动加载数据到缓存"""
    try:
        print("\n" + "="*50)
        print("🚀 应用启动中...")
        print("="*50)
        
        # 优先从磁盘/内存缓存加载，无缓存时从 Google Sheet 拉取
        await data_cache.load_data(force_refresh=False)
        
        # 输出缓存信息
        cache_info = data_cache.get_cache_info()
        print(f"\n✅ 缓存状态:")
        print(f"   - 内存缓存: {'✅' if cache_info['has_memory_cache'] else '❌'}")
        print(f"   - 磁盘缓存: {'✅' if cache_info['has_disk_cache'] else '❌'}")
        if cache_info['disk_cache_size_mb']:
            print(f"   - 缓存大小: {cache_info['disk_cache_size_mb']}MB")
        if cache_info['last_update']:
            print(f"   - 最后更新: {cache_info['last_update']}")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n⚠️ 启动时加载数据失败: {e}")
        print("💡 可以通过调用 POST /loadData 手动加载数据\n")

app.include_router(calculate_router)
app.include_router(data_router)
app.include_router(ai_router)
app.include_router(auth_router)

