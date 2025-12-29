import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Spin, Button, Splitter } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { theme, getBarSeriesStyle, getLineSeriesStyle, formatDecimal, formatSOL, formatSOLNumber, getTooltipOption, getYAxisOption, cardStyles } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData } from '../services/dataService';
import { useAISummary } from '../hooks/useAISummary';
import { REVENUE_SYSTEM_PROMPT } from '../prompts/revenue';
import AISummarySidebar from './AISummarySidebar';

interface RevenueSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface RevenueMetrics {
    // Current period
    tsRevenueCurrent: number;
    posRevenueCurrent: number;
    stakingRevenueCurrent: number;
    shitCodeRevenueCurrent: number;
    totalRevenueCurrent: number;

    // Previous period
    tsRevenuePrev: number;
    posRevenuePrev: number;
    stakingRevenuePrev: number;
    shitCodeRevenuePrev: number;
    totalRevenuePrev: number;
}

interface ChartData {
    dates: string[];
    daily: {
        ts: number[];
        pos: number[];
        staking: number[];
        shitcode: number[];
    };
    cumulative: {
        ts: number[];
        pos: number[];
        staking: number[];
        shitcode: number[];
        total: number[];
    };
    composition: {
        name: string;
        value: number;
    }[];
}

const RevenueSection: React.FC<RevenueSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // AI Sidebar State
    const { aiVisible, setAiVisible, aiSummary, aiLoading, aiError, handleAnalyze } = useAISummary();

    useEffect(() => {
        if (data) {
            setIsCalculating(true);
            setTimeout(() => {
                calculateMetrics();
            }, 0);
        }
    }, [data, dateRange]);

    const calculateMetrics = () => {
        if (!data) return;

        const [startDate, endDate] = dateRange;

        // Filter data for current and previous periods
        const tsDataCurrent = data.TS_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const posDataCurrent = data.POS_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const stakingDataCurrent = data.Staking_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const shitCodeDataCurrent = data.ShitCode_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');

        const tsDataPrev = data.TS_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        const posDataPrev = data.POS_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        const stakingDataPrev = data.Staking_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        const shitCodeDataPrev = data.ShitCode_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        // Calculate revenues
        const tsRevenueCurrent = tsDataCurrent.reduce((sum, r) => sum + (r['SOL_Received'] || 0), 0);
        const posRevenueCurrent = posDataCurrent.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const stakingRevenueCurrent = stakingDataCurrent.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const shitCodeRevenueCurrent = shitCodeDataCurrent.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const totalRevenueCurrent = tsRevenueCurrent + posRevenueCurrent + stakingRevenueCurrent + shitCodeRevenueCurrent;

        const tsRevenuePrev = tsDataPrev.reduce((sum, r) => sum + (r['SOL_Received'] || 0), 0);
        const posRevenuePrev = posDataPrev.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const stakingRevenuePrev = stakingDataPrev.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const shitCodeRevenuePrev = shitCodeDataPrev.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
        const totalRevenuePrev = tsRevenuePrev + posRevenuePrev + stakingRevenuePrev + shitCodeRevenuePrev;

        setMetrics({
            tsRevenueCurrent, posRevenueCurrent, stakingRevenueCurrent, shitCodeRevenueCurrent, totalRevenueCurrent,
            tsRevenuePrev, posRevenuePrev, stakingRevenuePrev, shitCodeRevenuePrev, totalRevenuePrev,
        });

        // Prepare Chart Data
        const dailyMap = new Map<string, { ts: number; pos: number; staking: number; shitcode: number }>();

        const processData = (data: any[], key: string, valueKey: string) => {
            data.forEach((record) => {
                const date = dayjs(record['Timestamp(UTC+8)']).format('YYYY-MM-DD');
                const val = record[valueKey] || 0;
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { ts: 0, pos: 0, staking: 0, shitcode: 0 });
                }
                const entry = dailyMap.get(date)!;
                (entry as any)[key] += val;
            });
        };

        processData(tsDataCurrent, 'ts', 'SOL_Received');
        processData(posDataCurrent, 'pos', 'SOL Received');
        processData(stakingDataCurrent, 'staking', 'SOL Received');
        processData(shitCodeDataCurrent, 'shitcode', 'SOL Received');

        const sortedDates = Array.from(dailyMap.keys()).sort();
        const daily = {
            ts: sortedDates.map(d => dailyMap.get(d)!.ts),
            pos: sortedDates.map(d => dailyMap.get(d)!.pos),
            staking: sortedDates.map(d => dailyMap.get(d)!.staking),
            shitcode: sortedDates.map(d => dailyMap.get(d)!.shitcode),
        };

        // Cumulative
        let cumTs = 0, cumPos = 0, cumStaking = 0, cumShitcode = 0, cumTotal = 0;
        const cumulative = {
            ts: daily.ts.map(v => { cumTs += v; return cumTs; }),
            pos: daily.pos.map(v => { cumPos += v; return cumPos; }),
            staking: daily.staking.map(v => { cumStaking += v; return cumStaking; }),
            shitcode: daily.shitcode.map(v => { cumShitcode += v; return cumShitcode; }),
            total: daily.ts.map((_, i) => {
                const total = daily.ts[i] + daily.pos[i] + daily.staking[i] + daily.shitcode[i];
                cumTotal += total;
                return cumTotal;
            })
        };

        const composition = [
            { name: 'TS', value: tsRevenueCurrent },
            { name: 'POS', value: posRevenueCurrent },
            { name: 'Staking', value: stakingRevenueCurrent },
            { name: 'ShitCode', value: shitCodeRevenueCurrent },
        ];

        setChartData({
            dates: sortedDates,
            daily,
            cumulative,
            composition
        });

        setIsCalculating(false);
    };

    const handleRevenueAnalyze = async () => {
        if (!metrics || !chartData) return;

        const context = {
            metrics: {
                tsRevenue: metrics.tsRevenueCurrent,
                prev_tsRevenue: metrics.tsRevenuePrev,
                posRevenue: metrics.posRevenueCurrent,
                prev_posRevenue: metrics.posRevenuePrev,
                stakingRevenue: metrics.stakingRevenueCurrent,
                prev_stakingRevenue: metrics.stakingRevenuePrev,
                shitCodeRevenue: metrics.shitCodeRevenueCurrent,
                prev_shitCodeRevenue: metrics.shitCodeRevenuePrev,
                totalRevenue: metrics.totalRevenueCurrent,
                prev_totalRevenue: metrics.totalRevenuePrev,
            },
            dailyBreakdown: chartData.daily,
            composition: chartData.composition,
        };

        await handleAnalyze(context, REVENUE_SYSTEM_PROMPT);
    };

    const getCompositionOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `${params.name}: ${formatSOL(params.value)} (${formatDecimal(params.percent)}%)`;
                }
            },
            legend: {
                bottom: '0%',
                left: 'center',
                textStyle: { color: theme.colors.text }
            },
            series: [
                {
                    name: 'Revenue Source',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#000',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: theme.colors.text
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: chartData.composition,
                    color: [theme.colors.primary, theme.colors.secondary, '#fd79a8', '#fab1a0']
                }
            ]
        };
    };

    const getDailyOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: getTooltipOption(formatSOL),
            legend: {
                data: ['TS', 'POS', 'Staking', 'ShitCode'],
                textStyle: { color: theme.colors.text },
                top: 0
            },
            grid: theme.chart.grid,
            xAxis: {
                type: 'category',
                data: chartData.dates,
                axisLine: { lineStyle: { color: theme.colors.text } },
                axisLabel: { color: theme.colors.text }
            },
            yAxis: getYAxisOption(undefined, theme.colors.text, formatSOLNumber),
            series: [
                {
                    name: 'TS',
                    data: chartData.daily.ts,
                    ...getBarSeriesStyle(theme.colors.primary),
                    stack: 'total',
                },
                {
                    name: 'POS',
                    data: chartData.daily.pos,
                    ...getBarSeriesStyle(theme.colors.secondary),
                    stack: 'total',
                },
                {
                    name: 'Staking',
                    data: chartData.daily.staking,
                    ...getBarSeriesStyle('#fd79a8'),
                    stack: 'total',
                },
                {
                    name: 'ShitCode',
                    data: chartData.daily.shitcode,
                    ...getBarSeriesStyle('#fab1a0'),
                    stack: 'total',
                }
            ]
        };
    };

    const getCumulativeOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: getTooltipOption(formatSOL),
            grid: theme.chart.grid,
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: chartData.dates,
                axisLine: { lineStyle: { color: theme.colors.text } },
                axisLabel: { color: theme.colors.text }
            },
            yAxis: getYAxisOption(undefined, theme.colors.text, formatSOLNumber),
            series: [
                {
                    name: 'Total Cumulative Revenue',
                    data: chartData.cumulative.total,
                    ...getLineSeriesStyle(theme.colors.primary),
                }
            ]
        };
    };

    if (error) {
        return (
            <Alert
                title="数据加载错误"
                description={error}
                type="error"
                showIcon
                style={{ margin: 16 }}
            />
        );
    }

    if (isCalculating || (data && !metrics)) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <p style={{ marginTop: 16, color: theme.colors.text }}>
                    正在计算Revenue数据...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有收入数据"
                type="info"
                showIcon
                style={{ margin: 16 }}
            />
        );
    }

    const renderContent = () => (
        <div style={{ 
            overflowY: 'auto', 
            height: '100%',
            paddingRight: '8px'
        }}>
            <div style={{ padding: 24 }}>
                {/* Revenue Metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="TS 收入"
                            value={metrics?.tsRevenueCurrent || 0}
                            precision={2}
                            prevValue={metrics?.tsRevenuePrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="POS 收入"
                            value={metrics?.posRevenueCurrent || 0}
                            precision={2}
                            prevValue={metrics?.posRevenuePrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="Staking 收入"
                            value={metrics?.stakingRevenueCurrent || 0}
                            precision={2}
                            prevValue={metrics?.stakingRevenuePrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="ShitCode 收入"
                            value={metrics?.shitCodeRevenueCurrent || 0}
                            precision={2}
                            prevValue={metrics?.shitCodeRevenuePrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="总收入"
                            value={metrics?.totalRevenueCurrent || 0}
                            precision={2}
                            prevValue={metrics?.totalRevenuePrev}
                        />
                    </Col>
                </Row>

                {/* Charts */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card
                            title={<span style={{ color: theme.colors.primary }}>Revenue Composition</span>}
                            styles={{
                                root: cardStyles.root,
                                body: cardStyles.body,
                            }}
                            headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                        >
                            <ReactECharts option={getCompositionOption()} style={{ height: '300px' }} />
                        </Card>
                    </Col>
                    <Col xs={24} lg={16}>
                        <Card
                            title={<span style={{ color: theme.colors.text }}>Daily Revenue Breakdown</span>}
                            styles={{
                                root: cardStyles.root,
                                body: cardStyles.body,
                            }}
                            headStyle={{ borderBottom: '1px solid #333' }}
                        >
                            <ReactECharts option={getDailyOption()} style={{ height: '300px' }} />
                        </Card>
                    </Col>

                    <Col span={24}>
                        <Card
                            title={<span style={{ color: theme.colors.text }}>Cumulative Revenue Growth</span>}
                            styles={{
                                root: cardStyles.root,
                                body: cardStyles.body,
                            }}
                            headStyle={{ borderBottom: '1px solid #333' }}
                        >
                            <ReactECharts option={getCumulativeOption()} style={{ height: '300px' }} />
                        </Card>
                    </Col>

                </Row>
            </div>
        </div>
    );

    return (
        <div style={{ 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden' 
        }}>
            {/* Subheader */}
            <div style={{ 
                height: '48px', 
                flexShrink: 0,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0 24px',
                borderBottom: '2px solid #00FFFF',
                backgroundColor: '#000000',
            }}>
                <h2
                    style={{
                        color: theme.colors.primary,
                        marginTop: 0,
                        marginBottom: 0,
                        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        fontSize: '1.5rem',
                    }}
                >
                    SOL Revenue (UTC+8 00:00)
                </h2>
                <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    onClick={() => {
                        if (!aiVisible) {
                            handleRevenueAnalyze();
                        } else {
                            setAiVisible(false);
                        }
                    }}
                    loading={aiLoading}
                    style={{
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                        color: '#000',
                        fontWeight: 'bold'
                    }}
                >
                    {aiVisible ? '关闭' : 'AI 分析'}
                </Button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {aiVisible ? (
                    <Splitter style={{ height: '100%' }}>
                        <Splitter.Panel defaultSize="70%" min="40%" max="85%">
                            {renderContent()}
                        </Splitter.Panel>
                        <Splitter.Panel min="15%" max="60%">
                            <div style={{ height: '100%', overflow: 'hidden' }}>
                                <AISummarySidebar
                                    summary={aiSummary}
                                    loading={aiLoading}
                                    error={aiError}
                                />
                            </div>
                        </Splitter.Panel>
                    </Splitter>
                ) : (
                    renderContent()
                )}
            </div>
        </div>
    );
};

export default RevenueSection;