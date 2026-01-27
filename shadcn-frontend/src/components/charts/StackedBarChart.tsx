/**
 * 竖向堆叠柱状图 (Stacked Bar Chart)
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface StackedBarChartProps {
    title?: string;
    data: any[];
    xAxisKey: string;
    series: Array<{
        dataKey: string;
        name: string;
        color?: string;
    }>;
    height?: number;
    yAxisPrecision?: number; // Y轴精度，默认2
    labelPrecision?: number; // 标签精度，默认2
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
    title,
    data,
    xAxisKey,
    series,
    height = 350,
    yAxisPrecision = 2,
    labelPrecision = 2,
}) => {
    const { isDark } = useTheme();
    const chartRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!chartRef.current || !data.length) return;

        const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');
        const theme = getEchartsTheme();
        const chartColorPalette = theme.colors || [];

        const xAxisData = data.map((item) => item[xAxisKey]);
        const seriesData = series.map((s, index) => ({
            name: s.name,
            type: 'bar',
            stack: 'total',
            data: data.map((item) => item[s.dataKey]),
            itemStyle: {
                color: s.color || chartColorPalette[index % chartColorPalette.length],
                borderRadius: index === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0],
            },
        }));

        const option: echarts.EChartsOption = {
            ...theme,
            title: title ? { text: title, left: 'center' } : undefined,
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    if (Array.isArray(params) && params.length > 0) {
                        const dateLine = params[0].name;
                        const seriesLines = params.map((p) => {
                            const value = p.value !== undefined && p.value !== null ? p.value : 0;
                            return `${p.marker} ${p.seriesName}: <strong>${formatNumberCompact(value, labelPrecision)}</strong>`;
                        }).join('<br/>');
                        return `${dateLine}<br/>${seriesLines}`;
                    }
                    return '';
                },
            },
            legend: { data: series.map((s) => s.name), bottom: 10 },
            grid: { left: '5%', right: '5%', top: title ? '15%' : '10%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', data: xAxisData, axisLabel: { interval: 0, rotate: 45, margin: 12 } },
            yAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatNumberCompact(value, yAxisPrecision) } },
            series: seriesData as any,
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
    }, [data, isDark, title, xAxisKey, series, yAxisPrecision, labelPrecision]);

    return (
        <Card className="p-4">
            <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
        </Card>
    );
};
