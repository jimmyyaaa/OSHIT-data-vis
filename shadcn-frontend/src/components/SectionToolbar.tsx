import { useState, useEffect } from "react";
import { type DateRange } from "react-day-picker";
import { Calendar, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateRange } from "@/contexts/DateRangeContext";

interface SectionToolbarProps {
  onRefresh?: () => void;
  onAISummary?: () => void;
  isAISummaryOpen?: boolean;
  onToggleAISummary?: (isOpen: boolean) => void;
  isLoading?: boolean;
}

/**
 * Section 工具栏 - 复用于所有 Section 页面
 * 功能：日期范围选择(Calendar) + 刷新按钮 + AI 总结按钮
 * 日期状态由 DateRangeContext 管理，多个页面共享
 */
export function SectionToolbar({
  onRefresh,
  onAISummary,
  isAISummaryOpen = false,
  onToggleAISummary,
  isLoading = false,
}: SectionToolbarProps) {
  const { startDate, endDate, handleDateChange } = useDateRange();
  const today = new Date();

  // 从 Context 中的日期字符串转换为 Date 对象
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return {
        from: new Date(startDate),
        to: new Date(endDate),
      };
    }
    return undefined;
  });

  // 当 Context 中的日期改变时，更新本地 dateRange
  useEffect(() => {
    if (startDate && endDate) {
      setDateRange({
        from: new Date(startDate),
        to: new Date(endDate),
      });
    }
  }, [startDate, endDate]);

  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleDateRangeSelect = () => {
    if (dateRange?.from && dateRange?.to) {
      handleDateChange(dateRange.from, dateRange.to);
      setPopoverOpen(false); // 关闭 Popover
      console.log("日期已确认:", dateRange.from, "至", dateRange.to);
    }
  };

  const handleAISummaryToggle = () => {
    const newState = !isAISummaryOpen;
    if (onToggleAISummary) {
      onToggleAISummary(newState);
    }
    if (onAISummary && newState) {
      onAISummary();
    }
  };

  // 格式化日期显示
  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-background border-b shrink-0">
      {/* 左侧：日期范围选择 */}
      <div className="flex items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-56">
            <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(dateRange?.from)} - {formatDate(dateRange?.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={(date) =>
                  date > today || date < new Date(2025, 10, 1)
                }
                className="rounded-lg border"
              />
              <Button
                onClick={handleDateRangeSelect}
                className="w-full"
                size="sm"
              >
                确认
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 右侧：刷新和 AI 按钮 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
        <Button
          variant={isAISummaryOpen ? "default" : "outline"}
          size="sm"
          onClick={handleAISummaryToggle}
          disabled={isLoading}
          className={isAISummaryOpen ? "gap-2 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : "gap-2"}
        >
          <Sparkles className="h-4 w-4" />
          AI 分析
        </Button>
      </div>
    </div>
  );
}
