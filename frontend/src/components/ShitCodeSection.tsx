import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Table, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { theme, getBarSeriesStyle, getLineSeriesStyle, getGradientBarData, getValueAxisStyle, formatNumber, formatDecimal, formatSOL, formatSOLNumber, getTooltipOption, getYAxisOption } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData, ShitCodeRecordEntry } from '../services/dataService';

type DailyShitCodeDataEntry = {
    date: string;
    claimCount: number;
    solRevenue: number;
};

type TopShitCodeUser = {
    address: string;
    fullAddress: string;
    claimCount: number;
    shitReceived: number;
};

interface ShitCodeSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface ShitCodeMetrics {
    // Current period
    claimCountCurrent: number;
    claimAmountCurrent: number;
    uniqueAddressesCurrent: number;
    repeatRateCurrent: number;

    // Previous period
    claimCountPrev: number;
    claimAmountPrev: number;
    uniqueAddressesPrev: number;
    repeatRatePrev: number;
}

const ShitCodeSection: React.FC<ShitCodeSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    const [metrics, setMetrics] = useState<ShitCodeMetrics | null>(null);
    const [dailyData, setDailyData] = useState<DailyShitCodeDataEntry[]>([]);
    const [topUsers, setTopUsers] = useState<TopShitCodeUser[]>([]);
    const [addressDistribution, setAddressDistribution] = useState<Array<{ address: string; count: number }>>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (data && data.ShitCode_Log) {
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
        const shitCodeDataCurrent = data.ShitCode_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                   recordDate.isBefore(endDate.endOf('day'));
        });

        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');

        const shitCodeDataPrev = data.ShitCode_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                   recordDate.isBefore(prevEndDate.endOf('day'));
        });

        // Current period calculations
        const claimCountCurrent = shitCodeDataCurrent.length;
        const claimAmountCurrent = shitCodeDataCurrent.reduce((sum, r) => sum + r['SHIT Sent'], 0);
        const uniqueAddressesCurrent = new Set(shitCodeDataCurrent.map(r => r['Receiver Address'])).size;
        const repeatRateCurrent = addressRepeatRateVsYesterday(data.ShitCode_Log, startDate);

        // Previous period calculations
        const claimCountPrev = shitCodeDataPrev.length;
        const claimAmountPrev = shitCodeDataPrev.reduce((sum, r) => sum + r['SHIT Sent'], 0);
        const uniqueAddressesPrev = new Set(shitCodeDataPrev.map(r => r['Receiver Address'])).size;
        const repeatRatePrev = addressRepeatRateVsYesterday(data.ShitCode_Log, prevStartDate);

        setMetrics({
            claimCountCurrent, claimAmountCurrent, uniqueAddressesCurrent, repeatRateCurrent,
            claimCountPrev, claimAmountPrev, uniqueAddressesPrev, repeatRatePrev,
        });

        // Calculate address distribution
        setAddressDistribution(calculateAddressDistribution(shitCodeDataCurrent));
        
        // Prepare chart data
        prepareChartData(shitCodeDataCurrent);
        
        setIsCalculating(false);
    };

    const prepareChartData = (shitCodeData: ShitCodeRecordEntry[]) => {
        // 1. Daily Aggregation (Claims vs Revenue)
        const dailyMap = new Map<string, { claimCount: number; solRevenue: number }>();
        
        shitCodeData.forEach(record => {
            const date = dayjs(record['Timestamp(UTC+8)']).format('YYYY-MM-DD');
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { claimCount: 0, solRevenue: 0 });
            }
            
            const entry = dailyMap.get(date)!;
            entry.claimCount += 1;
            entry.solRevenue += record['SOL Received'] || 0;
        });

        const sortedDailyData = Array.from(dailyMap.entries())
            .map(([date, values]) => ({
                date,
                ...values
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
            
        setDailyData(sortedDailyData);

        // 2. Top Users (Most Claims)
        const userMap = new Map<string, { claimCount: number; shitReceived: number }>();
        
        shitCodeData.forEach(record => {
            const address = record['Receiver Address'];
            if (!userMap.has(address)) {
                userMap.set(address, { claimCount: 0, shitReceived: 0 });
            }
            
            const entry = userMap.get(address)!;
            entry.claimCount += 1;
            entry.shitReceived += record['SHIT Sent'] || 0;
        });

        const sortedTopUsers = Array.from(userMap.entries())
            .map(([address, values]) => ({
                address: `${address.slice(0, 4)}...${address.slice(-4)}`,
                fullAddress: address,
                ...values
            }))
            .sort((a, b) => b.claimCount - a.claimCount)
            .slice(0, 10);
            
        setTopUsers(sortedTopUsers);
    };

    const addressRepeatRateVsYesterday = (fullData: ShitCodeRecordEntry[], selectedDate: dayjs.Dayjs): number => {
        const yesterday = selectedDate.subtract(1, 'day');

        // Get yesterday and today data
        const dataToday = fullData.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isSame(selectedDate, 'day');
        });

        const dataYesterday = fullData.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isSame(yesterday, 'day');
        });

        if (dataYesterday.length === 0) {
            return 0;
        }

        // Get address sets
        const todayAddresses = new Set(dataToday.map(r => r['Receiver Address']));
        const yesterdayAddresses = new Set(dataYesterday.map(r => r['Receiver Address']));

        // Calculate repeat addresses (intersection)
        const repeatAddresses = new Set([...todayAddresses].filter(addr => yesterdayAddresses.has(addr)));

        // Repeat rate = repeat addresses count / yesterday addresses count
        return repeatAddresses.size / yesterdayAddresses.size;
    };

    const calculateAddressDistribution = (data: ShitCodeRecordEntry[]) => {
        // Group by receiver address and count transactions
        const addressMap = new Map<string, number>();

        data.forEach(record => {
            const address = record['Receiver Address'];
            addressMap.set(address, (addressMap.get(address) || 0) + 1);
        });

        // Convert to array and sort by transaction count descending
        return Array.from(addressMap.entries())
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count);
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
                    正在计算SHIT Code数据...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有SHIT Code交易数据"
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
                SHIT Code Data (UTC+8 00:00)
            </h2>
                {/* Row 1: Basic metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="领取次数"
                            value={metrics?.claimCountCurrent || 0}
                            prevValue={metrics?.claimCountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="领取金额"
                            value={metrics?.claimAmountCurrent || 0}
                            prevValue={metrics?.claimAmountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="地址参与数"
                            value={metrics?.uniqueAddressesCurrent || 0}
                            prevValue={metrics?.uniqueAddressesPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={6}>
                        <StatisticCard
                            title="地址重复率（vs昨天）"
                            value={(metrics?.repeatRateCurrent || 0) * 100}
                            precision={2}
                            prevValue={(metrics?.repeatRatePrev || 0) * 100}
                            useAbsoluteForChange={true}
                        />
                    </Col>
                </Row>

                {/* Charts Row 1: Daily Claims vs Revenue */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card
                            title="每日领取次数 vs SOL 收入"
                            style={theme.card}
                        >
                            <ReactECharts
                                option={{
                                    backgroundColor: 'transparent',
                                    tooltip: getTooltipOption(formatSOL),
                                    legend: {
                                        data: ['Claims', 'SOL Revenue'],
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
                                        getYAxisOption('Claims', theme.colors.primary),
                                        {
                                            ...getYAxisOption('SOL', theme.colors.secondary, formatSOLNumber),
                                            splitLine: { show: false }
                                        }
                                    ],
                                    series: [
                                        {
                                            name: 'Claims',
                                            data: dailyData.map(d => d.claimCount),
                                            ...getBarSeriesStyle(theme.colors.primary),
                                        },
                                        {
                                            name: 'SOL Revenue',
                                            yAxisIndex: 1,
                                            data: dailyData.map(d => d.solRevenue),
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
                            title="Top 10 羊毛党 (按领取次数)"
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
                                            const data = topUsers[param.dataIndex];
                                            return `<div style="color: ${theme.colors.primary}; font-weight: bold;">${param.name}</div>
                                                    <div style="color: #FFFF00;">Claims: ${data.claimCount}</div>
                                                    <div style="color: ${theme.colors.secondary};">SHIT Received: ${formatDecimal(data.shitReceived)}</div>
                                                    <div style="color: #888; font-size: 12px;">${data.fullAddress}</div>`;
                                        }
                                    },
                                    grid: theme.chart.grid,
                                    xAxis: getValueAxisStyle('Claims'),
                                    yAxis: {
                                        type: 'category',
                                        inverse: true,
                                        data: topUsers.map(u => u.address),
                                        axisLabel: { color: theme.colors.primary },
                                        axisLine: { lineStyle: { color: theme.colors.primary } }
                                    },
                                    series: [{
                                        type: 'bar',
                                        data: getGradientBarData(topUsers, 'claimCount'),
                                        barWidth: '60%',
                                        label: {
                                            show: true,
                                            position: 'right',
                                            formatter: (params: any) => formatNumber(params.value),
                                            color: theme.colors.primary,
                                            fontSize: 10,
                                            fontWeight: 'bold'
                                        }
                                    }]
                                }}
                                style={{ height: '350px' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Address Distribution Table */}
                <Card
                    title={
                        <span style={{ color: theme.colors.text, fontSize: '16px' }}>
                            每个地址领取次数分布
                        </span>
                    }
                    style={theme.card}
                >
                    {addressDistribution.length > 0 ? (
                        <Table
                            dataSource={addressDistribution}
                            columns={[
                                {
                                    title: '地址',
                                    dataIndex: 'address',
                                    key: 'address',
                                    ellipsis: true,
                                    width: '70%',
                                },
                                {
                                    title: '领取次数',
                                    dataIndex: 'count',
                                    key: 'count',
                                    width: '30%',
                                    sorter: (a, b) => b.count - a.count,
                                },
                            ]}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            size="small"
                            style={{
                                background: 'transparent',
                            }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            无地址分布数据
                        </div>
                    )}
                </Card>
            </div>
        );
    };

export default ShitCodeSection;