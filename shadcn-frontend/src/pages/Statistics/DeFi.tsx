/**
 * DeFi 深度分析页面
 * 真实数据集成 - 调用后端 API 获取数据
 */

import { useState, useEffect } from "react";
import { SectionToolbar } from "@/components/SectionToolbar";
import { StatisticCard } from "@/components/StatisticCard";
import { AISummarySidebar } from "@/components/AISummarySidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DoubleBarLineChart, StackedBarChart, CandlestickChart } from "@/components/charts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    fetchDefiData,
    loadData,
} from "@/services/dataService";

interface DeFiMetrics {
    // BUY
    buyShitAmountCurrent: number | null;
    buyCountCurrent: number | null;
    buyUsdtAmountCurrent: number | null;
    buyShitAmountPrev: number | null;
    buyCountPrev: number | null;
    buyUsdtAmountPrev: number | null;
    buyShitAmountDelta: number | null;
    buyCountDelta: number | null;
    buyUsdtAmountDelta: number | null;
    // SELL
    sellShitAmountCurrent: number | null;
    sellCountCurrent: number | null;
    sellUsdtAmountCurrent: number | null;
    sellShitAmountPrev: number | null;
    sellCountPrev: number | null;
    sellUsdtAmountPrev: number | null;
    sellShitAmountDelta: number | null;
    sellCountDelta: number | null;
    sellUsdtAmountDelta: number | null;
    // TS Sell
    tsSellShitAmountCurrent: number | null;
    tsSellUsdtAmountCurrent: number | null;
    tsSellShitAmountPrev: number | null;
    tsSellUsdtAmountPrev: number | null;
    tsSellShitAmountDelta: number | null;
    tsSellUsdtAmountDelta: number | null;
    // LIQ ADD
    liqAddUsdtCurrent: number | null;
    liqAddCountCurrent: number | null;
    liqAddUsdtPrev: number | null;
    liqAddCountPrev: number | null;
    liqAddUsdtDelta: number | null;
    liqAddCountDelta: number | null;
    // LIQ REMOVE
    liqRemoveUsdtCurrent: number | null;
    liqRemoveCountCurrent: number | null;
    liqRemoveUsdtPrev: number | null;
    liqRemoveCountPrev: number | null;
    liqRemoveUsdtDelta: number | null;
    liqRemoveCountDelta: number | null;
}

interface DailyDeFiDataEntry {
    date: string;
    buyUsdt: number;
    sellUsdt: number;
    netFlow: number;
    liqAddUsdt: number;
    liqRemoveUsdt: number;
    tsSellUsdt: number;
}

interface HourlyPriceData {
    time: string;
    ohlc: [number, number, number, number]; // [open, close, low, high]
}

interface DeFiData {
    metrics: DeFiMetrics;
    dailyData: DailyDeFiDataEntry[];
    hourlyPrice?: HourlyPriceData[];
}

export default function DeFiPage() {
    const [data, setData] = useState<DeFiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiOpen, setAiOpen] = useState(false);
    const { startDate, endDate } = useDateRange();
    const { getTranslations } = useLocale();
    const t = getTranslations();

    // 获取数据的通用函数
    const fetchData = async (start: string, end: string) => {
        try {
            setLoading(true);
            setError(null);
            console.log(`📊 获取 DeFi 数据: ${start} 至 ${end}`);
            const result = await fetchDefiData(start, end);
            setData(result as DeFiData);
            console.log("✅ 数据获取成功:", result);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "未知错误";
            setError(errorMsg);
            console.error("❌ 数据获取失败:", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // 挂载时和日期改变时获取数据
    useEffect(() => {
        fetchData(startDate, endDate);
    }, [startDate, endDate]);

    // 刷新按钮回调
    const handleRefresh = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("🔄 调用 loadData 刷新缓存...");
            await loadData(true);
            console.log("✅ 缓存刷新成功");
            await fetchData(startDate, endDate);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "刷新失败";
            setError(errorMsg);
            console.error("❌ 刷新失败:", errorMsg);
            setLoading(false);
        }
    };

    // 指标配置 - Buy/Sell 指标
    const buySellMetrics = [
        {
            currentKey: "buyShitAmountCurrent",
            deltaKey: "buyShitAmountDelta",
            title: t.defi.buyShit,
            unit: "SHIT"
        },
        {
            currentKey: "buyCountCurrent",
            deltaKey: "buyCountDelta",
            title: t.defi.buyCount,
            unit: t.common.times
        },
        {
            currentKey: "buyUsdtAmountCurrent",
            deltaKey: "buyUsdtAmountDelta",
            title: t.defi.buyUsdt,
            unit: "USDT"
        },
        {
            currentKey: "sellShitAmountCurrent",
            deltaKey: "sellShitAmountDelta",
            title: t.defi.sellShit,
            unit: "SHIT"
        },
        {
            currentKey: "sellCountCurrent",
            deltaKey: "sellCountDelta",
            title: t.defi.sellCount,
            unit: t.common.times
        },
        {
            currentKey: "sellUsdtAmountCurrent",
            deltaKey: "sellUsdtAmountDelta",
            title: t.defi.sellUsdt,
            unit: "USDT"
        },
    ];

    // TS Sell 指标
    const tsSellMetrics = [
        {
            currentKey: "tsSellShitAmountCurrent",
            deltaKey: "tsSellShitAmountDelta",
            title: t.defi.tsSellShit,
            unit: "SHIT"
        },
        {
            currentKey: "tsSellUsdtAmountCurrent",
            deltaKey: "tsSellUsdtAmountDelta",
            title: t.defi.tsSellUsdt,
            unit: "USDT"
        },
    ];

    // 流动性指标
    const liqMetrics = [
        {
            currentKey: "liqAddUsdtCurrent",
            deltaKey: "liqAddUsdtDelta",
            title: t.defi.liqAdd,
            unit: "USDT"
        },
        {
            currentKey: "liqAddCountCurrent",
            deltaKey: "liqAddCountDelta",
            title: t.defi.liqAddCount,
            unit: t.common.times
        },
        {
            currentKey: "liqRemoveUsdtCurrent",
            deltaKey: "liqRemoveUsdtDelta",
            title: t.defi.liqRemove,
            unit: "USDT"
        },
        {
            currentKey: "liqRemoveCountCurrent",
            deltaKey: "liqRemoveCountDelta",
            title: t.defi.liqRemoveCount,
            unit: t.common.times
        },
    ];

    return (
        <div className="w-full h-full flex flex-col">

            {/* 工具栏 */}
            <SectionToolbar
                title={t.sidebar.defi}
                onRefresh={handleRefresh}
                isAISummaryOpen={aiOpen}
                onToggleAISummary={setAiOpen}
                isLoading={loading}
            />

            {/* 内容区域 */}
            <AISummarySidebar
                isOpen={aiOpen}
                content="这是 AI 总结的 Placeholder。待集成真实 AI 功能后，这里会显示 Markdown 格式的分析结果。"
                isLoading={false}
            >
                <div className="w-full h-full space-y-6 p-6">
                    {/* 错误告警 */}
                    {error ? (
                        <div className="h-full flex items-center justify-center">
                            <Alert variant="destructive" className="max-w-md">
                                <AlertDescription className="flex flex-col items-start gap-2">
                                    <span className="text-lg font-semibold">❌ {t.common.error}</span>
                                    <span>{error}</span>
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : loading ? (
                        // 加载状态
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.defi.buyMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((idx) => (
                                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.defi.sellMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((idx) => (
                                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.defi.liqMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((idx) => (
                                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataAnalysis}</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 border-b">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-10 w-24" />
                                        ))}
                                    </div>
                                    <Skeleton className="h-80 w-full" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 正常数据显示
                        <>
                            {/* 指标 Tabs */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <Tabs defaultValue="buySell" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="buySell">{t.defi.buySellMetrics}</TabsTrigger>
                                        <TabsTrigger value="tsSell">{t.defi.tsSellMetrics}</TabsTrigger>
                                        <TabsTrigger value="liquidity">{t.defi.liqMetrics}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="buySell" className="space-y-4">
                                        <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                            {buySellMetrics.map((metric) => (
                                                <StatisticCard
                                                    key={metric.currentKey}
                                                    title={metric.title}
                                                    value={data?.metrics[metric.currentKey as keyof DeFiMetrics] ?? null}
                                                    unit={metric.unit}
                                                    delta={data?.metrics[metric.deltaKey as keyof DeFiMetrics] ?? null}
                                                    format={metric.unit === "USDT" ? "decimal" : "number"}
                                                />
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="tsSell" className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {tsSellMetrics.map((metric) => (
                                                <StatisticCard
                                                    key={metric.currentKey}
                                                    title={metric.title}
                                                    value={data?.metrics[metric.currentKey as keyof DeFiMetrics] ?? null}
                                                    unit={metric.unit}
                                                    delta={data?.metrics[metric.deltaKey as keyof DeFiMetrics] ?? null}
                                                    format={metric.unit === "USDT" ? "decimal" : "number"}
                                                />
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="liquidity" className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {liqMetrics.map((metric) => (
                                                <StatisticCard
                                                    key={metric.currentKey}
                                                    title={metric.title}
                                                    value={data?.metrics[metric.currentKey as keyof DeFiMetrics] ?? null}
                                                    unit={metric.unit}
                                                    delta={data?.metrics[metric.deltaKey as keyof DeFiMetrics] ?? null}
                                                    format={metric.unit === "USDT" ? "decimal" : "number"}
                                                />
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* 数据分析 Tabs（4个图表）*/}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataAnalysis}</h2>
                                <Tabs defaultValue="kline" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="kline">{t.defi.priceTrend}</TabsTrigger>
                                        <TabsTrigger value="buyVsSell">{t.defi.dailyTrend}</TabsTrigger>
                                        <TabsTrigger value="liquidity">{t.defi.liqTrend}</TabsTrigger>
                                        <TabsTrigger value="tsSellPressure">{t.defi.tsSellMetrics}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="kline" className="space-y-4">
                                        {data?.hourlyPrice && data.hourlyPrice.length > 0 ? (
                                            <CandlestickChart
                                                title={t.defi.priceTrend}
                                                data={data.hourlyPrice}
                                                height={400}
                                            />
                                        ) : (
                                            <div className="h-96 flex items-center justify-center text-gray-500">
                                                {t.common.noData}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="buyVsSell" className="space-y-4">
                                        <DoubleBarLineChart
                                            title={t.defi.dailyTrend}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            bar1Axis={{
                                                dataKey: "buyUsdt",
                                                name: "Buy Volume",
                                                color: "#3b82f6"
                                            }}
                                            bar2Axis={{
                                                dataKey: "sellUsdt",
                                                name: "Sell Volume",
                                                color: "#ec4899"
                                            }}
                                            lineAxis={{
                                                dataKey: "netFlow",
                                                name: "Net Flow",
                                                color: "#10b981"
                                            }}
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="liquidity" className="space-y-4">
                                        <StackedBarChart
                                            title={t.defi.liqTrend}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            series={[
                                                {
                                                    dataKey: "liqAddUsdt",
                                                    name: "Add Liquidity",
                                                    color: "#3b82f6"
                                                },
                                                {
                                                    dataKey: "liqRemoveUsdt",
                                                    name: "Remove Liquidity",
                                                    color: "#ec4899"
                                                }
                                            ]}
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="tsSellPressure" className="space-y-4">
                                        <StackedBarChart
                                            title={t.defi.tsSellMetrics}
                                            data={data?.dailyData.map(d => ({
                                                ...d,
                                                normalSell: d.sellUsdt - d.tsSellUsdt
                                            })) ?? []}
                                            xAxisKey="date"
                                            series={[
                                                {
                                                    dataKey: "tsSellUsdt",
                                                    name: "TS Sell",
                                                    color: "#ef4444"
                                                },
                                                {
                                                    dataKey: "normalSell",
                                                    name: "Normal Sell",
                                                    color: "#f97316"
                                                }
                                            ]}
                                            height={380}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </>
                    )}
                </div>
            </AISummarySidebar>
        </div>
    );
}
