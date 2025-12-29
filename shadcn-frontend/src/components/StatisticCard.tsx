import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatisticCardProps {
  title: string;
  value: number | null;
  unit?: string;
  delta?: number | null;
  format?: "number" | "decimal" | "percentage";
}

/**
 * 统计卡片组件 - 显示单个指标
 * 显示：标题、当前值、单位、变化率(带颜色和箭头)
 */
export function StatisticCard({
  title,
  value,
  unit,
  delta,
  format = "number",
}: StatisticCardProps) {
  // 格式化数值
  const formatValue = (num: number | null): string => {
    if (num === null || num === undefined) return "NA";
    if (format === "decimal") {
      return num.toFixed(2);
    } else if (format === "percentage") {
      return `${(num * 100).toFixed(2)}%`;
    } else {
      return num.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      });
    }
  };

  // 判断 delta 的颜色和图标
  const getDeltaStyle = (deltaValue: number | null | undefined) => {
    if (deltaValue === null || deltaValue === undefined) {
      return {
        color: "text-gray-500",
        icon: <Minus className="h-4 w-4" />,
        label: "NA",
      };
    }

    // Delta 统一显示为两位小数百分比，不带 +/- 符号（由图标和颜色表示）
    const formattedDelta = `${Math.abs(deltaValue).toFixed(2)}%`;

    if (deltaValue === 0) {
      return {
        color: "text-gray-500",
        icon: <Minus className="h-4 w-4" />,
        label: "0.00%",
      };
    }

    if (deltaValue > 0) {
      return {
        color: "text-green-600",
        icon: <ArrowUp className="h-4 w-4" />,
        label: formattedDelta,
      };
    }
    return {
      color: "text-red-600",
      icon: <ArrowDown className="h-4 w-4" />,
      label: formattedDelta,
    };
  };

  const deltaStyle = getDeltaStyle(delta);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* 标题 */}
          <p className="text-sm text-muted-foreground font-medium">{title}</p>

          {/* 主值 */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">
              {formatValue(value)}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>

          {/* 变化率 */}
          <div className={`flex items-center gap-1 ${deltaStyle.color}`}>
            {deltaStyle.icon}
            <span className="text-sm font-medium">{deltaStyle.label}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
