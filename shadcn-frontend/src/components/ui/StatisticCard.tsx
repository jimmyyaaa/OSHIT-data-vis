'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatisticCardProps {
  title: string
  value: number | string
  unit?: string
  delta?: number // 百分比变化
  format?: 'number' | 'decimal' | 'percentage'
}

/**
 * 统计卡片组件
 * 显示单个指标及其变化率
 */
export function StatisticCard({
  title,
  value,
  unit = '',
  delta,
  format = 'number',
}: StatisticCardProps) {
  // 格式化数值
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'decimal':
        return val.toLocaleString('en-US', { maximumFractionDigits: 2 })
      case 'percentage':
        return `${(val * 100).toFixed(2)}%`
      case 'number':
      default:
        return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
    }
  }

  const isPositive = delta ? delta > 0 : false
  const isNeutral = delta === 0

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        {/* 标题 */}
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        {/* 主数值 */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {formatValue(value)}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {/* 变化率 */}
        {delta !== undefined && (
          <div className="flex items-center gap-1 pt-2">
            <div
              className={`flex items-center gap-0.5 px-2 py-1 rounded text-sm font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : isNeutral
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUp className="w-4 h-4" />
              ) : !isNeutral ? (
                <ArrowDown className="w-4 h-4" />
              ) : null}
              <span>{Math.abs(delta).toFixed(2)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">vs 上期</span>
          </div>
        )}
      </div>
    </Card>
  )
}
