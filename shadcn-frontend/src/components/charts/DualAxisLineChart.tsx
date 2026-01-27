/**
 * 双轴线图 (Dual Axis Line Chart)
 * 左侧一条线，右侧一条线，各自独立的Y轴
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumberCompact, getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface DualAxisLineChartProps {
    title?: string;
    data: any[];
    xAxisKey: string;
    leftAxis: {
        dataKey: string;
        name: string;
        color?: string;
    };
    rightAxis: {
        dataKey: string;
        name: string;
        color?: string;
    };
    height?: number;
    yLeftPrecision?: number; // 左Y轴精度，默认2
    yRightPrecision?: number; // 右Y轴精度，默认2
}

export const DualAxisLineChart: React.FC<DualAxisLineChartProps> = ({
    title,
    data,
    xAxisKey,
    leftAxis,
    rightAxis,
    height = 350,
    yLeftPrecision = 2,
    yRightPrecision = 2,
}) => {
    const { isDark } = useTheme();
    const chartRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!chartRef.current || !data.length) return;

        const chart = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

        const xAxisData = data.map((item) => item[xAxisKey]);
        const leftData = data.map((item) => item[leftAxis.dataKey]);
        const rightData = data.map((item) => item[rightAxis.dataKey]);
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
                                    `${p.marker} ${p.seriesName}: <strong>${formatNumberCompact(p.value, 2)}</strong>`
                            )
                            .join('<br/>');
                        return `${dateLine}<br/>${seriesLines}`;
                    }
                    return '';
                },
            },
            legend: {
                data: [leftAxis.name, rightAxis.name],
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
                    formatter: (value: string) => {
                        // 假设格式是 YYYY-MM-DD，转换为 MM-DD
                        if (typeof value === 'string' && value.includes('-')) {
                            const parts = value.split('-');
                            return `${parts[1]}-${parts[2]}`;
                        }
                        return value;
                    },
                },
            },
            yAxis: [
                {
                    type: 'value',
                    name: leftAxis.name,
                    position: 'left',
                    scale: true,  // 自动选择范围
                    axisLabel: {
                        formatter: (value: number) => formatNumberCompact(value, yLeftPrecision),
                    },
                },
                {
                    type: 'value',
                    name: rightAxis.name,
                    position: 'right',
                    scale: true,  // 自动选择范围
                    axisLabel: {
                        formatter: (value: number) => formatNumberCompact(value, yRightPrecision),
                    },
                },
            ],
            series: [
                {
                    name: leftAxis.name,
                    type: 'line',
                    data: leftData,
                    yAxisIndex: 0,
                    lineStyle: {
                        color: leftAxis.color || theme.colors?.[0],
                        width: 2,
                    },
                    itemStyle: {
                        color: leftAxis.color || theme.colors?.[0],
                    },
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 4,
                },
                {
                    name: rightAxis.name,
                    type: 'line',
                    data: rightData,
                    yAxisIndex: 1,
                    lineStyle: {
                        color: rightAxis.color || theme.colors?.[1],
                        width: 2,
                    },
                    itemStyle: {
                        color: rightAxis.color || theme.colors?.[1],
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
    }, [data, isDark, title, xAxisKey, leftAxis, rightAxis, yLeftPrecision, yRightPrecision]);

    return (
        <Card className="p-4">
            <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
        </Card>
    );
};
