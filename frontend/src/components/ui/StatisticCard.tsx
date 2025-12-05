import React from 'react';
import { Card, Statistic } from 'antd';
import { theme, formatDecimal } from '../../theme';

interface StatisticCardProps {
    title: string;
    value: number;
    precision?: number;
    prevValue?: number;
    showChange?: boolean;
    useAbsoluteForChange?: boolean;
}

const StatisticCard: React.FC<StatisticCardProps> = ({
    title,
    value,
    precision = 2,
    prevValue,
    showChange = true,
    useAbsoluteForChange = false,
}) => {
    const calculateChange = () => {
        if (!prevValue || prevValue === 0) return null;

        const denominator = useAbsoluteForChange
            ? Math.abs(prevValue)
            : prevValue;
        const changePercent = ((value - prevValue) / denominator) * 100;
        const isPositive = changePercent >= 0;

        return {
            percent: changePercent,
            isPositive,
            arrow: isPositive ? '↑' : '↓',
            color: isPositive ? '#00FFA3' : '#FF4B4B',
            backgroundColor: isPositive
                ? 'rgba(0, 255, 163, 0.1)'
                : 'rgba(255, 75, 75, 0.1)',
        };
    };

    const change = calculateChange();

    return (
        <Card
            style={theme.card}
        >
            <Statistic 
                title={<span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{title}</span>}
                value={value} 
                formatter={(val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: precision })}
                valueStyle={{ color: theme.colors.primary }}
            />
            {showChange && change && (
                <div
                    style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: change.backgroundColor,
                        fontSize: '12px',
                        color: change.color,
                    }}
                >
                    <span style={{ marginRight: 4 }}>{change.arrow}</span>
                    {formatDecimal(change.percent)}%
                </div>
            )}
            {showChange && !change && (
                <div
                    style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '12px',
                        color: '#888',
                    }}
                >
                    <span style={{ marginRight: 4 }}>—</span>
                    NA
                </div>
            )}
        </Card>
    );
};

export default StatisticCard;
