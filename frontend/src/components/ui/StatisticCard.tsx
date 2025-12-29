import React from 'react';
import { Card, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DashOutlined } from '@ant-design/icons';
import type { CardProps } from 'antd';
import { theme, formatDecimal, cardStyles } from '../../theme';

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
            icon: isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
            color: isPositive ? '#00FFA3' : '#FF4B4B',
            backgroundColor: isPositive
                ? 'rgba(0, 255, 163, 0.2)'
                : 'rgba(255, 75, 75, 0.2)',
        };
    };

    const change = calculateChange();
    const formattedValue = Number(value).toLocaleString('en-US', { maximumFractionDigits: precision });

    const statisticCardStyles: CardProps['styles'] = {
        root: cardStyles.root,
        body: cardStyles.body,
    };

    return (
        <Card styles={statisticCardStyles}>
            {/* 标题 */}
            <Tooltip title={title} color={theme.colors.textSecondary}>
                <div 
                    style={{ 
                        color: theme.colors.textSecondary,
                        fontSize: '12px',
                        marginBottom: '8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {title}
                </div>
            </Tooltip>

            {/* 数值 */}
            <Tooltip title={formattedValue} color={theme.colors.primary}>
                <div 
                    style={{ 
                        color: theme.colors.primary,
                        fontSize: '24px',
                        fontWeight: 'bold',
                        marginBottom: '0px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {formattedValue}
                </div>
            </Tooltip>

            {/* 变化率 */}
            {showChange && change && (
                <div
                    style={{
                        marginTop: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: change.backgroundColor,
                        fontSize: '14px',
                        color: change.color,
                    }}
                >
                    <span style={{ marginRight: 4, display: 'flex', alignItems: 'center' }}>
                        {change.icon}
                    </span>
                    {formatDecimal(change.percent)}%
                </div>
            )}
            {showChange && !change && (
                <div
                    style={{
                        marginTop: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '12px',
                        color: '#888',
                    }}
                >
                    <span style={{ marginRight: 4, display: 'flex', alignItems: 'center' }}>
                        <DashOutlined />
                    </span>
                    NA
                </div>
            )}
        </Card>
    );
};

export default StatisticCard;
