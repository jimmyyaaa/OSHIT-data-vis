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
from utils.data_loader import load_sheet_data


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
        加载数据的主逻辑
        
        优先级：
        1. force_refresh=True  → 从Google Sheet重新拉取
        2. 内存缓存有数据     → 直接返回（最快）
        3. 磁盘缓存有数据     → 从磁盘加载到内存
        4. 都没有            → 从Google Sheet拉取
        
        Args:
            force_refresh: 是否强制刷新（忽略所有缓存）
        
        Returns:
            加载的数据字典 {sheet_name: DataFrame}
        """
        # 强制刷新：清空所有缓存并重新拉取
        if force_refresh:
            print("🔄 强制刷新：清空缓存，从 Google Sheet 重新加载...")
            self._data = None
            self._last_update = None
            return await self._fetch_and_cache()
        
        # 检查内存缓存
        if self.is_cached and self._data is not None:
            print("⚡ 使用内存缓存（最快）")
            return self._data
        
        # 检查磁盘缓存
        if self.has_disk_cache:
            print("⚡ 从磁盘加载缓存到内存...")
            disk_data = self._load_from_disk()
            if disk_data is not None:
                self._data = disk_data
                return self._data
        
        # 都没有：从 Google Sheet 拉取
        print("🔄 缓存不存在，从 Google Sheet 拉取数据...")
        return await self._fetch_and_cache()

    async def _fetch_and_cache(self) -> Dict[str, pd.DataFrame]:
        """
        从 Google Sheet 拉取数据，更新内存和磁盘缓存
        
        内存缓存存 DataFrame，磁盘缓存存 JSON
        
        Returns:
            加载的数据字典 {sheet_name: DataFrame}
        
        Raises:
            Exception: 数据加载失败时抛出异常
        """
        try:
            sheet_names = [
                "POS_Log",
                "Staking_Log",
                "Staking_Amount_Log",
                "ShitCode_Log",
                "TS_Discord",
                "SHIT_Price_Log",
                "Liq_Pool_Activity",
            ]
            
            # 从 Google Sheet 加载数据（返回 DataFrame）
            print("⏳ 从 Google Sheet 加载数据...")
            data = load_sheet_data(sheet_names)
            
            # 数据清洗（处理日期时间列）
            # 在缓存时就转化时间戳，避免计算时重复转化
            data = self._convert_timestamps(data)
            
            # 更新内存缓存（存 DataFrame）
            self._data = data
            self._last_update = datetime.now()
            
            # 保存到磁盘缓存（转为 JSON）
            self._save_to_disk(data)
            
            return data
        except Exception as e:
            raise Exception(f"Failed to load data from Google Sheet: {str(e)}")

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
