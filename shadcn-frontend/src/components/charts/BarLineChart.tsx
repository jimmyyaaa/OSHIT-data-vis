/**
 * 柱线混合图 (Bar-Line Mixed Chart)
 * 左侧柱状图，右侧折线图，各自独立的Y轴
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface BarLineChartProps {
    title?: string;
    data: any[];
    xAxisKey: string;
    barAxis: {
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
    xAxisPrecision?: number; // x轴精度，默认2
    yLeftPrecision?: number; // 左Y轴精度，默认2
    yRightPrecision?: number; // 右Y轴精度，默认2
    labelPrecision?: number; // 标签精度，默认2
}

export const BarLineChart: React.FC<BarLineChartProps> = ({
    title,
    data,
    xAxisKey,
    barAxis,
    lineAxis,
    height = 350,
    xAxisPrecision = 2,
    yLeftPrecision = 2,
    yRightPrecision = 2,
    labelPrecision = 2,
}) => {
    const { isDark } = useTheme();
    const chartRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!chartRef.current || !data.length) return;

        const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

        const xAxisData = data.map((item) => item[xAxisKey]);
        const barData = data.map((item) => item[barAxis.dataKey]);
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
                data: [barAxis.name, lineAxis.name],
                bottom: 10,
            },
            grid: {
                left: '5%',
                right: '5%',
                top: title ? '15%' : '10%',
                bottom: '15%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: xAxisData,
                axisLabel: {
                    interval: 0,
                    rotate: 45,
                    margin: 12,
                },
            },
            yAxis: [
                {
                    type: 'value',
                    name: barAxis.name,
                    position: 'left',
                    axisLabel: {
                        formatter: (value: number) => formatNumberCompact(value, yLeftPrecision),
                    },
                },
                {
                    type: 'value',
                    name: lineAxis.name,
                    position: 'right',
                    axisLabel: {
                        formatter: (value: number) => formatNumberCompact(value, yRightPrecision),
                    },
                },
            ],
            series: [
                {
                    name: barAxis.name,
                    type: 'bar',
                    data: barData,
                    yAxisIndex: 0,
                    itemStyle: {
                        color: barAxis.color || theme.colors?.[0],
                        borderRadius: [4, 4, 0, 0],
                    },
                    barWidth: '60%',
                },
                {
                    name: lineAxis.name,
                    type: 'line',
                    data: lineData,
                    yAxisIndex: 1,
                    lineStyle: {
                        color: lineAxis.color || theme.colors?.[1],
                        width: 2,
                    },
                    itemStyle: {
                        color: lineAxis.color || theme.colors?.[1],
                    },
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 4,
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
    }, [data, isDark, title, xAxisKey, barAxis, lineAxis, xAxisPrecision, yLeftPrecision, yRightPrecision, labelPrecision]);

    return (
        <Card className="p-4">
            <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
        </Card>
    );
};
