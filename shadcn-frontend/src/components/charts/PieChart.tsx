/**
 * 饼图 (Pie Chart)
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface PieChartProps {
  title?: string;
  data: any[];
  nameKey: string;
  valueKey: string;
  height?: number;
  showLabel?: boolean;
  labelPrecision?: number; // 标签精度，默认2
}

export const StyledPieChart: React.FC<PieChartProps> = ({
  title,
  data,
  nameKey,
  valueKey,
  height = 350,
  showLabel = true,
  labelPrecision = 2,
}) => {
  const { isDark } = useTheme();
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');
    const theme = getEchartsTheme();
    
    // 使用四个不同颜色
    const colors = ['#0984e3', '#fd79a8', '#f39c12', '#fab1a0'];

    const pieData = data.map((item, index) => ({
      value: item[valueKey],
      name: item[nameKey],
      itemStyle: {
        color: colors[index % colors.length],
      },
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      textStyle: theme.textStyle,
      title: title ? { text: title, left: 'center', textStyle: { color: theme.title?.textStyle?.color, fontSize: 14 } } : undefined,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.componentSubType === 'pie') {
            const percent = ((params.value / data.reduce((sum, item) => sum + item[valueKey], 0)) * 100).toFixed(2);
            return `${params.name}: <strong>${formatNumberCompact(params.value, labelPrecision)}</strong> (${percent}%)`;
          }
          return '';
        },
      },
      legend: {
        bottom: '0%',
        left: 'center',
        data: data.map((item) => item[nameKey]),
        textStyle: theme.textStyle,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'],
          data: pieData,
          avoidLabelOverlap: false,
          label: showLabel
            ? {
                show: false,
                position: 'center',
                formatter: (params: any) => {
                  const percent = ((params.value / data.reduce((sum, item) => sum + item[valueKey], 0)) * 100).toFixed(2);
                  return `${params.name}\n${percent}%`;
                },
                fontSize: 12,
              }
            : undefined,
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
              color: theme.textStyle?.color || '#000',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          labelLine: {
            show: false,
          },
        },
      ],
    };

    chart.setOption(option);
    
    // 使用 ResizeObserver 监听容器大小变化，而不是 window resize
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data, isDark, title, nameKey, valueKey, showLabel, labelPrecision]);

  return (
    <Card className="p-4">
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </Card>
  );
};
