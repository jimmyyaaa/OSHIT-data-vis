/**
 * TS Trading 统计页面
 * 真实数据集成 - 调用后端 API 获取数据
 */

import { useState, useEffect } from "react";
import { SectionToolbar } from "@/components/SectionToolbar";
import { StatisticCard } from "@/components/StatisticCard";
import { AISummarySidebar } from "@/components/AISummarySidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DualAxisLineChart,
    HorizontalBarChart,
    Heatmap,
} from "@/components/charts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    fetchTSData,
    loadData,
} from "@/services/dataService";

interface TSMetrics {
    totalTxCurrent: number | null;
    tsClaimCurrent: number | null;
    totalAmountCurrent: number | null;
    uniqueAddressesCurrent: number | null;
    meanClaimsCurrent: number | null;
    medianClaimsCurrent: number | null;
    avgIntervalCurrent: number | null;
    wolfTxCurrent: number | null;
    oneRefTxCurrent: number | null;
    twoRefTxCurrent: number | null;
    luckyDrawsCurrent: number | null;
    luckyDrawAmountCurrent: number | null;
    luckyDrawAddressesCurrent: number | null;
    revenueWithoutRewardCurrent: number | null;
    shitCostWithoutRewardCurrent: number | null;
    roiWithoutRewardCurrent: number | null;
    rewardCountCurrent: number | null;
    rewardCostCurrent: number | null;
    roiWithRewardCurrent: number | null;
    totalTxDelta: number | null;
    tsClaimDelta: number | null;
    totalAmountDelta: number | null;
    uniqueAddressesDelta: number | null;
    meanClaimsDelta: number | null;
    medianClaimsDelta: number | null;
    avgIntervalDelta: number | null;
    wolfTxDelta: number | null;
    oneRefTxDelta: number | null;
    twoRefTxDelta: number | null;
    luckyDrawsDelta: number | null;
    luckyDrawAmountDelta: number | null;
    luckyDrawAddressesDelta: number | null;
    revenueWithoutRewardDelta: number | null;
    shitCostWithoutRewardDelta: number | null;
    roiWithoutRewardDelta: number | null;
    rewardCountDelta: number | null;
    rewardCostDelta: number | null;
    roiWithRewardDelta: number | null;
}

interface DailyTSDataEntry {
    date: string;
    txCount: number;
    shitSent: number;
    solReceived: number;
}

interface HeatmapData {
    dates: string[];
    hours: number[];
    data: Array<[number, number, number]>;
}

interface TopTSUser {
    address: string;
    fullAddress: string;
    txCount: number;
    shitSent: number;
}

interface RepeatRankingEntry {
    address: string;
    count: number;
}

interface TSData {
    metrics: TSMetrics;
    dailyData: DailyTSDataEntry[];
    heatmapData: HeatmapData;
    topUsers: TopTSUser[];
    repeatRanking: RepeatRankingEntry[];
}

export default function TSPage() {
    const [data, setData] = useState<TSData | null>(null);
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
            console.log(`📊 获取 TS Trading 数据: ${start} 至 ${end}`);
            const result = await fetchTSData(start, end);
            setData(result as TSData);
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

    return (
        <div className="w-full h-full flex flex-col">

            {/* 工具栏 */}
            <SectionToolbar
                title={t.sidebar.ts}
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
                                        {[1, 2, 3, 4].map((i) => (
                                            <Skeleton key={i} className="h-10 w-24" />
                                        ))}
                                    </div>
                                    <Skeleton className="h-80 w-full" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.ts.activeUsers}</h2>
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
                            {/* 指标分类 Tabs */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <Tabs defaultValue="basic" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="basic">{t.ts.basicStats}</TabsTrigger>
                                        <TabsTrigger value="behavior">{t.ts.userBehavior}</TabsTrigger>
                                        <TabsTrigger value="revenue">{t.ts.revenueAnalysis}</TabsTrigger>
                                    </TabsList>

                                    {/* Tab 1: 基础统计 */}
                                    <TabsContent value="basic" className="space-y-4 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <StatisticCard
                                                title={t.ts.totalTx}
                                                value={data?.metrics.totalTxCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.totalTxDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.tsClaim}
                                                value={data?.metrics.tsClaimCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.tsClaimDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.totalAmount}
                                                value={data?.metrics.totalAmountCurrent ?? null}
                                                unit="SHIT"
                                                delta={data?.metrics.totalAmountDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.uniqueAddresses}
                                                value={data?.metrics.uniqueAddressesCurrent ?? null}
                                                unit={t.common.count}
                                                delta={data?.metrics.uniqueAddressesDelta ?? null}
                                                format="number"
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Tab 2: 用户行为 */}
                                    <TabsContent value="behavior" className="space-y-4 pt-4">
                                        <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                            <StatisticCard
                                                title={t.ts.meanClaims}
                                                value={data?.metrics.meanClaimsCurrent ?? null}
                                                delta={data?.metrics.meanClaimsDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.medianClaims}
                                                value={data?.metrics.medianClaimsCurrent ?? null}
                                                delta={data?.metrics.medianClaimsDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.avgInterval}
                                                value={data?.metrics.avgIntervalCurrent ?? null}
                                                delta={data?.metrics.avgIntervalDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.wolfTx}
                                                value={data?.metrics.wolfTxCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.wolfTxDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.oneRefTx}
                                                value={data?.metrics.oneRefTxCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.oneRefTxDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.twoRefTx}
                                                value={data?.metrics.twoRefTxCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.twoRefTxDelta ?? null}
                                                format="number"
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Tab 3: 收益分析 */}
                                    <TabsContent value="revenue" className="space-y-4 pt-4">
                                        <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                            <StatisticCard
                                                title={t.ts.luckyDraws}
                                                value={data?.metrics.luckyDrawsCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.luckyDrawsDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.luckyDrawAmount}
                                                value={data?.metrics.luckyDrawAmountCurrent ?? null}
                                                unit="SHIT"
                                                delta={data?.metrics.luckyDrawAmountDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.luckyDrawAddresses}
                                                value={data?.metrics.luckyDrawAddressesCurrent ?? null}
                                                unit={t.common.count}
                                                delta={data?.metrics.luckyDrawAddressesDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.revenueWithoutReward}
                                                value={data?.metrics.revenueWithoutRewardCurrent ?? null}
                                                unit="SOL"
                                                delta={data?.metrics.revenueWithoutRewardDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.shitCostWithoutReward}
                                                value={data?.metrics.shitCostWithoutRewardCurrent ?? null}
                                                unit="SOL"
                                                delta={data?.metrics.shitCostWithoutRewardDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.roiWithoutReward}
                                                value={data?.metrics.roiWithoutRewardCurrent ?? null}
                                                delta={data?.metrics.roiWithoutRewardDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.rewardCount}
                                                value={data?.metrics.rewardCountCurrent ?? null}
                                                unit={t.common.times}
                                                delta={data?.metrics.rewardCountDelta ?? null}
                                                format="number"
                                            />
                                            <StatisticCard
                                                title={t.ts.rewardCost}
                                                value={data?.metrics.rewardCostCurrent ?? null}
                                                unit="SOL"
                                                delta={data?.metrics.rewardCostDelta ?? null}
                                                format="decimal"
                                            />
                                            <StatisticCard
                                                title={t.ts.roiWithReward}
                                                value={data?.metrics.roiWithRewardCurrent ?? null}
                                                delta={data?.metrics.roiWithRewardDelta ?? null}
                                                format="decimal"
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* 3 个 Tabs */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataAnalysis}</h2>
                                <Tabs defaultValue="trends" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="trends">{t.ts.trends}</TabsTrigger>
                                        <TabsTrigger value="heatmap">{t.ts.heatmap}</TabsTrigger>
                                        <TabsTrigger value="topUsers">{t.ts.topUsers}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="trends" className="space-y-4">
                                        <DualAxisLineChart
                                            title={t.ts.trends}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            leftAxis={{
                                                dataKey: "shitSent",
                                                name: "SHIT Sent",
                                                color: "#ec4899",
                                            }}
                                            rightAxis={{
                                                dataKey: "solReceived",
                                                name: "SOL Received",
                                                color: "#10b981",
                                            }}
                                            yLeftPrecision={0}
                                            yRightPrecision={1}
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="heatmap" className="space-y-4">
                                        {data?.heatmapData && data.heatmapData.dates.length > 0 ? (
                                            <Heatmap
                                                title={t.ts.heatmap}
                                                dates={data.heatmapData.dates}
                                                hours={data.heatmapData.hours}
                                                data={data.heatmapData.data}
                                                height={380}
                                            />
                                        ) : (
                                            <div className="h-80 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                                                <p className="text-muted-foreground">{t.common.noData}</p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="topUsers" className="space-y-4">
                                        <HorizontalBarChart
                                            title={t.ts.topUsers}
                                            data={data?.topUsers ?? []}
                                            nameKey="address"
                                            valueKey="txCount"
                                            fullAddressKey="fullAddress"
                                            color="#3b82f6"
                                            height={380}
                                            xAxisPrecision={0}
                                            labelPrecision={0}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* 重复 Claim 排行 */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.ts.repeatRanking}</h2>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted">
                                                <th className="px-4 py-2 text-left font-semibold">{t.common.rank}</th>
                                                <th className="px-4 py-2 text-left font-semibold">{t.common.address}</th>
                                                <th className="px-4 py-2 text-right font-semibold">{t.ts.claimCount}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.repeatRanking ?? []).length > 0 ? (
                                                data?.repeatRanking?.map((entry, idx) => (
                                                    <tr key={idx} className="border-b hover:bg-muted/50">
                                                        <td className="px-4 py-2">{idx + 1}</td>
                                                        <td className="px-4 py-2 font-mono text-xs">{entry.address}</td>
                                                        <td className="px-4 py-2 text-right">{entry.count}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
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
