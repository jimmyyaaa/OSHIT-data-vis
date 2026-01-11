/**
 * 数据服务 - 调用后端 API 获取数据
 * 所有 API 端点的统一入口
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";

interface LoadDataResponse {
    timestamp: string;
    timestamp_ms: number;
    cache_size_mb: number;
}

interface CalculateResponse {
    metrics: Record<string, any>;
    dailyData: Array<Record<string, any>>;
    topXxx?: Array<Record<string, any>>;
    composition?: Array<Record<string, any>>;
    heatmapData?: Record<string, any>;
    [key: string]: any;
}

interface LoginResponse {
    access_token: string;
    token_type: string;
    username: string;
    role: string;
}

/**
 * 用户登录
 */
export async function loginApi(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "登录失败");
    }

    return await response.json();
}

/**
 * 初始化/刷新数据缓存
 * @param forceRefresh 是否强制刷新（跳过缓存）
 */
export async function loadData(forceRefresh: boolean = false): Promise<LoadDataResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/loadData`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ force_refresh: forceRefresh }),
        });

        if (!response.ok) {
            if (response.status === 412) {
                throw new Error("412: 缓存需要初始化，请先调用 loadData()");
            }
            if (response.status === 500) {
                throw new Error("500: 服务器错误");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data: LoadDataResponse = await response.json();
        console.log("✅ loadData 成功:", data);
        return data;
    } catch (error) {
        console.error("❌ loadData 失败:", error);
        throw error;
    }
}

/**
 * 获取 Staking 数据
 */
export async function fetchStakingData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("staking", startDate, endDate);
}

/**
 * 获取 TS Trading 数据
 */
export async function fetchTSData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("ts", startDate, endDate);
}

/**
 * 获取 POS 数据
 */
export async function fetchPOSData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("pos", startDate, endDate);
}

/**
 * 获取 ShitCode 数据
 */
export async function fetchShitcodeData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("shitcode", startDate, endDate);
}

/**
 * 获取 Revenue 数据
 */
export async function fetchRevenueData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("revenue", startDate, endDate);
}

/**
 * 获取 DeFi 数据
 */
export async function fetchDefiData(
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    return calculateRequest("defi", startDate, endDate);
}

/**
 * 通用计算请求函数
 * @param type 数据类型 (staking|ts|pos|shitcode|revenue|defi)
 * @param startDate 开始日期 (YYYY-MM-DD)
 * @param endDate 结束日期 (YYYY-MM-DD)
 */
async function calculateRequest(
    type: string,
    startDate: string,
    endDate: string
): Promise<CalculateResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/calculate/${type}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                start_date: startDate,
                end_date: endDate,
            }),
        });

        if (!response.ok) {
            if (response.status === 412) {
                throw new Error("412: 需要先调用 loadData()");
            }
            if (response.status === 500) {
                throw new Error("500: 服务器错误");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data: CalculateResponse = await response.json();
        // console.log(`✅ calculate/${type} 成功:`, data);
        return data;
    } catch (error) {
        // console.error(`❌ calculate/${type} 失败:`, error);
        throw error;
    }
}

/**
 * 日期格式化辅助函数 - 使用本地时间避免时区偏移
 * @param date Date 对象
 * @returns YYYY-MM-DD 格式的字符串
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * 获取默认日期范围（昨天当天）- 使用本地时间
 * @returns { startDate, endDate }
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 默认起始和结束日期都设为昨天
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return {
        startDate: formatDate(yesterday),
        endDate: formatDate(yesterday),
    };
}
