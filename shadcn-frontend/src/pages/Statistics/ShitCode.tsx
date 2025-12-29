/**
 * ShitCode 统计页面
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
import {
  fetchShitcodeData,
  loadData,
} from "@/services/dataService";

interface ShitCodeMetrics {
  claimCountCurrent: number | null;
  claimAmountCurrent: number | null;
  uniqueAddressesCurrent: number | null;
  avgClaimPerAddressCurrent: number | null;
  claimCountDelta: number | null;
  claimAmountDelta: number | null;
  uniqueAddressesDelta: number | null;
  avgClaimPerAddressDelta: number | null;
}

interface DailyShitCodeDataEntry {
  date: string;
  claimCount: number;
  claimAmount: number;
  solReceived: number;
}

interface TopShitCodeUser {
  address: string;
  fullAddress: string;
  claimCount: number;
  claimAmount: number;
}

interface ShitCodeData {
  metrics: ShitCodeMetrics;
  dailyData: DailyShitCodeDataEntry[];
  topUsers: TopShitCodeUser[];
}

export default function ShitCodePage() {
  const [data, setData] = useState<ShitCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const { startDate, endDate } = useDateRange();

  // 获取数据的通用函数
  const fetchData = async (start: string, end: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📊 获取 ShitCode 数据: ${start} 至 ${end}`);
      const result = await fetchShitcodeData(start, end);
      setData(result as ShitCodeData);
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

  // 指标配置 - 主要指标（前 3 个 + 额外指标）
  const mainMetricsConfig = [
    { 
      currentKey: "claimCountCurrent", 
      deltaKey: "claimCountDelta",
      title: "Claim 总数", 
      unit: "次" 
    },
    { 
      currentKey: "claimAmountCurrent", 
      deltaKey: "claimAmountDelta",
      title: "Claim 总额", 
      unit: "SHIT" 
    },
    { 
      currentKey: "uniqueAddressesCurrent", 
      deltaKey: "uniqueAddressesDelta",
      title: "独立地址", 
      unit: "个" 
    },
    { 
      currentKey: "avgClaimPerAddressCurrent", 
      deltaKey: "avgClaimPerAddressDelta",
      title: "平均 Claim", 
      unit: "SHIT" 
    },
  ];

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
                <h2 className="text-xl font-bold mb-4">数据分析</h2>
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
              {/* 指标网格 - 前 3 个主要指标，一行 3 列 */}
              <div>
                <h2 className="text-xl font-bold mb-4">关键指标</h2>
                <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
                  {mainMetricsConfig.map((metric) => (
                    <StatisticCard
                      key={metric.currentKey}
                      title={metric.title}
                      value={data?.metrics[metric.currentKey as keyof ShitCodeMetrics] ?? null}
                      unit={metric.unit}
                      delta={data?.metrics[metric.deltaKey as keyof ShitCodeMetrics] ?? null}
                      format={metric.title.includes("平均") ? "decimal" : "number"}
                    />
                  ))}
                </div>
              </div>

              {/* 数据分析 Tabs */}
              <div>
                <h2 className="text-xl font-bold mb-4">数据分析</h2>
                <Tabs defaultValue="trend" className="w-full">
                  <TabsList>
                    <TabsTrigger value="trend">每日领取 vs SOL 收入</TabsTrigger>
                    <TabsTrigger value="topUsers">Top 10 羊毛党</TabsTrigger>
                  </TabsList>

                  <TabsContent value="trend" className="space-y-4">
                    <BarLineChart
                      title="每日领取次数 vs SOL 收入"
                      data={data?.dailyData ?? []}
                      xAxisKey="date"
                      barAxis={{
                        dataKey: "claimCount",
                        name: "Claims",
                        color: "#3b82f6"
                      }}
                      lineAxis={{
                        dataKey: "solReceived",
                        name: "SOL Revenue",
                        color: "#ec4899"
                      }}
                      yLeftPrecision={0}
                      yRightPrecision={2}
                      height={380}
                    />
                  </TabsContent>

                  <TabsContent value="topUsers" className="space-y-4">
                    <HorizontalBarChart
                      title="Top 10 羊毛党（按领取次数）"
                      data={data?.topUsers ?? []}
                      nameKey="address"
                      valueKey="claimCount"
                      fullAddressKey="fullAddress"
                      color="#3b82f6"
                      height={380}
                      xAxisPrecision={0}
                      labelPrecision={0}
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
