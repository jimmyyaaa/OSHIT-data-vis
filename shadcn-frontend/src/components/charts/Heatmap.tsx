/**
 * 热力图 (Heatmap)
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface HeatmapProps {
  title?: string;
  dates: string[];
  hours: string[] | number[];
  data: Array<[number, number, number]>; // [dateIndex, hourIndex, value]
  height?: number;
  color?: string[];
  tooltipPrecision?: number; // Tooltip精度，默认2
}

export const Heatmap: React.FC<HeatmapProps> = ({
  title,
  dates,
  hours,
  data,
  height = 350,
  color = ['#ffffff', '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
  tooltipPrecision = 2,
}) => {
  const { isDark } = useTheme();
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');
    const theme = getEchartsTheme();
    const maxValue = Math.max(...data.map((d) => d[2]));
    const minValue = Math.min(...data.map((d) => d[2]));

    const option: echarts.EChartsOption = {
      ...theme,
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.componentSubType === 'heatmap') {
            return `${dates[params.value[0]]}<br/>${hours[params.value[1]]}:00<br/>Value: <strong>${formatNumberCompact(params.value[2], tooltipPrecision)}</strong>`;
          }
          return '';
        },
      },
      grid: {
        left: '10%',
        right: '5%',
        top: title ? '15%' : '10%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          interval: 0,
          rotate: 45,
          margin: 12,
        },
      },
      yAxis: {
        type: 'category',
        data: hours.map((h) => `${h}:00`),
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        realtime: true,
        inRange: {
          color: color,
        },
        textStyle: {
          color: theme.textStyle?.color,
        },
      },
      series: [
        {
          type: 'heatmap',
          data: data,
          itemStyle: {
            borderRadius: 0,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
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
  }, [dates, hours, data, isDark, title, color, tooltipPrecision]);

  return (
    <Card className="p-4">
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </Card>
  );
};
