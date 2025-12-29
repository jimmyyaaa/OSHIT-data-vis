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
                  <span className="text-lg font-semibold">❌ 错误</span>
                  <span>{error}</span>
                </AlertDescription>
              </Alert>
            </div>
          ) : loading ? (
            // 加载状态
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">关键指标</h2>
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
                <h2 className="text-xl font-bold mb-4">数据趋势</h2>
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
                <h2 className="text-xl font-bold mb-4">活跃用户</h2>
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
                <h2 className="text-xl font-bold mb-4">关键指标</h2>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList>
                    <TabsTrigger value="basic">基础统计</TabsTrigger>
                    <TabsTrigger value="behavior">用户行为</TabsTrigger>
                    <TabsTrigger value="revenue">收益分析</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: 基础统计 */}
                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatisticCard
                        title="交易总笔数"
                        value={data?.metrics.totalTxCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.totalTxDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="TS 领取数（剔除 Reference）"
                        value={data?.metrics.tsClaimCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.tsClaimDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="TS 交易总金额"
                        value={data?.metrics.totalAmountCurrent ?? null}
                        unit="SHIT"
                        delta={data?.metrics.totalAmountDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="地址参与数"
                        value={data?.metrics.uniqueAddressesCurrent ?? null}
                        unit="个"
                        delta={data?.metrics.uniqueAddressesDelta ?? null}
                        format="number"
                      />
                    </div>
                  </TabsContent>

                  {/* Tab 2: 用户行为 */}
                  <TabsContent value="behavior" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                      <StatisticCard
                        title="平均领取次数"
                        value={data?.metrics.meanClaimsCurrent ?? null}
                        delta={data?.metrics.meanClaimsDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="领取中位数"
                        value={data?.metrics.medianClaimsCurrent ?? null}
                        delta={data?.metrics.medianClaimsDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="平均时间间隔（分）"
                        value={data?.metrics.avgIntervalCurrent ?? null}
                        delta={data?.metrics.avgIntervalDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="独狼交易笔数"
                        value={data?.metrics.wolfTxCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.wolfTxDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="一层上级交易笔数"
                        value={data?.metrics.oneRefTxCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.oneRefTxDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="两层上级交易笔数"
                        value={data?.metrics.twoRefTxCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.twoRefTxDelta ?? null}
                        format="number"
                      />
                    </div>
                  </TabsContent>

                  {/* Tab 3: 收益分析 */}
                  <TabsContent value="revenue" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                      <StatisticCard
                        title="抽奖总次数"
                        value={data?.metrics.luckyDrawsCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.luckyDrawsDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="抽奖总金额"
                        value={data?.metrics.luckyDrawAmountCurrent ?? null}
                        unit="SHIT"
                        delta={data?.metrics.luckyDrawAmountDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="抽奖地址参与数"
                        value={data?.metrics.luckyDrawAddressesCurrent ?? null}
                        unit="个"
                        delta={data?.metrics.luckyDrawAddressesDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="TS 收入（SOL）- 不含奖励"
                        value={data?.metrics.revenueWithoutRewardCurrent ?? null}
                        unit="SOL"
                        delta={data?.metrics.revenueWithoutRewardDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="SHIT 成本（SOL）- 不含奖励"
                        value={data?.metrics.shitCostWithoutRewardCurrent ?? null}
                        unit="SOL"
                        delta={data?.metrics.shitCostWithoutRewardDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="ROI - 不含奖励"
                        value={data?.metrics.roiWithoutRewardCurrent ?? null}
                        delta={data?.metrics.roiWithoutRewardDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="奖励总次数"
                        value={data?.metrics.rewardCountCurrent ?? null}
                        unit="次"
                        delta={data?.metrics.rewardCountDelta ?? null}
                        format="number"
                      />
                      <StatisticCard
                        title="奖励成本（SOL）"
                        value={data?.metrics.rewardCostCurrent ?? null}
                        unit="SOL"
                        delta={data?.metrics.rewardCostDelta ?? null}
                        format="decimal"
                      />
                      <StatisticCard
                        title="ROI - 含奖励"
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
                <h2 className="text-xl font-bold mb-4">数据分析</h2>
                <Tabs defaultValue="trends" className="w-full">
                  <TabsList>
                    <TabsTrigger value="trends">趋势 (SHIT vs SOL)</TabsTrigger>
                    <TabsTrigger value="heatmap">热力图</TabsTrigger>
                    <TabsTrigger value="topUsers">Top 10 用户</TabsTrigger>
                  </TabsList>

                  <TabsContent value="trends" className="space-y-4">
                    <DualAxisLineChart
                      title="每日 SHIT 发放 vs SOL 收入"
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
                        title="每小时交易分布热力图"
                        dates={data.heatmapData.dates}
                        hours={data.heatmapData.hours}
                        data={data.heatmapData.data}
                        height={380}
                      />
                    ) : (
                      <div className="h-80 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                        <p className="text-muted-foreground">暂无热力图数据</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="topUsers" className="space-y-4">
                    <HorizontalBarChart
                      title="Top 10 活跃用户 (按交易次数)"
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
                <h2 className="text-xl font-bold mb-4">重复 Claim 排行</h2>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="px-4 py-2 text-left font-semibold">排名</th>
                        <th className="px-4 py-2 text-left font-semibold">地址</th>
                        <th className="px-4 py-2 text-right font-semibold">Claim 次数</th>
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
                            暂无数据
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
