/**
 * 双柱线混合图 (Double Bar-Line Mixed Chart)
 * 左侧双柱状图，右侧折线图，各自独立的Y轴
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface DoubleBarLineChartProps {
    title?: string;
    data: any[];
    xAxisKey: string;
    bar1Axis: {
        dataKey: string;
        name: string;
        color?: string;
    };
    bar2Axis: {
        dataKey: string;
        name: string;
        color?: string;
    };
    lineAxis: {
        dataKey: string;
        name: string;
        color?: string;
    };
    height?: number;
    labelPrecision?: number;
}

export const DoubleBarLineChart: React.FC<DoubleBarLineChartProps> = ({
    title,
    data,
    xAxisKey,
    bar1Axis,
    bar2Axis,
    lineAxis,
    height = 350,
    labelPrecision = 2,
}) => {
    const { isDark } = useTheme();
    const chartRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!chartRef.current || !data.length) return;

        const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

        const xAxisData = data.map((item) => item[xAxisKey]);
        const bar1Data = data.map((item) => item[bar1Axis.dataKey]);
        const bar2Data = data.map((item) => item[bar2Axis.dataKey]);
        const lineData = data.map((item) => item[lineAxis.dataKey]);
        const theme = getEchartsTheme();

        const option: echarts.EChartsOption = {
            ...theme,
            title: title ? { text: title, left: 'center' } : undefined,
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    if (Array.isArray(params) && params.length > 0) {
                        const dateLine = params[0].name;
                        const seriesLines = params
                            .map(
                                (p) =>
                                    `${p.marker} ${p.seriesName}: <strong>${formatNumberCompact(p.value, labelPrecision)}</strong>`
                            )
                            .join('<br/>');
                        return `${dateLine}<br/>${seriesLines}`;
                    }
                    return '';
                },
            },
            legend: {
                data: [bar1Axis.name, bar2Axis.name, lineAxis.name],
                bottom: 10,
            },
            grid: {
                left: '5%',
                right: '5%',
                top: '15%',
                bottom: '10%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: xAxisData,
                axisLine: {
                    show: true,
                    lineStyle: { color: theme.textStyle?.color }
                },
                axisTick: { show: true },
                axisLabel: {
                    rotate: 45,
                    color: theme.textStyle?.color,
                    fontSize: 12,
                },
            },
            yAxis: [
                {
                    type: 'value',
                    position: 'left',
                    name: 'Volume (USDT)',
                    axisLabel: {
                        formatter: (value) => formatNumberCompact(value, 0),
                        color: theme.textStyle?.color,
                        fontSize: 12,
                    },
                },
                {
                    type: 'value',
                    position: 'right',
                    name: 'Net Flow (USDT)',
                    axisLabel: {
                        formatter: (value) => formatNumberCompact(value, 0),
                        color: theme.textStyle?.color,
                        fontSize: 12,
                    },
                },
            ],
            series: [
                {
                    type: 'bar',
                    name: bar1Axis.name,
                    data: bar1Data,
                    yAxisIndex: 0,
                    itemStyle: {
                        color: bar1Axis.color || '#3b82f6',
                    },
                },
                {
                    type: 'bar',
                    name: bar2Axis.name,
                    data: bar2Data,
                    yAxisIndex: 0,
                    itemStyle: {
                        color: bar2Axis.color || '#ec4899',
                    },
                },
                {
                    type: 'line',
                    name: lineAxis.name,
                    data: lineData,
                    yAxisIndex: 1,
                    smooth: true,
                    itemStyle: {
                        color: lineAxis.color || '#10b981',
                    },
                    lineStyle: {
                        color: lineAxis.color || '#10b981',
                        width: 2,
                    },
                },
            ],
        };

        chart.setOption(option);

        // 使用 ResizeObserver 监听容器大小变化
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
    }, [data, isDark, bar1Axis, bar2Axis, lineAxis, labelPrecision]);

    return (
        <Card className="p-4">
            <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
        </Card>
    );
};

export default DoubleBarLineChart;
