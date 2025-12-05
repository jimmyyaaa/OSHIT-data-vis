import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Table, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { theme, getBarSeriesStyle, getLineSeriesStyle, getGradientBarData, getValueAxisStyle, formatNumber, formatDecimal, formatSOL, formatSOLNumber, getTooltipOption, getYAxisOption } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData, POSRecordEntry } from '../services/dataService';

type DailyPOSDataEntry = {
    date: string;
    shitSent: number;
    solReceived: number;
};

type TopPOSUser = {
    address: string;
    fullAddress: string;
    shitSent: number;
    txCount: number;
};

interface POSSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface POSMetrics {
    // Current period
    totalTxCurrent: number;
    totalAmountCurrent: number;
    maxAmountCurrent: number;
    minAmountCurrent: number;
    totalRevenueCurrent: number;
    emissionEfficiencyCurrent: number;
    avgRewardCurrent: number;

    // Previous period
    totalTxPrev: number;
    totalAmountPrev: number;
    maxAmountPrev: number;
    minAmountPrev: number;
    totalRevenuePrev: number;
    emissionEfficiencyPrev: number;
    avgRewardPrev: number;
}

const POSSection: React.FC<POSSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    const [metrics, setMetrics] = useState<POSMetrics | null>(null);
    const [dailyData, setDailyData] = useState<DailyPOSDataEntry[]>([]);
    const [topUsers, setTopUsers] = useState<TopPOSUser[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [duplicateAddresses, setDuplicateAddresses] = useState<Array<{ 'Receiver Address': string; Date: string; 'Transaction Count': number }>>([]);

    useEffect(() => {
        if (data && data.POS_Log) {
            setIsCalculating(true);
            setTimeout(() => {
                calculateMetrics();
            }, 0);
        }
    }, [data, dateRange]);

    const calculateMetrics = () => {
        if (!data) return;

        const [startDate, endDate] = dateRange;
        // POS uses noon 12pm (UTC+8) as day boundary
        const currentStart = startDate.hour(12).minute(0).second(0).millisecond(0);
        const currentEnd = endDate.add(1, 'day').hour(12).minute(0).second(0).millisecond(0);

        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');
        const prevStart = prevStartDate.hour(12).minute(0).second(0).millisecond(0);
        const prevEnd = prevEndDate.add(1, 'day').hour(12).minute(0).second(0).millisecond(0);

        // Filter data for current and previous periods
        const posDataCurrent = data.POS_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(currentStart) && recordDate.isBefore(currentEnd);
        });

        const posDataPrev = data.POS_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStart) && recordDate.isBefore(prevEnd);
        });

        // Helper for metrics
        const calcMetrics = (df: POSRecordEntry[]) => {
            const totalTx = df.length;
            const amounts = df.map(r => r['SHIT Sent']).filter(amount => amount > 0);
            const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
            const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
            const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
            
            const totalRevenue = df.reduce((sum, r) => sum + (r['SOL Received'] || 0), 0);
            const emissionEfficiency = totalRevenue > 0 ? totalAmount / totalRevenue : 0;
            const avgReward = totalTx > 0 ? totalAmount / totalTx : 0;

            return { totalTx, totalAmount, maxAmount, minAmount, totalRevenue, emissionEfficiency, avgReward };
        };

        const curr = calcMetrics(posDataCurrent);
        const prev = calcMetrics(posDataPrev);

        setMetrics({
            totalTxCurrent: curr.totalTx,
            totalAmountCurrent: curr.totalAmount,
            maxAmountCurrent: curr.maxAmount,
            minAmountCurrent: curr.minAmount,
            totalRevenueCurrent: curr.totalRevenue,
            emissionEfficiencyCurrent: curr.emissionEfficiency,
            avgRewardCurrent: curr.avgReward,

            totalTxPrev: prev.totalTx,
            totalAmountPrev: prev.totalAmount,
            maxAmountPrev: prev.maxAmount,
            minAmountPrev: prev.minAmount,
            totalRevenuePrev: prev.totalRevenue,
            emissionEfficiencyPrev: prev.emissionEfficiency,
            avgRewardPrev: prev.avgReward,
        });

        // Prepare chart data
        prepareChartData(posDataCurrent);

        // Calculate duplicate addresses
        setDuplicateAddresses(countAddressesByTxCount(posDataCurrent, 1));
        setIsCalculating(false);
    };

    const prepareChartData = (posData: POSRecordEntry[]) => {
        // 1. Daily Aggregation (Rewards vs Revenue)
        const dailyMap = new Map<string, { shitSent: number; solReceived: number }>();
        
        posData.forEach(record => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            // POS uses 12pm as day boundary
            const adjustedDate = recordDate.hour() < 12 
                ? recordDate.subtract(1, 'day').format('YYYY-MM-DD')
                : recordDate.format('YYYY-MM-DD');
                
            if (!dailyMap.has(adjustedDate)) {
                dailyMap.set(adjustedDate, { shitSent: 0, solReceived: 0 });
            }
            
            const entry = dailyMap.get(adjustedDate)!;
            entry.shitSent += record['SHIT Sent'] || 0;
            entry.solReceived += record['SOL Received'] || 0;
        });

        const sortedDailyData = Array.from(dailyMap.entries())
            .map(([date, values]) => ({
                date,
                ...values
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
            
        setDailyData(sortedDailyData);

        // 2. Top Users (Whale Watch)
        const userMap = new Map<string, { shitSent: number; txCount: number }>();
        
        posData.forEach(record => {
            const address = record['Receiver Address'];
            if (!userMap.has(address)) {
                userMap.set(address, { shitSent: 0, txCount: 0 });
            }
            
            const entry = userMap.get(address)!;
            entry.shitSent += record['SHIT Sent'] || 0;
            entry.txCount += 1;
        });

        const sortedTopUsers = Array.from(userMap.entries())
            .map(([address, values]) => ({
                address: `${address.slice(0, 4)}...${address.slice(-4)}`,
                fullAddress: address,
                ...values
            }))
            .sort((a, b) => b.shitSent - a.shitSent)
            .slice(0, 10);
            
        setTopUsers(sortedTopUsers);
    };

    const countAddressesByTxCount = (df: POSRecordEntry[], minTxCount: number) => {
        if (df.length === 0) return [];

        // Group by address and adjusted date (noon 12pm as day boundary)
        const addressDateMap = new Map<string, Map<string, number>>();

        df.forEach(record => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            // If hour >= 12, use current date; if hour < 12, use previous date
            const adjustedDate = recordDate.hour() >= 12
                ? recordDate.format('YYYY-MM-DD')
                : recordDate.subtract(1, 'day').format('YYYY-MM-DD');
            const address = record['Receiver Address'];

            if (!addressDateMap.has(address)) {
                addressDateMap.set(address, new Map());
            }

            const dateMap = addressDateMap.get(address)!;
            dateMap.set(adjustedDate, (dateMap.get(adjustedDate) || 0) + 1);
        });

        // Convert to result format
    const results: Array<{ 'Receiver Address': string; Date: string; 'Transaction Count': number }> = [];

        addressDateMap.forEach((dateMap, address) => {
            dateMap.forEach((count, date) => {
                if (count > minTxCount) {
                    results.push({
                        'Receiver Address': address,
                        Date: date,
                        'Transaction Count': count
                    });
                }
            });
        });

        // Sort by date desc, then by transaction count desc
        return results.sort((a, b) => {
            if (a.Date !== b.Date) {
                return dayjs(b.Date).valueOf() - dayjs(a.Date).valueOf();
            }
            return b['Transaction Count'] - a['Transaction Count'];
        });
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
                    正在计算POS数据...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有POS交易数据"
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
                POS Data (UTC+8 12:00)
            </h2>
                {/* Row 1: Basic metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="总分红 (SHIT)"
                            value={metrics?.totalAmountCurrent || 0}
                            precision={0}
                            prevValue={metrics?.totalAmountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="总营收 (SOL)"
                            value={metrics?.totalRevenueCurrent || 0}
                            precision={4}
                            prevValue={metrics?.totalRevenuePrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="人均奖励 (SHIT)"
                            value={metrics?.avgRewardCurrent || 0}
                            precision={0}
                            prevValue={metrics?.avgRewardPrev}
                        />
                    </Col>
                </Row>

                {/* Row 2: Secondary metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="交易笔数"
                            value={metrics?.totalTxCurrent || 0}
                            prevValue={metrics?.totalTxPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="单笔最大分红"
                            value={metrics?.maxAmountCurrent || 0}
                            precision={0}
                            prevValue={metrics?.maxAmountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <StatisticCard
                            title="单笔最小分红"
                            value={metrics?.minAmountCurrent || 0}
                            precision={0}
                            prevValue={metrics?.minAmountPrev}
                        />
                    </Col>
                </Row>

                {/* Charts Row 1: Daily Rewards vs Revenue */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card
                            title="每日分红 vs 营收趋势"
                            style={theme.card}
                        >
                            <ReactECharts
                                option={{
                                    backgroundColor: 'transparent',
                                    tooltip: getTooltipOption(formatSOL),
                                    legend: {
                                        data: ['SHIT Distributed', 'SOL Revenue'],
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
                                        getYAxisOption('SHIT', theme.colors.primary),
                                        {
                                            ...getYAxisOption('SOL', theme.colors.secondary, formatSOLNumber),
                                            splitLine: { show: false }
                                        }
                                    ],
                                    series: [
                                        {
                                            name: 'SHIT Distributed',
                                            data: dailyData.map(d => d.shitSent),
                                            ...getBarSeriesStyle(theme.colors.primary),
                                        },
                                        {
                                            name: 'SOL Revenue',
                                            yAxisIndex: 1,
                                            data: dailyData.map(d => d.solReceived),
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
                            title="Top 10 巨鲸排行榜 (按分红金额)"
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
                                                    <div style="color: #FFFF00;">SHIT Received: ${formatDecimal(data.shitSent)}</div>
                                                    <div style="color: ${theme.colors.secondary};">Tx Count: ${data.txCount}</div>
                                                    <div style="color: #888; font-size: 12px;">${data.fullAddress}</div>`;
                                        }
                                    },
                                    grid: theme.chart.grid,
                                    xAxis: getValueAxisStyle('SHIT'),
                                    yAxis: {
                                        type: 'category',
                                        inverse: true,
                                        data: topUsers.map(u => u.address),
                                        axisLabel: { color: theme.colors.primary },
                                        axisLine: { lineStyle: { color: theme.colors.primary } }
                                    },
                                    series: [{
                                        type: 'bar',
                                        data: getGradientBarData(topUsers, 'shitSent'),
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

                {/* Duplicate Addresses Table */}
                <Card
                    title={
                        <span style={{ color: theme.colors.text, fontSize: '16px' }}>
                            每日交易次数&gt;1的地址列表
                        </span>
                    }
                    style={theme.card}
                >
                    {duplicateAddresses.length > 0 ? (
                        <Table
                            dataSource={duplicateAddresses}
                            columns={[
                                {
                                    title: '地址',
                                    dataIndex: 'Receiver Address',
                                    key: 'address',
                                    ellipsis: true,
                                    width: '50%',
                                },
                                {
                                    title: '日期',
                                    dataIndex: 'Date',
                                    key: 'date',
                                    width: '25%',
                                    sorter: (a, b) => dayjs(a.Date).valueOf() - dayjs(b.Date).valueOf(),
                                },
                                {
                                    title: '交易次数',
                                    dataIndex: 'Transaction Count',
                                    key: 'count',
                                    width: '25%',
                                    sorter: (a, b) => b['Transaction Count'] - a['Transaction Count'],
                                },
                            ]}
                            pagination={false}
                            size="small"
                            style={{
                                background: 'transparent',
                            }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#00FF41' }}>
                            一切正常！所选时间范围内无交易次数&gt;1的地址
                        </div>
                    )}
                </Card>
            </div>
        );
    };

export default POSSection;