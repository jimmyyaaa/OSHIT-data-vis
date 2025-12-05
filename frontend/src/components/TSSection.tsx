import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Table, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { theme, getBarSeriesStyle, getLineSeriesStyle, getGradientBarData, getValueAxisStyle, formatNumber, formatDecimal, formatSOL, formatSOLNumber, getTooltipOption, getYAxisOption } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData, TSRecordEntry } from '../services/dataService';

type DailyTSDataEntry = {
    date: string;
    txCount: number;
    shitSent: number;
    solReceived: number;
};

type TopTSUser = {
    address: string;
    fullAddress: string;
    txCount: number;
    shitSent: number;
};

interface TSSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface TSMetrics {
    // Current period
    totalTxCurrent: number;
    tsClaimCurrent: number;
    totalAmountCurrent: number;
    uniqueAddressesCurrent: number;
    meanClaimsCurrent: number;
    medianClaimsCurrent: number;
    avgIntervalCurrent: number;
    wolfTxCurrent: number;
    oneRefTxCurrent: number;
    twoRefTxCurrent: number;
    luckyDrawsCurrent: number;
    luckyDrawAmountCurrent: number;
    luckyDrawAddressesCurrent: number;
    revenueWithoutRewardCurrent: number;
    shitCostWithoutRewardCurrent: number;
    roiWithoutRewardCurrent: number;
    rewardCountCurrent: number;
    rewardCostCurrent: number;
    roiWithRewardCurrent: number;

    // Previous period
    totalTxPrev: number;
    tsClaimPrev: number;
    totalAmountPrev: number;
    uniqueAddressesPrev: number;
    meanClaimsPrev: number;
    medianClaimsPrev: number;
    avgIntervalPrev: number;
    wolfTxPrev: number;
    oneRefTxPrev: number;
    twoRefTxPrev: number;
    luckyDrawsPrev: number;
    luckyDrawAmountPrev: number;
    luckyDrawAddressesPrev: number;
    revenueWithoutRewardPrev: number;
    shitCostWithoutRewardPrev: number;
    roiWithoutRewardPrev: number;
    rewardCountPrev: number;
    rewardCostPrev: number;
    roiWithRewardPrev: number;
}

const TSSection: React.FC<TSSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    const [metrics, setMetrics] = useState<TSMetrics | null>(null);
    const [repeatRanking, setRepeatRanking] = useState<Array<{ address: string; count: number }>>([]);
    const [dailyData, setDailyData] = useState<DailyTSDataEntry[]>([]);
    const [heatmapData, setHeatmapData] = useState<{dates: string[], hours: number[], data: [number, number, number][]}>({dates: [], hours: [], data: []});
    const [topUsers, setTopUsers] = useState<TopTSUser[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (data && data.TS_Log) {
            setIsCalculating(true);
            setTimeout(() => {
                calculateMetrics();
            }, 0);
        }
    }, [data, dateRange]);

    const calculateMetrics = () => {
        if (!data) return;

        const [startDate, endDate] = dateRange;
        // TS uses morning 8am (UTC+8) as day boundary
        const currentStart = startDate.hour(8).minute(0).second(0).millisecond(0);
        const currentEnd = endDate.add(1, 'day').hour(8).minute(0).second(0).millisecond(0);

        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');
        const prevStart = prevStartDate.hour(8).minute(0).second(0).millisecond(0);
        const prevEnd = prevEndDate.add(1, 'day').hour(8).minute(0).second(0).millisecond(0);

        // Filter data for current and previous periods
        const tsDataCurrent = data.TS_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(currentStart) && recordDate.isBefore(currentEnd);
        });

        // Heatmap data uses natural days (00:00 - 23:59)
        const heatmapStart = startDate.startOf('day');
        const heatmapEnd = endDate.endOf('day');
        const tsDataHeatmap = data.TS_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(heatmapStart) && recordDate.isBefore(heatmapEnd);
        });

        const tsDataPrev = data.TS_Log.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStart) && recordDate.isBefore(prevEnd);
        });

        const tsDiscordCurrent = data.TS_Discord?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const tsDiscordPrev = data.TS_Discord?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        // Calculate SHIT price averages
        const shitPriceDataCurrent = data.SHIT_Price_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        }) || [];

        const shitPriceCurrent = shitPriceDataCurrent.length > 0
            ? shitPriceDataCurrent.reduce((sum, record) => sum + record['Price'], 0) / shitPriceDataCurrent.length
            : 0;

        const shitPriceDataPrev = data.SHIT_Price_Log?.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        }) || [];

        const shitPricePrev = shitPriceDataPrev.length > 0
            ? shitPriceDataPrev.reduce((sum, record) => sum + record['Price'], 0) / shitPriceDataPrev.length
            : 0;

        // Current period calculations
        const totalTxCurrent = tsDataCurrent.length;
        const tsClaimCurrent = numAllTxExcludingReference(tsDataCurrent);
        const totalAmountCurrent = tsDataCurrent.reduce((sum, r) => sum + r['SHIT Sent'], 0);
        const uniqueAddressesCurrent = numAddressWithoutReference(tsDataCurrent);
        const [meanClaimsCurrent, medianClaimsCurrent] = meanMedianByAddress(tsDataCurrent);
        const avgIntervalCurrent = avgTimeIntervalByAddress(tsDataCurrent);
        const [wolfTxCurrent, oneRefTxCurrent, twoRefTxCurrent] = numTxByReferenceLevel(tsDataCurrent);
        const luckyDrawsCurrent = numLuckyDraws(tsDataCurrent);
        const luckyDrawAmountCurrent = amountLuckyDraws(tsDataCurrent);
        const luckyDrawAddressesCurrent = numAddressLuckyDraws(tsDataCurrent);

        const revenueWithoutRewardCurrent = tsDataCurrent.reduce((sum, r) => sum + r['SOL_Received'], 0);
        const shitCostWithoutRewardCurrent = totalAmountCurrent * shitPriceCurrent;
        const roiWithoutRewardCurrent = shitCostWithoutRewardCurrent > 0 ?
            revenueWithoutRewardCurrent / shitCostWithoutRewardCurrent : 0;

        const rewardCountCurrent = tsDiscordCurrent.reduce((sum, r) => sum + (r['SHIT Code Sent'] || 0), 0);
        const rewardCostCurrent = rewardCountCurrent * 5000 * shitPriceCurrent;
        const roiWithRewardCurrent = (shitCostWithoutRewardCurrent + rewardCostCurrent) > 0 ?
            (revenueWithoutRewardCurrent + rewardCostCurrent * 0.13) / (shitCostWithoutRewardCurrent + rewardCostCurrent) : 0;

        // Previous period calculations
        const totalTxPrev = tsDataPrev.length;
        const tsClaimPrev = numAllTxExcludingReference(tsDataPrev);
        const totalAmountPrev = tsDataPrev.reduce((sum, r) => sum + r['SHIT Sent'], 0);
        const uniqueAddressesPrev = numAddressWithoutReference(tsDataPrev);
        const [meanClaimsPrev, medianClaimsPrev] = meanMedianByAddress(tsDataPrev);
        const avgIntervalPrev = avgTimeIntervalByAddress(tsDataPrev);
        const [wolfTxPrev, oneRefTxPrev, twoRefTxPrev] = numTxByReferenceLevel(tsDataPrev);
        const luckyDrawsPrev = numLuckyDraws(tsDataPrev);
        const luckyDrawAmountPrev = amountLuckyDraws(tsDataPrev);
        const luckyDrawAddressesPrev = numAddressLuckyDraws(tsDataPrev);

        const revenueWithoutRewardPrev = tsDataPrev.reduce((sum, r) => sum + r['SOL_Received'], 0);
        const shitCostWithoutRewardPrev = totalAmountPrev * shitPricePrev;
        const roiWithoutRewardPrev = shitCostWithoutRewardPrev > 0 ?
            revenueWithoutRewardPrev / shitCostWithoutRewardPrev : 0;

        const rewardCountPrev = tsDiscordPrev.reduce((sum, r) => sum + (r['SHIT Code Sent'] || 0), 0);
        const rewardCostPrev = rewardCountPrev * 5000 * shitPricePrev;
        const roiWithRewardPrev = (shitCostWithoutRewardPrev + rewardCostPrev) > 0 ?
            (revenueWithoutRewardPrev + rewardCostPrev * 0.13) / (shitCostWithoutRewardPrev + rewardCostPrev) : 0;

        setMetrics({
            totalTxCurrent, tsClaimCurrent, totalAmountCurrent, uniqueAddressesCurrent,
            meanClaimsCurrent, medianClaimsCurrent, avgIntervalCurrent,
            wolfTxCurrent, oneRefTxCurrent, twoRefTxCurrent,
            luckyDrawsCurrent, luckyDrawAmountCurrent, luckyDrawAddressesCurrent,
            revenueWithoutRewardCurrent, shitCostWithoutRewardCurrent, roiWithoutRewardCurrent,
            rewardCountCurrent, rewardCostCurrent, roiWithRewardCurrent,
            totalTxPrev, tsClaimPrev, totalAmountPrev, uniqueAddressesPrev,
            meanClaimsPrev, medianClaimsPrev, avgIntervalPrev,
            wolfTxPrev, oneRefTxPrev, twoRefTxPrev,
            luckyDrawsPrev, luckyDrawAmountPrev, luckyDrawAddressesPrev,
            revenueWithoutRewardPrev, shitCostWithoutRewardPrev, roiWithoutRewardPrev,
            rewardCountPrev, rewardCostPrev, roiWithRewardPrev,
        });

        // Calculate repeat ranking
        setRepeatRanking(repeatClaimRankingByAddress(tsDataCurrent));
        
        // Prepare chart data
        prepareChartData(tsDataCurrent, tsDataHeatmap);
        
        setIsCalculating(false);
    };

    const prepareChartData = (tsData: TSRecordEntry[], tsDataHeatmap: TSRecordEntry[]) => {
        // Heatmap aggregation
        const heatmapMap = new Map<string, number>();
        const days: string[] = [];
        
        // Initialize grid
        let curr = dateRange[0].clone();
        while (curr.isBefore(dateRange[1]) || curr.isSame(dateRange[1], 'day')) {
            const dateStr = curr.format('YYYY-MM-DD');
            days.push(dateStr);
            for (let h = 0; h < 24; h++) {
                heatmapMap.set(`${dateStr}-${h}`, 0);
            }
            curr = curr.add(1, 'day');
        }

        tsDataHeatmap.forEach(record => {
            const d = dayjs(record['Timestamp(UTC+8)']);
            const key = `${d.format('YYYY-MM-DD')}-${d.hour()}`;
            if (heatmapMap.has(key)) {
                heatmapMap.set(key, heatmapMap.get(key)! + 1);
            }
        });

        const heatmapSeries: [number, number, number][] = [];
        days.forEach((date, dateIndex) => {
            for (let h = 0; h < 24; h++) {
                const val = heatmapMap.get(`${date}-${h}`) || 0;
                // ECharts Heatmap: [x, y, value] -> [DateIndex, HourIndex, Value]
                // But usually Heatmap x is category (days), y is category (hours)
                heatmapSeries.push([dateIndex, h, val]);
            }
        });

        setHeatmapData({
            dates: days,
            hours: Array.from({length: 24}, (_, i) => i),
            data: heatmapSeries
        });

        // Daily aggregation
        const dailyMap = new Map<string, { txCount: number; shitSent: number; solReceived: number }>();
        
        tsData.forEach(record => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            // TS uses 8am as day boundary
            const adjustedDate = recordDate.hour() < 8 
                ? recordDate.subtract(1, 'day').format('YYYY-MM-DD')
                : recordDate.format('YYYY-MM-DD');
                
            if (!dailyMap.has(adjustedDate)) {
                dailyMap.set(adjustedDate, { txCount: 0, shitSent: 0, solReceived: 0 });
            }
            
            const entry = dailyMap.get(adjustedDate)!;
            entry.txCount += 1;
            entry.shitSent += record['SHIT Sent'] || 0;
            entry.solReceived += record['SOL_Received'] || 0;
        });

        const sortedDailyData = Array.from(dailyMap.entries())
            .map(([date, values]) => ({
                date,
                ...values
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
            
        setDailyData(sortedDailyData);

        // Top users aggregation
        const userMap = new Map<string, { txCount: number; shitSent: number }>();
        
        tsData.forEach(record => {
            const address = record['Receiver Address'];
            if (!userMap.has(address)) {
                userMap.set(address, { txCount: 0, shitSent: 0 });
            }
            
            const entry = userMap.get(address)!;
            entry.txCount += 1;
            entry.shitSent += record['SHIT Sent'] || 0;
        });

        const sortedTopUsers = Array.from(userMap.entries())
            .map(([address, values]) => ({
                address: `${address.slice(0, 4)}...${address.slice(-4)}`,
                fullAddress: address,
                ...values
            }))
            .sort((a, b) => b.txCount - a.txCount)
            .slice(0, 10);
            
        setTopUsers(sortedTopUsers);
    };

    // Helper functions (migrated from Python calculations.py)
    const numAllTxExcludingReference = (df: TSRecordEntry[]) => {
        return df.filter(r => r.TS_Category === 0).length;
    };

    const meanMedianByAddress = (df: TSRecordEntry[]) => {
        const filtered = df.filter(r => r.TS_Category === 0);
        const grouped = new Map<string, number>();
        filtered.forEach(r => {
            const addr = r['Receiver Address'];
            grouped.set(addr, (grouped.get(addr) || 0) + 1);
        });
        const counts = Array.from(grouped.values());
        if (counts.length === 0) return [0, 0];
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const sorted = counts.sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        return [mean, median];
    };

    const avgTimeIntervalByAddress = (df: TSRecordEntry[]) => {
        const intervals: number[] = [];
        const sorted = df.sort((a, b) =>
            dayjs(a['Timestamp(UTC+8)']).valueOf() - dayjs(b['Timestamp(UTC+8)']).valueOf()
        );

    const addrMap = new Map<string, TSRecordEntry[]>();
        sorted.forEach(r => {
            const addr = r['Receiver Address'];
            if (!addrMap.has(addr)) addrMap.set(addr, []);
            addrMap.get(addr)!.push(r);
        });

        addrMap.forEach(transactions => {
            if (transactions.length >= 5) {
                for (let i = 1; i < transactions.length; i++) {
                    const interval = dayjs(transactions[i]['Timestamp(UTC+8)']).diff(
                        dayjs(transactions[i-1]['Timestamp(UTC+8)']), 'minute'
                    );
                    intervals.push(interval);
                }
            }
        });

        return intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    };

    const numAddressWithoutReference = (df: TSRecordEntry[]) => {
        const filtered = df.filter(r => r.TS_Category === 0);
        const addresses = new Set(filtered.map(r => r['Receiver Address']));
        return addresses.size;
    };

    const numTxByReferenceLevel = (df: TSRecordEntry[]) => {
        const level2 = df.filter(r => r.TS_Category === 2).length;
        const level1 = df.filter(r => r.TS_Category === 1).length - level2;
        const level0 = df.filter(r => r.TS_Category === 0).length - level1 - level2;
        return [level0, level1, level2];
    };

    const numLuckyDraws = (df: TSRecordEntry[]) => {
        return df.filter(r => r.TS_Category === 3).length;
    };

    const amountLuckyDraws = (df: TSRecordEntry[]) => {
        return df.filter(r => r.TS_Category === 3)
            .reduce((sum, r) => sum + r['SHIT Sent'], 0);
    };

    const numAddressLuckyDraws = (df: TSRecordEntry[]) => {
        const addresses = new Set(
            df.filter(r => r.TS_Category === 3).map(r => r['Receiver Address'])
        );
        return addresses.size;
    };

    const repeatClaimRankingByAddress = (df: TSRecordEntry[]) => {
        const filtered = df.filter(r => r.TS_Category === 0);
        const ranking = new Map<string, number>();
        filtered.forEach(r => {
            const addr = r['Receiver Address'];
            ranking.set(addr, (ranking.get(addr) || 0) + 1);
        });
        return Array.from(ranking.entries())
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
                    正在计算TS数据...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有TS交易数据"
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
                TS Data (UTC+8 08:00)
            </h2>
                {/* Row 1: Basic metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <StatisticCard
                            title="交易总笔数"
                            value={metrics?.totalTxCurrent || 0}
                            prevValue={metrics?.totalTxPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <StatisticCard
                            title="TS领取数（剔除Reference）"
                            value={metrics?.tsClaimCurrent || 0}
                            prevValue={metrics?.tsClaimPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <StatisticCard
                            title="TS交易总金额"
                            value={metrics?.totalAmountCurrent || 0}
                            prevValue={metrics?.totalAmountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <StatisticCard
                            title="地址参与数"
                            value={metrics?.uniqueAddressesCurrent || 0}
                            prevValue={metrics?.uniqueAddressesPrev}
                        />
                    </Col>
                </Row>

                {/* Row 2: Address statistics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="每个地址平均领取次数"
                            value={metrics?.meanClaimsCurrent || 0}
                            precision={2}
                            prevValue={metrics?.meanClaimsPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="每个地址领取中位数"
                            value={metrics?.medianClaimsCurrent || 0}
                            precision={0}
                            prevValue={metrics?.medianClaimsPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="一天内平均时间间隔（分）"
                            value={metrics?.avgIntervalCurrent || 0}
                            precision={2}
                            prevValue={metrics?.avgIntervalPrev}
                        />
                    </Col>
                </Row>

                {/* Row 3: Reference levels */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="独狼交易笔数"
                            value={metrics?.wolfTxCurrent || 0}
                            prevValue={metrics?.wolfTxPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="存在一个上级交易笔数"
                            value={metrics?.oneRefTxCurrent || 0}
                            prevValue={metrics?.oneRefTxPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="存在两个上级交易笔数"
                            value={metrics?.twoRefTxCurrent || 0}
                            prevValue={metrics?.twoRefTxPrev}
                        />
                    </Col>
                </Row>

                {/* Row 4: Lucky draws */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="抽奖总次数"
                            value={metrics?.luckyDrawsCurrent || 0}
                            prevValue={metrics?.luckyDrawsPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="抽奖总金额"
                            value={metrics?.luckyDrawAmountCurrent || 0}
                            prevValue={metrics?.luckyDrawAmountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="抽奖地址参与数"
                            value={metrics?.luckyDrawAddressesCurrent || 0}
                            prevValue={metrics?.luckyDrawAddressesPrev}
                        />
                    </Col>
                </Row>

                {/* Row 5: Revenue without rewards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="TS收入（SOL): 不含奖励"
                            value={metrics?.revenueWithoutRewardCurrent || 0}
                            precision={4}
                            prevValue={metrics?.revenueWithoutRewardPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="付出SHIT成本(SOL): 不含奖励"
                            value={metrics?.shitCostWithoutRewardCurrent || 0}
                            precision={4}
                            prevValue={metrics?.shitCostWithoutRewardPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="ROI: 不含奖励"
                            value={metrics?.roiWithoutRewardCurrent || 0}
                            precision={2}
                            prevValue={metrics?.roiWithoutRewardPrev}
                        />
                    </Col>
                </Row>

                {/* Row 6: Rewards and ROI with rewards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="奖励总次数"
                            value={metrics?.rewardCountCurrent || 0}
                            prevValue={metrics?.rewardCountPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="奖励成本（SOL）"
                            value={metrics?.rewardCostCurrent || 0}
                            precision={4}
                            prevValue={metrics?.rewardCostPrev}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <StatisticCard
                            title="ROI: 含奖励"
                            value={metrics?.roiWithRewardCurrent || 0}
                            precision={2}
                            prevValue={metrics?.roiWithRewardPrev}
                        />
                    </Col>
                </Row>

                {/* Charts Row 1: Daily Trends */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card
                            title="每小时交易量热力图 (Tx Count)"
                            style={theme.card}
                        >
                            <ReactECharts
                                option={{
                                    backgroundColor: 'transparent',
                                    tooltip: {
                                        position: 'top',
                                        backgroundColor: theme.colors.tooltipBg,
                                        borderColor: theme.colors.primary,
                                        borderWidth: 1,
                                        textStyle: { color: theme.colors.primary },
                                        formatter: (params: any) => {
                                            return `${heatmapData.dates[params.value[0]]} ${params.value[1]}:00<br/>Tx Count: ${params.value[2]}`;
                                        }
                                    },
                                    grid: {
                                        height: '70%',
                                        top: '10%',
                                        left: '10%',
                                        right: '5%'
                                    },
                                    xAxis: {
                                        type: 'category',
                                        data: heatmapData.dates,
                                        axisLabel: { color: theme.colors.primary, rotate: 45 },
                                        axisLine: { lineStyle: { color: theme.colors.primary } },
                                        splitArea: { show: true, areaStyle: { color: 'transparent' } }
                                    },
                                    yAxis: {
                                        type: 'category',
                                        data: heatmapData.hours.map(h => `${h}:00`),
                                        axisLabel: { color: theme.colors.primary },
                                        axisLine: { lineStyle: { color: theme.colors.primary } },
                                        splitArea: { show: true, areaStyle: { color: 'transparent' } }
                                    },
                                    visualMap: {
                                        min: 0,
                                        max: Math.max(1, ...heatmapData.data.map(d => d[2])),
                                        calculable: true,
                                        orient: 'horizontal',
                                        left: 'center',
                                        bottom: '0%',
                                        textStyle: { color: theme.colors.primary },
                                        inRange: {
                                            // Lower saturation: Faded Cyan -> Faded Purple -> Faded Pink
                                            color: [theme.colors.grid, theme.colors.primary, theme.colors.secondary]
                                        }
                                    },
                                    series: [{
                                        name: 'Tx Count',
                                        type: 'heatmap',
                                        data: heatmapData.data,
                                        label: { show: false },
                                        itemStyle: {
                                            borderRadius: 6,
                                            borderColor: 'rgba(0, 10, 20, 0.8)', // Match background for spacing effect
                                            borderWidth: 2
                                        },
                                        emphasis: {
                                            itemStyle: {
                                                shadowBlur: 10,
                                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                                            }
                                        }
                                    }],
                                }}
                                style={{ height: '350px' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card
                            title="每日 SHIT 发放 vs SOL 收入"
                            style={theme.card}
                        >
                            <ReactECharts
                                option={{
                                    backgroundColor: 'transparent',
                                    tooltip: getTooltipOption(formatSOL),
                                    legend: {
                                        data: ['SHIT Sent', 'SOL Received'],
                                        textStyle: { color: theme.colors.primary },
                                        top: 10,
                                    },
                                    grid: theme.chart.grid,
                                    xAxis: {
                                        type: 'category',
                                        data: dailyData.map(d => d.date),
                                        axisLabel: { color: theme.colors.primary, rotate: 45 },
                                        axisLine: { lineStyle: { color: theme.colors.primary } },
                                    },
                                    yAxis: [
                                        getYAxisOption('SHIT', theme.colors.primary),
                                        {
                                            ...getYAxisOption('SOL', theme.colors.secondary, formatSOLNumber),
                                            splitLine: { show: false },
                                        }
                                    ],
                                    series: [
                                        {
                                            name: 'SHIT Sent',
                                            data: dailyData.map(d => d.shitSent),
                                            ...getBarSeriesStyle(theme.colors.primary),
                                        },
                                        {
                                            name: 'SOL Received',
                                            yAxisIndex: 1,
                                            data: dailyData.map(d => d.solReceived),
                                            ...getLineSeriesStyle(theme.colors.secondary),
                                        }
                                    ],
                                }}
                                style={{ height: '350px' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Charts Row 2: Top Users */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24}>
                        <Card
                            title="Top 10 活跃用户 (按交易次数)"
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
                                        textStyle: { color: theme.colors.text },
                                        formatter: (params: any) => {
                                            const param = params[0];
                                            const data = topUsers[param.dataIndex];
                                            return `<div style="color: ${theme.colors.primary}; font-weight: bold;">${param.name}</div>
                                                    <div style="color: #fff;">Tx Count: ${data.txCount}</div>
                                                    <div style="color: ${theme.colors.secondary};">SHIT Sent: ${formatDecimal(data.shitSent)}</div>
                                                    <div style="color: #888; font-size: 12px;">${data.fullAddress}</div>`;
                                        },
                                    },
                                    grid: theme.chart.grid,
                                    xAxis: getValueAxisStyle('Tx Count'),
                                    yAxis: {
                                        type: 'category',
                                        inverse: true,
                                        data: topUsers.map(u => u.address),
                                        axisLabel: { color: theme.colors.text },
                                        axisLine: { lineStyle: { color: theme.colors.axis } },
                                    },
                                    series: [{
                                        type: 'bar',
                                        data: getGradientBarData(topUsers, 'txCount'),
                                        barWidth: '60%',
                                        label: {
                                            show: true,
                                            position: 'right',
                                            formatter: (params: any) => formatNumber(params.value),
                                            color: theme.colors.text,
                                            fontWeight: 'bold'
                                        }
                                    }],
                                }}
                                style={{ height: '500px' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Repeat Claim Ranking Table */}
                <Card
                    title={
                        <span style={{ color: theme.colors.text, fontSize: '16px' }}>
                            重复领取排行榜
                        </span>
                    }
                    style={{
                        ...theme.card,
                        marginTop: 16,
                    }}
                >
                    {repeatRanking.length > 0 ? (
                        <Table
                            dataSource={repeatRanking}
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
                            pagination={false}
                            size="small"
                            style={{
                                background: 'transparent',
                            }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            当前范围内无重复领取的地址
                        </div>
                    )}
                </Card>
            </div>
        );
    };

export default TSSection;