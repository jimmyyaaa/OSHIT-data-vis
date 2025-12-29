/**
 * 横向柱状图 (Horizontal Bar Chart)
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface HorizontalBarChartProps {
  title?: string;
  data: any[];
  nameKey: string;
  valueKey: string;
  fullAddressKey?: string; // 可选：完整地址的key
  color?: string;
  height?: number;
  xAxisPrecision?: number; // x轴精度，默认2
  labelPrecision?: number; // 柱子标签精度，默认2
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  data,
  nameKey,
  valueKey,
  fullAddressKey,
  color = '#3b82f6',
  height = 350,
  xAxisPrecision = 2,
  labelPrecision = 2,
}) => {
  const { isDark } = useTheme();
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');
    const theme = getEchartsTheme();

    // 按值从大到小排序，大数在上方
    const sortedData = [...data].sort((a, b) => b[valueKey] - a[valueKey]);

    const option: echarts.EChartsOption = {
      ...theme,
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (Array.isArray(params) && params[0]) {
            const dataIndex = params[0].dataIndex;
            const item = sortedData[dataIndex];
            const displayAddress = fullAddressKey && item[fullAddressKey] ? item[fullAddressKey] : params[0].name;
            return `<strong>${displayAddress}</strong><br/>数量: <strong>${formatNumberCompact(params[0].value, labelPrecision)}</strong>`;
          }
          return '';
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        top: title ? '15%' : '10%',
        bottom: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => formatNumberCompact(value, xAxisPrecision),
        },
      },
      yAxis: {
        type: 'category',
        data: sortedData.map((item) => item[nameKey]),
      },
      series: [
        {
          type: 'bar',
          data: sortedData.map((item) => item[valueKey]),
          itemStyle: {
            color: color || theme.colors?.[0],
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => formatNumberCompact(params.value, labelPrecision),
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
  }, [data, isDark, title, nameKey, valueKey, fullAddressKey, color, xAxisPrecision, labelPrecision]);

  return (
    <Card className="p-4">
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </Card>
  );
};
