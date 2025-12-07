import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Table, Spin } from 'antd';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { theme, getLineSeriesStyle, getBarSeriesStyle, formatDecimal, formatNumber, getTooltipOption, getYAxisOption } from '../theme';
import { StatisticCard } from './ui';
import type { SheetData } from '../services/dataService';

interface DeFiSectionProps {
    data: SheetData | null;
    error: string | null;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

interface DeFiMetrics {
    // Current period
    buyShitAmountCurrent: number;
    sellShitAmountCurrent: number;
    buyCountCurrent: number;
    sellCountCurrent: number;
    buyUsdtAmountCurrent: number;
    sellUsdtAmountCurrent: number;
    tsSellShitAmountCurrent: number;
    tsSellUsdtAmountCurrent: number;
    liqAddUsdtCurrent: number;
    liqRemoveUsdtCurrent: number;
    liqAddCountCurrent: number;
    liqRemoveCountCurrent: number;

    // Previous period
    buyShitAmountPrev: number;
    sellShitAmountPrev: number;
    buyCountPrev: number;
    sellCountPrev: number;
    buyUsdtAmountPrev: number;
    sellUsdtAmountPrev: number;
    tsSellShitAmountPrev: number;
    tsSellUsdtAmountPrev: number;
    liqAddUsdtPrev: number;
    liqRemoveUsdtPrev: number;
    liqAddCountPrev: number;
    liqRemoveCountPrev: number;
}

interface ChartData {
    dates: string[];
    hourlyDates: string[];
    volume: {
        buyUsdt: number[];
        sellUsdt: number[];
        netFlow: number[];
    };
    liquidity: {
        addUsdt: number[];
        removeUsdt: number[];
    };
    sellPressure: {
        tsSell: number[];
        normalSell: number[];
    };
    price: {
        ohlc: number[][]; // [Open, Close, Low, High]
    };
}

interface TransactionRecord {
    address: string;
    shitChange: number;
}

const DeFiSection: React.FC<DeFiSectionProps> = ({
    data,
    error,
    dateRange,
}) => {
    const [metrics, setMetrics] = useState<DeFiMetrics | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [buyTransactions, setBuyTransactions] = useState<TransactionRecord[]>([]);
    const [sellTransactions, setSellTransactions] = useState<TransactionRecord[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (data) {
            setIsCalculating(true);
            setTimeout(() => {
                calculateMetrics();
            }, 0);
        }
    }, [data, dateRange]);

    const calculateMetrics = () => {
        if (!data || !data.Liq_Pool_Activity) return;

        const [startDate, endDate] = dateRange;

        // Filter data for current and previous periods
        const currentData = data.Liq_Pool_Activity.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(startDate.startOf('day')) &&
                    recordDate.isBefore(endDate.endOf('day'));
        });

        const prevStartDate = startDate.subtract(
            endDate.diff(startDate, 'day') + 1,
            'day'
        );
        const prevEndDate = startDate.subtract(1, 'day');

        const prevData = data.Liq_Pool_Activity.filter((record) => {
            const recordDate = dayjs(record['Timestamp(UTC+8)']);
            return recordDate.isAfter(prevStartDate.startOf('day')) &&
                    recordDate.isBefore(prevEndDate.endOf('day'));
        });

        // Split by activity type
        const buyDataCurrent = currentData.filter(r => r.Activity === 'BUY');
        const sellDataCurrent = currentData.filter(r => r.Activity === 'SELL');
        const liqAddDataCurrent = currentData.filter(r => r.Activity === 'LIQ_ADD');
        const liqRemoveDataCurrent = currentData.filter(r => r.Activity === 'LIQ_REMOVE');

        const buyDataPrev = prevData.filter(r => r.Activity === 'BUY');
        const sellDataPrev = prevData.filter(r => r.Activity === 'SELL');
        const liqAddDataPrev = prevData.filter(r => r.Activity === 'LIQ_ADD');
        const liqRemoveDataPrev = prevData.filter(r => r.Activity === 'LIQ_REMOVE');

        // TS sell data (13k-20k range)
        const tsSellDataCurrent = sellDataCurrent.filter(r =>
            Math.abs(r['SHIT Change']) >= 13000 && Math.abs(r['SHIT Change']) <= 20000
        );
        const tsSellDataPrev = sellDataPrev.filter(r =>
            Math.abs(r['SHIT Change']) >= 13000 && Math.abs(r['SHIT Change']) <= 20000
        );

        // Calculate metrics
        const buyShitAmountCurrent = buyDataCurrent.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const sellShitAmountCurrent = sellDataCurrent.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const buyCountCurrent = buyDataCurrent.length;
        const sellCountCurrent = sellDataCurrent.length;
        const buyUsdtAmountCurrent = buyDataCurrent.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const sellUsdtAmountCurrent = sellDataCurrent.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const tsSellShitAmountCurrent = tsSellDataCurrent.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const tsSellUsdtAmountCurrent = tsSellDataCurrent.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqAddUsdtCurrent = liqAddDataCurrent.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqRemoveUsdtCurrent = liqRemoveDataCurrent.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqAddCountCurrent = liqAddDataCurrent.length;
        const liqRemoveCountCurrent = liqRemoveDataCurrent.length;

        const buyShitAmountPrev = buyDataPrev.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const sellShitAmountPrev = sellDataPrev.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const buyCountPrev = buyDataPrev.length;
        const sellCountPrev = sellDataPrev.length;
        const buyUsdtAmountPrev = buyDataPrev.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const sellUsdtAmountPrev = sellDataPrev.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const tsSellShitAmountPrev = tsSellDataPrev.reduce((sum, r) => sum + Math.abs(r['SHIT Change'] || 0), 0);
        const tsSellUsdtAmountPrev = tsSellDataPrev.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqAddUsdtPrev = liqAddDataPrev.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqRemoveUsdtPrev = liqRemoveDataPrev.reduce((sum, r) => sum + Math.abs(r['USDT Change'] || 0), 0);
        const liqAddCountPrev = liqAddDataPrev.length;
        const liqRemoveCountPrev = liqRemoveDataPrev.length;

        setMetrics({
            buyShitAmountCurrent, sellShitAmountCurrent, buyCountCurrent, sellCountCurrent,
            buyUsdtAmountCurrent, sellUsdtAmountCurrent, tsSellShitAmountCurrent, tsSellUsdtAmountCurrent,
            liqAddUsdtCurrent, liqRemoveUsdtCurrent, liqAddCountCurrent, liqRemoveCountCurrent,
            buyShitAmountPrev, sellShitAmountPrev, buyCountPrev, sellCountPrev,
            buyUsdtAmountPrev, sellUsdtAmountPrev, tsSellShitAmountPrev, tsSellUsdtAmountPrev,
            liqAddUsdtPrev, liqRemoveUsdtPrev, liqAddCountPrev, liqRemoveCountPrev,
        });

        // Prepare Chart Data
        const dailyMap = new Map<string, {
            buyUsdt: number;
            sellUsdt: number;
            tsSellUsdt: number;
            liqAddUsdt: number;
            liqRemoveUsdt: number;
        }>();

        const processChartData = (data: any[], key: string, valueKey: string, condition?: (r: any) => boolean) => {
            data.forEach((record) => {
                if (condition && !condition(record)) return;
                const date = dayjs(record['Timestamp(UTC+8)']).format('YYYY-MM-DD');
                const val = Math.abs(record[valueKey] || 0);
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { buyUsdt: 0, sellUsdt: 0, tsSellUsdt: 0, liqAddUsdt: 0, liqRemoveUsdt: 0 });
                }
                const entry = dailyMap.get(date)!;
                (entry as any)[key] += val;
            });
        };

        processChartData(buyDataCurrent, 'buyUsdt', 'USDT Change');
        processChartData(sellDataCurrent, 'sellUsdt', 'USDT Change');
        processChartData(sellDataCurrent, 'tsSellUsdt', 'USDT Change', (r) =>
            Math.abs(r['SHIT Change']) >= 13000 && Math.abs(r['SHIT Change']) <= 20000
        );
        processChartData(liqAddDataCurrent, 'liqAddUsdt', 'USDT Change');
        processChartData(liqRemoveDataCurrent, 'liqRemoveUsdt', 'USDT Change');

        // Process Price Data
        const priceMap = new Map<string, { open: number; close: number; low: number; high: number; prices: number[] }>();
        
        if (data.SHIT_Price_Log) {
            const filteredPriceLog = data.SHIT_Price_Log.filter((record) => {
                const recordDate = dayjs(record['Timestamp(UTC+8)']);
                return recordDate.isAfter(startDate.startOf('day')) &&
                        recordDate.isBefore(endDate.endOf('day'));
            });

            // Group prices by hour
            filteredPriceLog.forEach((record) => {
                const date = dayjs(record['Timestamp(UTC+8)']).format('YYYY-MM-DD HH:00');
                if (!priceMap.has(date)) {
                    priceMap.set(date, { open: 0, close: 0, low: Infinity, high: -Infinity, prices: [] });
                }
                const entry = priceMap.get(date)!;
                entry.prices.push(record.Price);
            });

            // Calculate OHLC for each hour
            priceMap.forEach((value) => {
                if (value.prices.length > 0) {
                    value.open = value.prices[0]; // Assuming data is sorted by time, if not we need to sort first
                    value.close = value.prices[value.prices.length - 1];
                    value.low = Math.min(...value.prices);
                    value.high = Math.max(...value.prices);
                }
            });
        }

        const sortedDates = Array.from(dailyMap.keys()).sort();
        const sortedHourlyDates = Array.from(priceMap.keys()).sort();
        
        const chartDataObj = {
            dates: sortedDates,
            hourlyDates: sortedHourlyDates,
            volume: {
                buyUsdt: sortedDates.map(d => dailyMap.get(d)?.buyUsdt || 0),
                sellUsdt: sortedDates.map(d => dailyMap.get(d)?.sellUsdt || 0),
                netFlow: sortedDates.map(d => (dailyMap.get(d)?.buyUsdt || 0) - (dailyMap.get(d)?.sellUsdt || 0)),
            },
            liquidity: {
                addUsdt: sortedDates.map(d => dailyMap.get(d)?.liqAddUsdt || 0),
                removeUsdt: sortedDates.map(d => dailyMap.get(d)?.liqRemoveUsdt || 0),
            },
            sellPressure: {
                tsSell: sortedDates.map(d => dailyMap.get(d)?.tsSellUsdt || 0),
                normalSell: sortedDates.map(d => (dailyMap.get(d)?.sellUsdt || 0) - (dailyMap.get(d)?.tsSellUsdt || 0)),
            },
            price: {
                ohlc: sortedHourlyDates.map(d => {
                    const entry = priceMap.get(d);
                    return entry ? [entry.open, entry.close, entry.low, entry.high] : [0, 0, 0, 0];
                })
            }
        };
        setChartData(chartDataObj);

        // Prepare transaction tables
        const buyTxns = buyDataCurrent.map(r => ({
            address: r.FromAddress || '',
            shitChange: Math.abs(r['SHIT Change'] || 0),
        })).sort((a, b) => b.shitChange - a.shitChange);

        const sellTxns = sellDataCurrent.map(r => ({
            address: r.FromAddress || '',
            shitChange: Math.abs(r['SHIT Change'] || 0),
        })).sort((a, b) => b.shitChange - a.shitChange);

        setBuyTransactions(buyTxns);
        setSellTransactions(sellTxns);
        setIsCalculating(false);
    };

    const commonChartStyle = {
        textStyle: { color: theme.colors.text },
        grid: theme.chart.grid,
        axisLine: { lineStyle: { color: theme.colors.axis } },
        axisLabel: { color: theme.colors.axis },
        splitLine: { lineStyle: { color: theme.colors.grid } }
    };

    const getPriceOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                showContent: true,
                axisPointer: {
                    type: 'cross',
                    label: { backgroundColor: '#2d3436' }
                },
                formatter: (params: any) => {
                    let result = params[0].name + '<br/>';
                    params.forEach((param: any) => {
                        if (param.seriesType === 'candlestick') {
                            result += 'Open: ' + formatDecimal(param.data[1]) + '<br/>';
                            result += 'Close: ' + formatDecimal(param.data[2]) + '<br/>';
                            result += 'Low: ' + formatDecimal(param.data[3]) + '<br/>';
                            result += 'High: ' + formatDecimal(param.data[4]) + '<br/>';
                        } else {
                            result += param.marker + param.seriesName + ': ' + formatDecimal(param.value) + '<br/>';
                        }
                    });
                    return result;
                }
            },
            grid: commonChartStyle.grid,
            xAxis: {
                type: 'category',
                data: chartData.hourlyDates,
                axisLine: commonChartStyle.axisLine,
                axisLabel: commonChartStyle.axisLabel
            },
            yAxis: {
                scale: true,
                axisLine: commonChartStyle.axisLine,
                axisLabel: { ...commonChartStyle.axisLabel, formatter: formatNumber },
                splitLine: commonChartStyle.splitLine
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 50,
                    end: 100
                },
                {
                    show: false,
                    type: 'slider',
                    top: '90%',
                    start: 50,
                    end: 100
                }
            ],
            series: [
                {
                    type: 'candlestick',
                    data: chartData.price.ohlc,
                    itemStyle: {
                        color: '#55efc4', // Low Saturation Green
                        color0: '#ff7675', // Low Saturation Red
                        borderColor: '#55efc4',
                        borderColor0: '#ff7675'
                    }
                }
            ]
        };
    };

    const getVolumeOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: getTooltipOption(),
            legend: {
                data: ['Buy Volume', 'Sell Volume', 'Net Flow'],
                textStyle: { color: theme.colors.primary },
                top: 0
            },
            grid: commonChartStyle.grid,
            xAxis: {
                type: 'category',
                data: chartData.dates,
                axisLine: commonChartStyle.axisLine,
                axisLabel: commonChartStyle.axisLabel
            },
            yAxis: [
                getYAxisOption('Volume (USDT)', theme.colors.primary),
                {
                    ...getYAxisOption('Net Flow', theme.colors.primary),
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: 'Buy Volume',
                    data: chartData.volume.buyUsdt,
                    ...getBarSeriesStyle(theme.colors.primary),
                },
                {
                    name: 'Sell Volume',
                    data: chartData.volume.sellUsdt,
                    ...getBarSeriesStyle(theme.colors.secondary),
                },
                {
                    name: 'Net Flow',
                    yAxisIndex: 1,
                    data: chartData.volume.netFlow,
                    ...getLineSeriesStyle('#ffeaa7'),
                    lineStyle: { width: 2, type: 'dashed', color: '#ffeaa7' },
                    areaStyle: undefined, // No area for net flow
                }
            ]
        };
    };

    const getLiquidityOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: getTooltipOption(),
            legend: {
                data: ['Add Liquidity', 'Remove Liquidity'],
                textStyle: { color: theme.colors.primary },
                top: 0
            },
            grid: commonChartStyle.grid,
            xAxis: {
                type: 'category',
                data: chartData.dates,
                axisLine: commonChartStyle.axisLine,
                axisLabel: commonChartStyle.axisLabel
            },
            yAxis: getYAxisOption(),
            series: [
                {
                    name: 'Add Liquidity',
                    data: chartData.liquidity.addUsdt,
                    ...getBarSeriesStyle(theme.colors.primary),
                },
                {
                    name: 'Remove Liquidity',
                    data: chartData.liquidity.removeUsdt,
                    ...getBarSeriesStyle(theme.colors.secondary),
                }
            ]
        };
    };

    const getSellPressureOption = () => {
        if (!chartData) return {};
        return {
            backgroundColor: 'transparent',
            tooltip: getTooltipOption(),
            legend: {
                data: ['TS Sell (13k-20k)', 'Other Sell'],
                textStyle: { color: theme.colors.primary },
                top: 0
            },
            grid: commonChartStyle.grid,
            xAxis: {
                type: 'category',
                data: chartData.dates,
                axisLine: commonChartStyle.axisLine,
                axisLabel: commonChartStyle.axisLabel
            },
            yAxis: getYAxisOption(),
            series: [
                {
                    name: 'TS Sell (13k-20k)',
                    data: chartData.sellPressure.tsSell,
                    ...getBarSeriesStyle(theme.colors.primary),
                    stack: 'total',
                },
                {
                    name: 'Other Sell',
                    data: chartData.sellPressure.normalSell,
                    ...getBarSeriesStyle(theme.colors.secondary),
                    stack: 'total',
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
                <div style={{ marginTop: 16, color: theme.colors.text, fontSize: '16px' }}>
                    正在计算DeFi数据...
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <Alert
                title="暂无数据"
                description="当前时间段内没有DeFi数据"
                type="info"
                showIcon
                style={{ margin: 16 }}
            />
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <h2
                style={{
                    color: theme.colors.primary,
                    marginTop: 0,
                    marginBottom: '24px',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontSize: '1.5rem',
                }}
            >
                DeFi Data (UTC+8 00:00)
            </h2>

            {/* DeFi Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="买入SHIT量"
                        value={metrics?.buyShitAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.buyShitAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="卖出SHIT量"
                        value={metrics?.sellShitAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.sellShitAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="买入总笔数"
                        value={metrics?.buyCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.buyCountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="卖出总笔数"
                        value={metrics?.sellCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.sellCountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="总买入金额（USDT）"
                        value={metrics?.buyUsdtAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.buyUsdtAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="卖出总金额（USDT）"
                        value={metrics?.sellUsdtAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.sellUsdtAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="TS卖出SHIT量"
                        value={metrics?.tsSellShitAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.tsSellShitAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="TS卖出总金额（USDT）"
                        value={metrics?.tsSellUsdtAmountCurrent || 0}
                        precision={2}
                        prevValue={metrics?.tsSellUsdtAmountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="添加流动性 (USDT)"
                        value={metrics?.liqAddUsdtCurrent || 0}
                        precision={2}
                        prevValue={metrics?.liqAddUsdtPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="移除流动性 (USDT)"
                        value={metrics?.liqRemoveUsdtCurrent || 0}
                        precision={2}
                        prevValue={metrics?.liqRemoveUsdtPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="添加流动性笔数"
                        value={metrics?.liqAddCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.liqAddCountPrev}
                    />
                </Col>
                <Col xs={24} sm={12} md={6} lg={6}>
                    <StatisticCard
                        title="移除流动性笔数"
                        value={metrics?.liqRemoveCountCurrent || 0}
                        precision={0}
                        prevValue={metrics?.liqRemoveCountPrev}
                    />
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={24}>
                    <Card
                        title={<span style={{ color: theme.colors.primary }}>SHIT Price</span>}
                        style={theme.card}
                        headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                    >
                    <ReactECharts option={getPriceOption()} style={{ height: '400px' }} />
                </Card>
            </Col>

            <Col span={24}>
                <Card 
                    title={<span style={{ color: theme.colors.primary }}>Trading Volume & Net Flow</span>}
                    style={theme.card}
                    headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                >
                    <ReactECharts option={getVolumeOption()} style={{ height: '400px' }} />
                </Card>
            </Col>

            <Col span={12}>
                <Card 
                    title={<span style={{ color: theme.colors.primary }}>Liquidity Operations</span>}
                    style={theme.card}
                    headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                >
                    <ReactECharts option={getLiquidityOption()} style={{ height: '400px' }} />
                </Card>
            </Col>

            <Col span={12}>
                <Card 
                    title={<span style={{ color: theme.colors.primary }}>Sell Pressure Analysis</span>}
                    style={theme.card}
                    headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                >
                    <ReactECharts option={getSellPressureOption()} style={{ height: '400px' }} />
                </Card>
            </Col>
        </Row>            {/* Transaction Tables */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span style={{ color: theme.colors.primary, fontSize: '16px' }}>
                                Buy Transactions
                            </span>
                        }
                        style={theme.card}
                        headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                    >
                        {buyTransactions.length > 0 ? (
                            <Table
                                dataSource={buyTransactions}
                                columns={[
                                    {
                                        title: '地址',
                                        dataIndex: 'address',
                                        key: 'address',
                                        ellipsis: true,
                                        width: '70%',
                                    },
                                    {
                                        title: 'SHIT Change',
                                        dataIndex: 'shitChange',
                                        key: 'shitChange',
                                        width: '30%',
                                        sorter: (a, b) => b.shitChange - a.shitChange,
                                        render: (value) => formatDecimal(value),
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
                                无买入交易数据
                            </div>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span style={{ color: theme.colors.primary, fontSize: '16px' }}>
                                Sell Transactions
                            </span>
                        }
                        style={theme.card}
                        headStyle={{ borderBottom: `1px solid ${theme.colors.primary}` }}
                    >
                        {sellTransactions.length > 0 ? (
                            <Table
                                dataSource={sellTransactions}
                                columns={[
                                    {
                                        title: '地址',
                                        dataIndex: 'address',
                                        key: 'address',
                                        ellipsis: true,
                                        width: '70%',
                                    },
                                    {
                                        title: 'SHIT Change',
                                        dataIndex: 'shitChange',
                                        key: 'shitChange',
                                        width: '30%',
                                        sorter: (a, b) => b.shitChange - a.shitChange,
                                        render: (value) => formatDecimal(value),
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
                                无卖出交易数据
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DeFiSection;