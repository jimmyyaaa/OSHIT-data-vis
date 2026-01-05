/**
 * Staking 统计页面
 * 真实数据集成 - 调用后端 API 获取数据
 */

import { useState, useEffect } from "react";
import { SectionToolbar } from "@/components/SectionToolbar";
import { StatisticCard } from "@/components/StatisticCard";
import { AISummarySidebar } from "@/components/AISummarySidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DualAxisLineChart, HorizontalBarChart } from "@/components/charts";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    fetchStakingData,
    loadData,
} from "@/services/dataService";

interface StakingMetrics {
    totalStakeCurrent: number | null;
    totalStakePrev: number | null;
    totalStakeDelta: number | null;
    totalUnstakeCurrent: number | null;
    totalUnstakePrev: number | null;
    totalUnstakeDelta: number | null;
    netStakeCurrent: number | null;
    netStakePrev: number | null;
    netStakeDelta: number | null;
    stakeCountCurrent: number | null;
    stakeCountPrev: number | null;
    stakeCountDelta: number | null;
    rewardCountCurrent: number | null;
    rewardCountPrev: number | null;
    rewardCountDelta: number | null;
    rewardAmountCurrent: number | null;
    rewardAmountPrev: number | null;
    rewardAmountDelta: number | null;
}

interface DailyDataEntry {
    date: string;
    stake: number;
    rewards: number;
}

interface TopStaker {
    address: string;
    fullAddress: string;
    amount: number;
}

interface StakingData {
    metrics: StakingMetrics;
    dailyData: DailyDataEntry[];
    topStakers: TopStaker[];
}

export default function StakingPage() {
    const [data, setData] = useState<StakingData | null>(null);
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
            console.log(`📊 获取 Staking 数据: ${start} 至 ${end}`);
            const result = await fetchStakingData(start, end);
            setData(result as StakingData);
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
            await loadData(true); // 强制刷新缓存
            console.log("✅ 缓存刷新成功");
            // 刷新后重新获取数据
            await fetchData(startDate, endDate);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "刷新失败";
            setError(errorMsg);
            console.error("❌ 刷新失败:", errorMsg);
            setLoading(false);
        }
    };

    // 指标配置 - 映射到后端数据结构的平铺字段
    const metricsConfig = [
        {
            currentKey: "totalStakeCurrent",
            deltaKey: "totalStakeDelta",
            title: t.staking.totalStake,
            unit: "SHIT"
        },
        {
            currentKey: "totalUnstakeCurrent",
            deltaKey: "totalUnstakeDelta",
            title: t.staking.totalUnstake,
            unit: "SHIT"
        },
        {
            currentKey: "netStakeCurrent",
            deltaKey: "netStakeDelta",
            title: t.staking.netStake,
            unit: "SHIT"
        },
        {
            currentKey: "stakeCountCurrent",
            deltaKey: "stakeCountDelta",
            title: t.staking.stakeCount,
            unit: t.common.times
        },
        {
            currentKey: "rewardCountCurrent",
            deltaKey: "rewardCountDelta",
            title: t.staking.rewardCount,
            unit: t.common.times
        },
        {
            currentKey: "rewardAmountCurrent",
            deltaKey: "rewardAmountDelta",
            title: t.staking.rewardAmount,
            unit: "SHIT"
        },
    ];

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">

            {/* 工具栏 - 固定，不被压缩 */}
            <SectionToolbar
                title={t.sidebar.staking}
                onRefresh={handleRefresh}
                isAISummaryOpen={aiOpen}
                onToggleAISummary={setAiOpen}
                isLoading={loading}
            />

            {/* 可调整大小的内容区域 - AI 侧边栏在这里弹出 */}
            <AISummarySidebar
                isOpen={aiOpen}
                content="这是 AI 总结的 Placeholder。待集成真实 AI 功能后，这里会显示分析结果。"
                isLoading={false}
            >
                <div className="w-full h-full space-y-6 p-6">
                    {/* 错误告警 - 只显示错误信息，不显示其他内容 */}
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
                        // 加载状态 - 使用 Skeleton
                        <div className="space-y-6">
                            {/* 指标卡片骨架屏 */}
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

                            {/* 图表区域骨架屏 */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">{t.common.dataTrend}</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 border-b">
                                        <Skeleton className="h-10 w-20" />
                                        <Skeleton className="h-10 w-24" />
                                    </div>
                                    <Skeleton className="h-80 w-full" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 正常数据显示
                        <>
                            {/* 指标网格 - 3 列响应式 */}
                            <div className="w-full">
                                <h2 className="text-xl font-bold mb-4">{t.common.keyMetrics}</h2>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                                    {metricsConfig.map((metric) => (
                                        <StatisticCard
                                            key={metric.currentKey}
                                            title={metric.title}
                                            value={data?.metrics[metric.currentKey as keyof StakingMetrics] ?? null}
                                            unit={metric.unit}
                                            delta={data?.metrics[metric.deltaKey as keyof StakingMetrics] ?? null}
                                            format="number"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* 图表区域 - Tabs */}
                            <div className="w-full">
                                <h2 className="text-xl font-bold mb-4">{t.common.dataTrend}</h2>
                                <Tabs defaultValue="trend" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="trend">{t.staking.dailyTrend}</TabsTrigger>
                                        <TabsTrigger value="topStakers">{t.staking.topStakers}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="trend" className="space-y-4">
                                        <DualAxisLineChart
                                            title={t.staking.dailyTrend}
                                            data={data?.dailyData ?? []}
                                            xAxisKey="date"
                                            leftAxis={{
                                                dataKey: "stake",
                                                name: t.staking.stakeAmount,
                                                color: "#3b82f6"
                                            }}
                                            rightAxis={{
                                                dataKey: "rewards",
                                                name: t.staking.rewardAmount,
                                                color: "#ec4899"
                                            }}
                                            yLeftPrecision={0}
                                            yRightPrecision={0}
                                            height={380}
                                        />
                                    </TabsContent>

                                    <TabsContent value="topStakers" className="space-y-4">
                                        <HorizontalBarChart
                                            title={t.staking.topStakers}
                                            data={data?.topStakers ?? []}
                                            nameKey="address"
                                            valueKey="amount"
                                            fullAddressKey="fullAddress"
                                            color="#3b82f6"
                                            height={380}
                                            xAxisPrecision={0}
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
