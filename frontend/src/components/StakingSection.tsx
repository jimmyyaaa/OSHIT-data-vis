import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { theme, getLineSeriesStyle, getGradientBarData, getValueAxisStyle, formatNumber, formatDecimal, getTooltipOption, getYAxisOption } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData } from '../services/dataService';

type DailyDataEntry = {
    date: string;
    stake: number;
    rewards: number;
};

type TopStaker = {
    address: string;
    fullAddress: string;
    amount: number;
};


interface StakingSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface StakingMetrics {
    totalStakeCurrent: number;
    totalUnstakeCurrent: number;
    netStakeCurrent: number;
    stakeCountCurrent: number;
    rewardCountCurrent: number;
    rewardAmountCurrent: number;
    totalStakePrev: number;
    totalUnstakePrev: number;
    netStakePrev: number;
    stakeCountPrev: number;
    rewardCountPrev: number;
    rewardAmountPrev: number;
}

const StakingSection: React.FC<StakingSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    
    const [metrics, setMetrics] = useState<StakingMetrics | null>(null);
    const [dailyData, setDailyData] = useState<DailyDataEntry[]>([]);
    const [topStakers, setTopStakers] = useState<TopStaker[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (data && data.Staking_Amount_Log && data.Staking_Log) {
            setIsCalculating(true);
            setTimeout(() => {
                calculateMetrics();
            }, 0);
        }
    }, [data, dateRange]);

    const calculateMetrics = () => {
        if (!data) return;

        const [startDate, endDate] = dateRange;
        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');

        // Current period data
        const stakingRecordsCurrent = data.Staking_Amount_Log.filter(
            (record) => {
                const recordDate = dayjs(record['Timestamp(UTC+8)']);
                return (
                    recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'))
                );
            }
        );

        const stakingRewardsCurrent = data.Staking_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(startDate.startOf('day')) &&
                recordDate.isBefore(endDate.endOf('day'))
            );
        });

        // Previous period data
        const stakingRecordsPrev = data.Staking_Amount_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(prevStartDate.startOf('day')) &&
                recordDate.isBefore(prevEndDate.endOf('day'))
            );
        });

        const stakingRewardsPrev = data.Staking_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(prevStartDate.startOf('day')) &&
                recordDate.isBefore(prevEndDate.endOf('day'))
            );
        });

        // Calculate current metrics
        const stakeMaskCurrent = stakingRecordsCurrent.filter(
            (r) => r.Type === 'STAKE'
        );
        const unstakeMaskCurrent = stakingRecordsCurrent.filter(
            (r) => r.Type === 'UNSTAKE'
        );

        const totalStakeCurrent = stakeMaskCurrent.reduce(
            (sum, r) => sum + r['SHIT Amount'],
            0
        );
        const totalUnstakeCurrent = unstakeMaskCurrent.reduce(
            (sum, r) => sum + r['SHIT Amount'],
            0
        );
        const netStakeCurrent = totalStakeCurrent - totalUnstakeCurrent;
        const stakeCountCurrent = stakeMaskCurrent.length;
        const rewardCountCurrent = stakingRewardsCurrent.length;
        const rewardAmountCurrent = stakingRewardsCurrent.reduce(
            (sum, r) => sum + r['SHIT Sent'],
            0
        );

        // Calculate previous metrics
        const stakeMaskPrev = stakingRecordsPrev.filter(
            (r) => r.Type === 'STAKE'
        );
        const unstakeMaskPrev = stakingRecordsPrev.filter(
            (r) => r.Type === 'UNSTAKE'
        );

        const totalStakePrev = stakeMaskPrev.reduce(
            (sum, r) => sum + r['SHIT Amount'],
            0
        );
        const totalUnstakePrev = unstakeMaskPrev.reduce(
            (sum, r) => sum + r['SHIT Amount'],
            0
        );
        const netStakePrev = totalStakePrev - totalUnstakePrev;
        const stakeCountPrev = stakeMaskPrev.length;
        const rewardCountPrev = stakingRewardsPrev.length;
        const rewardAmountPrev = stakingRewardsPrev.reduce(
            (sum, r) => sum + r['SHIT Sent'],
            0
        );

        setMetrics({
            totalStakeCurrent,
            totalUnstakeCurrent,
            netStakeCurrent,
            stakeCountCurrent,
            rewardCountCurrent,
            rewardAmountCurrent,
            totalStakePrev,
            totalUnstakePrev,
            netStakePrev,
            stakeCountPrev,
            rewardCountPrev,
            rewardAmountPrev,
        });

        // Prepare chart data after metrics are calculated
        prepareChartData();
        setIsCalculating(false);
    };

    const prepareChartData = () => {
        if (!data) return;

        const [startDate, endDate] = dateRange;

        // Daily stake and rewards data
        const dailyMap = new Map<string, { stake: number; rewards: number }>();

        // Process staking records
        data.Staking_Amount_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(startDate.startOf('day')) &&
                recordDate.isBefore(endDate.endOf('day'))
            );
        })
            .filter((r) => r.Type === 'STAKE')
            .forEach((record) => {
                const date = dayjs(record['Timestamp(UTC+8)']).format(
                    'YYYY-MM-DD'
                );
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { stake: 0, rewards: 0 });
                }
                dailyMap.get(date)!.stake += record['SHIT Amount'];
            });

        // Process rewards
        data.Staking_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(startDate.startOf('day')) &&
                recordDate.isBefore(endDate.endOf('day'))
            );
        }).forEach((record) => {
            const date = dayjs(record['Timestamp(UTC+8)']).format('YYYY-MM-DD');
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { stake: 0, rewards: 0 });
            }
            dailyMap.get(date)!.rewards += record['SHIT Sent'];
        });

        const chartData = Array.from(dailyMap.entries())
            .map(([date, values]) => ({
                date,
                stake: values.stake,
                rewards: values.rewards,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        setDailyData(chartData);

        // Top stakers
        const stakerMap = new Map<string, number>();
        data.Staking_Amount_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return (
                recordDate.isAfter(startDate.startOf('day')) &&
                recordDate.isBefore(endDate.endOf('day'))
            );
        })
            .filter((r) => r.Type === 'STAKE')
            .forEach((record) => {
                const current = stakerMap.get(record.Address) || 0;
                stakerMap.set(record.Address, current + record['SHIT Amount']);
            });

        const topStakersData = Array.from(stakerMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([address, amount]) => ({
                address: `${address.slice(0, 4)}...${address.slice(-4)}`,
                fullAddress: address,
                amount,
            }));

        setTopStakers(topStakersData);
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
                <p style={{ marginTop: 16, color: '#fff' }}>
                    正在计算Staking数据...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有Staking交易数据"
                type="info"
                showIcon
                style={{ margin: 16 }}
            />
        );
    }

    return (
        <div style={{ padding: 16 }}>
            <h2
                style={{
                    color: theme.colors.primary,
                    marginBottom: '24px',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontSize: '1.5rem',
                }}
            >
                Staking Data (UTC+8 00:00)
            </h2>

            {/* Metrics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="新增质押 (STAKE)"
                        value={metrics?.totalStakeCurrent || 0}
                        precision={2}
                        prevValue={metrics?.totalStakePrev}
                    />
                </Col>

                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="解除质押 (UNSTAKE)"
                        value={metrics?.totalUnstakeCurrent || 0}
                        precision={2}
                        prevValue={metrics?.totalUnstakePrev}
                    />
                </Col>

                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="净质押增长 (Net)"
                        value={metrics?.netStakeCurrent || 0}
                        precision={2}
                        prevValue={metrics?.netStakePrev}
                        useAbsoluteForChange={true}
                    />
                </Col>

                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="质押次数 (STAKE Only)"
                        value={metrics?.stakeCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.stakeCountPrev}
                    />
                </Col>

                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="奖励领取数"
                        value={metrics?.rewardCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.rewardCountPrev}
                    />
                </Col>

                <Col xs={24} sm={24} md={8} lg={8}>
                    <StatisticCard
                        title="奖励领取金额"
                        value={metrics?.rewardAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.rewardAmountPrev}
                    />
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card
                        title="每日质押 vs 奖励趋势"
                        style={theme.card}
                    >
                        <ReactECharts
                            option={{
                                backgroundColor: 'transparent',
                                tooltip: getTooltipOption(),
                                legend: {
                                    data: ['New Stake', 'Rewards Sent'],
                                    textStyle: { color: theme.colors.primary },
                                    top: 10
                                },
                                grid: theme.chart.grid,
                                xAxis: {
                                    type: 'category',
                                    data: dailyData.map(d => d.date),
                                    axisLabel: { color: theme.colors.primary, rotate: 45 },
                                    axisLine: { lineStyle: { color: theme.colors.primary } }
                                },
                                yAxis: [
                                    getYAxisOption('Stake Amount', theme.colors.primary),
                                    {
                                        ...getYAxisOption('Reward Amount', theme.colors.secondary),
                                        splitLine: { show: false }
                                    }
                                ],
                                series: [
                                    {
                                        name: 'New Stake',
                                        data: dailyData.map(d => d.stake),
                                        ...getLineSeriesStyle(theme.colors.primary),
                                    },
                                    {
                                        name: 'Rewards Sent',
                                        yAxisIndex: 1,
                                        data: dailyData.map(d => d.rewards),
                                        ...getLineSeriesStyle(theme.colors.secondary),
                                    }
                                ]
                            }}
                            style={{ height: '350px' }}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title="质押大户分布 (Top 10)"
                        style={theme.card}
                    >
                        <ReactECharts
                            option={{
                                backgroundColor: 'transparent',
                                tooltip: {
                                    trigger: 'axis',
                                    backgroundColor: theme.colors.tooltipBg,
                                    borderColor: theme.colors.primary,
                                    borderWidth: 1,
                                    textStyle: { color: theme.colors.primary },
                                    formatter: (params: any) => {
                                        const param = params[0];
                                        const data =
                                            topStakers[param.dataIndex];
                                        return `<div style="color: ${theme.colors.primary}; font-weight: bold;">${param.name}</div>
                                                <div style="color: #FFFF00;">Amount: ${formatDecimal(param.value)}</div>
                                                <div style="color: #888; font-size: 12px;">${data.fullAddress}</div>`;
                                    },
                                },
                                grid: theme.chart.grid,
                                xAxis: getValueAxisStyle('Stake Amount'),
                                yAxis: {
                                    type: 'category',
                                    inverse: true,
                                    data: topStakers.map((s) => s.address),
                                    axisLabel: {
                                        color: theme.colors.primary,
                                    },
                                    axisLine: {
                                        lineStyle: {
                                            color: theme.colors.primary,
                                        },
                                    },
                                },
                                series: [
                                    {
                                        type: 'bar',
                                        data: getGradientBarData(topStakers, 'amount'),
                                        barWidth: '60%',
                                        label: {
                                            show: true,
                                            position: 'right',
                                            formatter: (params: any) => formatNumber(params.value),
                                            color: theme.colors.primary,
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                        },
                                    },
                                ],
                            }}
                            style={{ height: '350px' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* AI analysis removed */}
        </div>
    );
};

export default StakingSection;
