// Define types for our data structure
export interface StakingRecordEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Address: string;
    Type: 'STAKE' | 'UNSTAKE';
    'SHIT Amount': number;
    [key: string]: any;
}

export interface StakingRewardEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Slot: number;
    Signer: string;
    Fee: number;
    'Receiver Address': string;
    'SHIT Sent': number;
    'SOL Received': number;
    Status: string;
    [key: string]: any;
}

export interface TSRecordEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Slot: number;
    Signer: string;
    Fee: number;
    'Receiver Address': string; // 接收地址
    'SHIT Sent': number; // 转移数量
    TS_Category: number; // 分类索引, 0代表做TS的人，1代表做TS的人的推荐人（被动），2代表做TS的人的推荐人的推荐人（被动），3代表做了抽奖
    'SOL_Received': number;
    Status: string;
}

export interface POSRecordEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Slot: number;
    Signer: string;
    Fee: number;
    'Receiver Address': string;
    'SHIT Sent': number;
    'SOL Received': number; // note the space to match sheet header
    Status: string;
}

export interface ShitCodeRecordEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Slot: number;
    Signer: string;
    Fee: number;
    'Receiver Address': string;
    'SHIT Sent': number;
    'SOL Received': number;
    Status: string;
}

export interface ShitPriceEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    Price: number;
}

export interface TSDiscordEntry {
    'Timestamp(UTC+8)': string;
    'SHIT Code Sent': number;
}

export interface LiqPoolActivityEntry {
    'Timestamp(UTC)': string;
    'Timestamp(UTC+8)': string;
    TxId: string;
    Slot: number;
    FromAddress: string;
    Fee: number;
    Activity: "BUY" | "SELL" | "LIQ_ADD" | "LIQ_REMOVE";
    'SHIT Change': number;
    'USDT Change': number;
    Status: string;
}

export interface SheetData {
    TS_Log: TSRecordEntry[];
    POS_Log: POSRecordEntry[];
    Staking_Log: StakingRewardEntry[]; // 质押奖励记录
    Staking_Amount_Log: StakingRecordEntry[]; // 质押记录
    ShitCode_Log: ShitCodeRecordEntry[];
    TS_Discord: TSDiscordEntry[];
    SHIT_Price_Log: ShitPriceEntry[];
    Liq_Pool_Activity: LiqPoolActivityEntry[];
}

export interface APIResponse {
    status: 'success' | 'error';
    data?: SheetData;
    message?: string;
}

export interface CacheEntry {
    data: SheetData;
    timestamp: number;
    version: string;
}

// IndexedDB管理类
class IndexedDBManager {
    private dbName = 'OshitDataCache';
    private version = 1;
    private storeName = 'sheetData';
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error(
                    'IndexedDB initialization failed:',
                    request.error
                );
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                    });
                    store.createIndex('timestamp', 'timestamp', {
                        unique: false,
                    });
                    console.log('Object store created');
                }
            };
        });
    }

    async setData(data: SheetData): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(
                [this.storeName],
                'readwrite'
            );
            const store = transaction.objectStore(this.storeName);

            const cacheEntry: CacheEntry & { id: string } = {
                id: 'main',
                data,
                timestamp: Date.now(),
                version: '1.0',
            };

            const request = store.put(cacheEntry);

            request.onsuccess = () => {
                console.log('Data cached to IndexedDB successfully');
                resolve();
            };

            request.onerror = () => {
                console.error(
                    'Failed to cache data to IndexedDB:',
                    request.error
                );
                reject(request.error);
            };
        });
    }

    async getData(): Promise<CacheEntry | null> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(
                [this.storeName],
                'readonly'
            );
            const store = transaction.objectStore(this.storeName);
            const request = store.get('main');

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log('Data retrieved from IndexedDB cache');
                    resolve({
                        data: result.data,
                        timestamp: result.timestamp,
                        version: result.version,
                    });
                } else {
                    console.log('No cached data found in IndexedDB');
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error(
                    'Failed to retrieve data from IndexedDB:',
                    request.error
                );
                reject(request.error);
            };
        });
    }

    async clearData(): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(
                [this.storeName],
                'readwrite'
            );
            const store = transaction.objectStore(this.storeName);
            const request = store.delete('main');

            request.onsuccess = () => {
                console.log('IndexedDB cache cleared successfully');
                resolve();
            };

            request.onerror = () => {
                console.error(
                    'Failed to clear IndexedDB cache:',
                    request.error
                );
                reject(request.error);
            };
        });
    }

    async getDatabaseSize(): Promise<number> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(
                [this.storeName],
                'readonly'
            );
            const store = transaction.objectStore(this.storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

// DataService主类
class DataService {
    private baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

    private dbManager = new IndexedDBManager();
    private isInitialized = false;

    // 初始化IndexedDB
    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            try {
                await this.dbManager.init();
                this.isInitialized = true;
            } catch (error) {
                console.error('Failed to initialize IndexedDB:', error);
                // 继续运行，但没有缓存功能
                this.isInitialized = false;
            }
        }
    }

    // 获取所有数据
    async getAllData(forceRefresh = false): Promise<SheetData> {
        await this.ensureInitialized();

        try {
            // 如果不强制刷新，先尝试从缓存获取
            if (!forceRefresh && this.isInitialized) {
                const cachedData = await this.dbManager.getData();
                if (cachedData) {
                    console.log(
                        `Using cached data from ${new Date(cachedData.timestamp).toLocaleString()}`
                    );
                    return cachedData.data;
                }
            }

            // 从API获取新数据
            console.log('Fetching fresh data from API...');
            const response = await fetch(
                `${this.baseURL}/getDataFromSheets`,
                {
                    signal: AbortSignal.timeout(300000), // 30 seconds timeout
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch data');
            }

            const responseData = await response.json();
            const freshData = responseData.data;

            // 缓存数据到IndexedDB
            if (this.isInitialized) {
                try {
                    await this.dbManager.setData(freshData);
                    console.log('Data cached to IndexedDB successfully');
                } catch (error) {
                    console.error('Failed to cache data:', error);
                    // 继续执行，即使缓存失败
                }
            }

            return freshData;
        } catch (error) {
            console.error('Error fetching data:', error);

            // 如果API调用失败，尝试返回缓存数据
            if (this.isInitialized && !forceRefresh) {
                const cachedData = await this.dbManager.getData();
                if (cachedData) {
                    console.log('API failed, using cached data as fallback');
                    return cachedData.data;
                }
            }

            // 处理错误
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('请求超时，请检查网络连接');
                }
                throw new Error(`网络错误: ${error.message}`);
            }

            throw error;
        }
    }

    // 强制刷新数据（清除缓存）
    async refreshData(): Promise<SheetData> {
        await this.ensureInitialized();

        // 清除缓存
        if (this.isInitialized) {
            await this.dbManager.clearData();
            console.log('Cache cleared, fetching fresh data...');
        }

        return this.getAllData(true);
    }

    // 获取缓存信息
    async getCacheInfo(): Promise<{
        hasCachedData: boolean;
        cacheTimestamp?: number;
        cacheSize?: number;
    }> {
        await this.ensureInitialized();

        if (!this.isInitialized) {
            return { hasCachedData: false };
        }

        try {
            const cachedData = await this.dbManager.getData();
            const cacheSize = await this.dbManager.getDatabaseSize();

            return {
                hasCachedData: !!cachedData,
                cacheTimestamp: cachedData?.timestamp,
                cacheSize,
            };
        } catch (error) {
            console.error('Failed to get cache info:', error);
            return { hasCachedData: false };
        }
    }

    // 手动清除缓存
    async clearCache(): Promise<void> {
        await this.ensureInitialized();

        if (this.isInitialized) {
            await this.dbManager.clearData();
        }
    }

    // 检查IndexedDB是否可用
    isIndexedDBSupported(): boolean {
        return typeof indexedDB !== 'undefined';
    }

    // 获取缓存的数据（仅从IndexedDB，不调用API）
    async getCachedData(): Promise<SheetData | null> {
        await this.ensureInitialized();

        if (!this.isInitialized) return null;

        try {
            const cachedData = await this.dbManager.getData();
            return cachedData?.data || null;
        } catch (error) {
            console.error('Failed to get cached data:', error);
            return null;
        }
    }

    async getAISummary(dataContext: string, systemInstruction: string) {
        try {
            const response = await fetch(`${this.baseURL}/getAISummary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data_context: dataContext,
                    system_instruction: systemInstruction,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate AI summary');
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating AI summary:', error);
            throw error;
        }
    }
}

export const dataService = new DataService();
