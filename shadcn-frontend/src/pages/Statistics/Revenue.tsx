/**
 * Revenue 汇总页面
 * 真实数据集成 - 调用后端 API 获取数据
 */

import { useState, useEffect } from "react";
import { SectionToolbar } from "@/components/SectionToolbar";
import { StatisticCard } from "@/components/StatisticCard";
import { AISummarySidebar } from "@/components/AISummarySidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledPieChart, StackedBarChart } from "@/components/charts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    fetchRevenueData,
    loadData,
} from "@/services/dataService";

interface RevenueMetrics {
    tsRevenueCurrent: number | null;
    posRevenueCurrent: number | null;
    stakingRevenueCurrent: number | null;
    shitCodeRevenueCurrent: number | null;
    totalRevenueCurrent: number | null;
    tsRevenueDelta: number | null;
    posRevenueDelta: number | null;
    stakingRevenueDelta: number | null;
    shitCodeRevenueDelta: number | null;
    totalRevenueDelta: number | null;
}

interface DailyRevenueDataEntry {
    date: string;
    tsRevenue: number;
    posRevenue: number;
    stakingRevenue: number;
    shitCodeRevenue: number;
    totalRevenue: number;
}

interface RevenueCompositionEntry {
    source: string;
    amount: number;
}

interface RevenueData {
    metrics: RevenueMetrics;
    dailyData: DailyRevenueDataEntry[];
    composition: RevenueCompositionEntry[];
}

export default function RevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
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
            console.log(`📊 获取 Revenue 数据: ${start} 至 ${end}`);
            const result = await fetchRevenueData(start, end);
            setData(result as RevenueData);
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
            currentKey: "tsRevenueCurrent",
            deltaKey: "tsRevenueDelta",
            title: t.revenue.tsRevenue,
            unit: "USDT"
        },
        {
            currentKey: "posRevenueCurrent",
            deltaKey: "posRevenueDelta",
            title: t.revenue.posRevenue,
            unit: "USDT"
        },
        {
            currentKey: "stakingRevenueCurrent",
            deltaKey: "stakingRevenueDelta",
            title: t.revenue.stakingRevenue,
            unit: "USDT"
        },
        {
            currentKey: "shitCodeRevenueCurrent",
            deltaKey: "shitCodeRevenueDelta",
            title: t.revenue.shitcodeRevenue,
            unit: "USDT"
        },
        {
            currentKey: "totalRevenueCurrent",
            deltaKey: "totalRevenueDelta",
            title: t.revenue.totalRevenue,
            unit: "USDT"
        },
    ];

    return (
        <div className="w-full h-full flex flex-col">

            {/* 工具栏 */}
            <SectionToolbar
                title={t.sidebar.revenue}
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
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-8 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.revenue.revenueAnalysis}</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 border-b">
                                        {[1, 2].map((i) => (
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
                            {/* 指标网格 */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {metricsConfig.map((metric) => (
                                        <StatisticCard
                                            key={metric.currentKey}
                                            title={metric.title}
                                            value={data?.metrics[metric.currentKey as keyof RevenueMetrics] ?? null}
                                            unit={metric.unit}
                                            delta={data?.metrics[metric.deltaKey as keyof RevenueMetrics] ?? null}
                                            format="decimal"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* 2 个 Tabs */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.revenue.revenueAnalysis}</h2>
                                <Tabs defaultValue="composition" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="composition">{t.revenue.revenueDistribution}</TabsTrigger>
                                        <TabsTrigger value="daily">{t.revenue.dailyTrend}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="composition" className="space-y-4">
                                        <StyledPieChart
                                            title={t.revenue.revenueDistribution}
                                            data={data?.composition ?? []}
                                            nameKey="source"
                                            valueKey="amount"
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="daily" className="space-y-4">
                                        <StackedBarChart
                                            title={t.revenue.dailyTrend}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            series={[
                                                {
                                                    dataKey: "tsRevenue",
                                                    name: "TS",
                                                    color: "#0984e3",
                                                },
                                                {
                                                    dataKey: "posRevenue",
                                                    name: "POS",
                                                    color: "#fd79a8",
                                                },
                                                {
                                                    dataKey: "stakingRevenue",
                                                    name: "Staking",
                                                    color: "#fd79a8",
                                                },
                                                {
                                                    dataKey: "shitCodeRevenue",
                                                    name: "ShitCode",
                                                    color: "#fab1a0",
                                                },
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
