"""
数据缓存管理模块
负责管理应用级别的数据缓存（内存 DataFrame + 磁盘 JSON 持久化）
"""
import os
import json
import pickle
from datetime import datetime
from typing import Optional, Dict, Any
import pandas as pd


class DataCache:
    """单例数据缓存类 - 内存存 DataFrame，磁盘存 JSON"""
    
    # 类变量
    _instance: Optional['DataCache'] = None
    _data: Optional[Dict[str, pd.DataFrame]] = None  # 内存存 DataFrame
    _last_update: Optional[datetime] = None
    
    # 缓存文件路径
    CACHE_DIR = os.path.join(os.path.dirname(__file__), '.cache')
    CACHE_FILE = os.path.join(CACHE_DIR, 'sheet_data.json')
    METADATA_FILE = os.path.join(CACHE_DIR, 'cache_metadata.json')

    def __new__(cls) -> 'DataCache':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_cache_dir()
        return cls._instance

    def _init_cache_dir(self) -> None:
        """初始化缓存目录"""
        if not os.path.exists(self.CACHE_DIR):
            os.makedirs(self.CACHE_DIR)
            print(f"✅ 创建缓存目录: {self.CACHE_DIR}")

    def _convert_timestamps(self, data: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        转化所有 DataFrame 中的时间戳列为 datetime 类型
        在缓存时就转化，避免计算时重复转化
        
        Args:
            data: 原始数据 {sheet_name: DataFrame}
        
        Returns:
            转化后的数据
        """
        result = {}
        for sheet_name, df in data.items():
            df_copy = df.copy()
            
            # 转化可能的时间戳列
            timestamp_cols = [
                'Timestamp(UTC+8)',
                'Timestamp',
                'Date',
                'datetime'
            ]
            
            for col in df_copy.columns:
                if col in timestamp_cols or 'time' in col.lower():
                    try:
                        df_copy[col] = pd.to_datetime(df_copy[col])
                    except Exception as e:
                        print(f"⚠️ 转化 {sheet_name}.{col} 失败: {e}")
            
            result[sheet_name] = df_copy
        
        print("✅ 时间戳转化完成")
        return result

    @property
    def data(self) -> Optional[Dict[str, pd.DataFrame]]:
        """获取缓存数据（DataFrame 格式）"""
        return self._data

    @property
    def last_update(self) -> Optional[datetime]:
        """获取最后更新时间"""
        return self._last_update

    @property
    def is_cached(self) -> bool:
        """检查是否有内存缓存数据"""
        return self._data is not None

    @property
    def has_disk_cache(self) -> bool:
        """检查是否有磁盘缓存文件"""
        return os.path.exists(self.CACHE_FILE)

    def _load_from_disk(self) -> Optional[Dict[str, pd.DataFrame]]:
        """从磁盘读取缓存文件（JSON → DataFrame）"""
        try:
            if not os.path.exists(self.CACHE_FILE):
                return None
            
            # 读取 JSON 文件
            with open(self.CACHE_FILE, 'r', encoding='utf-8') as f:
                data_dict = json.load(f)
            
            # 转换回 DataFrame
            data_df = {}
            for sheet_name, records in data_dict.items():
                data_df[sheet_name] = pd.DataFrame(records)
            
            # 转化时间戳列为 datetime 类型
            data_df = self._convert_timestamps(data_df)
            
            # 读取元数据
            if os.path.exists(self.METADATA_FILE):
                with open(self.METADATA_FILE, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    self._last_update = datetime.fromisoformat(metadata['last_update'])
            
            print(f"✅ 从磁盘加载缓存: {self.CACHE_FILE}")
            return data_df
        except Exception as e:
            print(f"⚠️ 从磁盘加载缓存失败: {e}")
            return None

    def _save_to_disk(self, data: Dict[str, pd.DataFrame]) -> bool:
        """将 DataFrame 缓存转为 JSON 保存到磁盘"""
        try:
            # 转换 DataFrame → Dict
            data_dict = {}
            for sheet_name, df in data.items():
                data_dict[sheet_name] = df.to_dict('records')
            
            # 保存 JSON 数据
            with open(self.CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(data_dict, f, ensure_ascii=False, indent=2, default=str)
            
            # 保存元数据
            metadata = {
                'last_update': datetime.now().isoformat(),
                'cache_size_mb': os.path.getsize(self.CACHE_FILE) / (1024 * 1024)
            }
            with open(self.METADATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 缓存已保存到磁盘: {self.CACHE_FILE} ({metadata['cache_size_mb']:.2f}MB)")
            return True
        except Exception as e:
            print(f"❌ 保存缓存到磁盘失败: {e}")
            return False

    async def load_data(self, force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
        """
        初始化系统加载状态
        
        优先级：
        1. force_refresh=True  → 强制重新初始化
        2. 内存状态已初始化     → 直接返回
        3. 磁盘元数据存在       → 从磁盘恢复状态
        4. 都没有              → 执行初始化
        
        Args:
            force_refresh: 是否强制重置状态
        
        Returns:
            加载的数据字典 (当前为空，仅保持接口兼容)
        """
        # 强制刷新：清空并重新初始化
        if force_refresh:
            print("🔄 强制刷新：重置系统加载状态...")
            self._data = None
            self._last_update = None
            return await self._fetch_and_cache()
        
        # 检查内存缓存
        if self.is_cached and self._data is not None:
            print("⚡ 系统已加载 (内存)")
            return self._data
        
        # 检查磁盘缓存
        if self.has_disk_cache:
            print("⚡ 从磁盘恢复加载状态...")
            disk_data = self._load_from_disk()
            if disk_data is not None:
                self._data = disk_data
                return self._data
        
        # 都没有：执行加载
        print("🔄 首次启动，执行系统初始化...")
        return await self._fetch_and_cache()

    async def _fetch_and_cache(self) -> Dict[str, pd.DataFrame]:
        """
        初始化系统状态
        由于目前已全部迁移至 SQL，此函数仅用于重置加载状态
        
        Returns:
            空数据字典
        """
        try:
            print("🔄 初始化系统状态 (SQL 模式)...")
            
            data = {}
            
            # 更新内存缓存
            self._data = data
            self._last_update = datetime.now()
            
            # 保存元数据到磁盘
            self._save_to_disk(data)
            
            return data
        except Exception as e:
            raise Exception(f"Failed to initialize data state: {str(e)}")

    def clear_all_cache(self) -> None:
        """清空所有缓存（内存 + 磁盘）"""
        # 清空内存
        self._data = None
        self._last_update = None
        
        # 删除磁盘文件
        try:
            if os.path.exists(self.CACHE_FILE):
                os.remove(self.CACHE_FILE)
            if os.path.exists(self.METADATA_FILE):
                os.remove(self.METADATA_FILE)
            print("✅ 已清空所有缓存（内存 + 磁盘）")
        except Exception as e:
            print(f"⚠️ 清空磁盘缓存失败: {e}")

    def get_cache_info(self) -> Dict[str, Any]:
        """获取缓存信息"""
        info = {
            'has_memory_cache': self.is_cached,
            'has_disk_cache': self.has_disk_cache,
            'memory_cache_type': 'DataFrame' if self.is_cached else None,
            'last_update': self._last_update.isoformat() if self._last_update else None,
            'disk_cache_path': self.CACHE_FILE if self.has_disk_cache else None,
        }
        
        if self.has_disk_cache:
            try:
                cache_size_mb = os.path.getsize(self.CACHE_FILE) / (1024 * 1024)
                info['disk_cache_size_mb'] = round(cache_size_mb, 2)
            except:
                pass
        
        return info


# 全局单例实例
data_cache = DataCache()
