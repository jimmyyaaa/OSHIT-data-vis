/**
 * POS 统计页面
 * 真实数据集成 - 调用后端 API 获取数据
 */

import { useState, useEffect } from "react";
import { SectionToolbar } from "@/components/SectionToolbar";
import { StatisticCard } from "@/components/StatisticCard";
import { AISummarySidebar } from "@/components/AISummarySidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BarLineChart, HorizontalBarChart } from "@/components/charts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    fetchPOSData,
    loadData,
} from "@/services/dataService";

interface POSMetrics {
    totalTxCurrent: number | null;
    totalAmountCurrent: number | null;
    maxAmountCurrent: number | null;
    minAmountCurrent: number | null;
    totalRevenueCurrent: number | null;
    emissionEfficiencyCurrent: number | null;
    avgRewardCurrent: number | null;
    totalTxDelta: number | null;
    totalAmountDelta: number | null;
    maxAmountDelta: number | null;
    minAmountDelta: number | null;
    totalRevenueDelta: number | null;
    emissionEfficiencyDelta: number | null;
    avgRewardDelta: number | null;
}

interface DailyPOSDataEntry {
    date: string;
    shitSent: number;
    solReceived: number;
}

interface TopPOSUser {
    address: string;
    fullAddress: string;
    shitSent: number;
    txCount: number;
}

interface DuplicateAddressEntry {
    address: string;
    date: string;
    txCount: number;
}

interface POSData {
    metrics: POSMetrics;
    dailyData: DailyPOSDataEntry[];
    topUsers: TopPOSUser[];
    duplicateAddresses: DuplicateAddressEntry[];
}

export default function POSPage() {
    const [data, setData] = useState<POSData | null>(null);
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
            console.log(`📊 获取 POS 数据: ${start} 至 ${end}`);
            const result = await fetchPOSData(start, end);
            setData(result as POSData);
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

    // 指标配置
    const metricsConfig = [
        {
            currentKey: "totalTxCurrent",
            deltaKey: "totalTxDelta",
            title: t.pos.totalTx,
            unit: t.common.times
        },
        {
            currentKey: "totalAmountCurrent",
            deltaKey: "totalAmountDelta",
            title: t.pos.totalAmount,
            unit: "SHIT"
        },
        {
            currentKey: "maxAmountCurrent",
            deltaKey: "maxAmountDelta",
            title: t.pos.maxAmount,
            unit: "SHIT"
        },
        {
            currentKey: "minAmountCurrent",
            deltaKey: "minAmountDelta",
            title: t.pos.minAmount,
            unit: "SHIT"
        },
        {
            currentKey: "totalRevenueCurrent",
            deltaKey: "totalRevenueDelta",
            title: t.pos.totalRevenue,
            unit: "SOL"
        },
        {
            currentKey: "avgRewardCurrent",
            deltaKey: "avgRewardDelta",
            title: t.pos.avgReward,
            unit: "SOL"
        },
    ];

    return (
        <div className="w-full h-full flex flex-col">
            {/* 工具栏 */}
            <SectionToolbar
                title={t.sidebar.pos}
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
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataTrend}</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 border-b">
                                        {[1, 2].map((i) => (
                                            <Skeleton key={i} className="h-10 w-24" />
                                        ))}
                                    </div>
                                    <Skeleton className="h-80 w-full" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.pos.topUsers}</h2>
                                <div className="border rounded-lg overflow-hidden space-y-2 p-4">
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <Skeleton className="h-6 w-8" />
                                            <Skeleton className="h-6 flex-1" />
                                            <Skeleton className="h-6 w-24" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 正常数据显示
                        <>
                            {/* 指标网格 */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {metricsConfig.map((metric) => (
                                        <StatisticCard
                                            key={metric.currentKey}
                                            title={metric.title}
                                            value={data?.metrics[metric.currentKey as keyof POSMetrics] ?? null}
                                            unit={metric.unit}
                                            delta={data?.metrics[metric.deltaKey as keyof POSMetrics] ?? null}
                                            format={metric.unit === "SOL" ? "decimal" : "number"}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* 2 个 Tabs */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataTrend}</h2>
                                <Tabs defaultValue="trend" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="trend">{t.pos.dailyTrend}</TabsTrigger>
                                        <TabsTrigger value="topUsers">{t.pos.topUsers}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="trend" className="space-y-4">
                                        <BarLineChart
                                            title={t.pos.dailyTrend}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            barAxis={{
                                                dataKey: "shitSent",
                                                name: "SHIT Distributed",
                                                color: "#3b82f6"
                                            }}
                                            lineAxis={{
                                                dataKey: "solReceived",
                                                name: "SOL Revenue",
                                                color: "#ec4899"
                                            }}
                                            yLeftPrecision={0}
                                            yRightPrecision={4}
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="topUsers" className="space-y-4">
                                        <HorizontalBarChart
                                            title={t.pos.topUsers}
                                            data={data?.topUsers ?? []}
                                            nameKey="address"
                                            valueKey="shitSent"
                                            fullAddressKey="fullAddress"
                                            color="#3b82f6"
                                            height={380}
                                            xAxisPrecision={0}
                                            labelPrecision={0}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* 重复交易地址 */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.pos.duplicateAddresses}</h2>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted">
                                                <th className="px-4 py-2 text-left font-semibold">{t.common.rank}</th>
                                                <th className="px-4 py-2 text-left font-semibold">{t.common.address}</th>
                                                <th className="px-4 py-2 text-left font-semibold">{t.pos.date}</th>
                                                <th className="px-4 py-2 text-right font-semibold">{t.pos.txCount}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.duplicateAddresses ?? []).length > 0 ? (
                                                data?.duplicateAddresses?.map((entry, idx) => (
                                                    <tr key={idx} className="border-b hover:bg-muted/50">
                                                        <td className="px-4 py-2">{idx + 1}</td>
                                                        <td className="px-4 py-2 font-mono text-xs">{entry.address}</td>
                                                        <td className="px-4 py-2">{entry.date}</td>
                                                        <td className="px-4 py-2 text-right">{entry.txCount}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                        {t.common.noData}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </AISummarySidebar>
        </div>
    );
}
