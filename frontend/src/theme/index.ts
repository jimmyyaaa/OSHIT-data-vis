/**
 * 颜色常量 - 符合 Ant Design 设计语言
 */
export const colors = {
  primary: '#00FFFF',
  secondary: '#FF69B4',
  success: '#00FFA3',
  error: '#FF4B4B',
  warning: '#FFAA00',
  text: '#00FFFF', // 向后兼容
  textPrimary: '#00FFFF',
  textSecondary: '#FF69B4',
  textTertiary: 'rgba(0, 255, 255, 0.45)',
  grid: 'rgba(0, 255, 255, 0.1)',
  tooltipBg: 'rgba(0, 5, 15, 0.95)',
  axis: '#00FFFF',
  borderColor: '#00FFFF',
  borderColorLight: 'rgba(0, 255, 255, 0.2)',
  bgDark: 'rgba(0, 10, 20, 0.8)',
  bgDarker: 'rgba(0, 15, 30, 0.9)',
};

/**
 * 卡片样式配置（用于Card组件的styles属性）
 */
export const cardStyles = {
  root: {
    background: colors.bgDark,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
    boxShadow: `0 0 15px rgba(0, 255, 255, 0.2)`,
    backdropFilter: 'blur(10px)',
  },
  body: {
    padding: '16px',
  },
  header: {
    borderBottomColor: `rgba(0, 255, 255, 0.1)`,
    paddingBottom: '12px',
  },
};

/**
 * 图表网格配置
 */
export const chartGrid = {
  top: '3%',
  left: '3%',
  right: '4%',
  bottom: '3%',
  containLabel: false,
};

/**
 * 向后兼容的 theme 对象
 */
export const theme = {
  colors,
  card: cardStyles,
  chart: {
    grid: chartGrid,
    textStyle: {
      color: colors.primary,
    },
  },
};

/**
 * Tooltip 配置工厂函数
 */
export const getTooltipOption = (numberFormatter: (val: number) => string = formatDecimal) => ({
    trigger: 'axis' as const,
    backgroundColor: colors.tooltipBg,
    borderColor: colors.primary,
    borderWidth: 1,
    textStyle: { color: colors.primary },
    axisPointer: { 
        type: 'cross' as const,
        label: { backgroundColor: '#6a7985' } 
    },
    formatter: (params: any) => {
        if (!Array.isArray(params)) {
            return `${params.name}<br/>${params.marker} ${params.seriesName}: ${numberFormatter(params.value)}<br/>`;
        }
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
            result += `${param.marker} ${param.seriesName}: ${numberFormatter(param.value)}<br/>`;
        });
        return result;
    },
});

/**
 * Y轴配置工厂函数
 */
export const getYAxisOption = (name?: string, color = colors.primary, formatter = formatNumber) => ({
    type: 'value',
    name: name,
    max: getChartMax,
    nameTextStyle: { color: color },
    axisLabel: { 
        color: color,
        formatter: formatter
    },
    axisLine: { lineStyle: { color: color } },
    splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } }
});

/**
 * 柱状图系列样式工厂函数
 */
export const getBarSeriesStyle = (color = colors.primary) => ({
    type: 'bar',
    itemStyle: {
        color: color,
        shadowColor: color,
        shadowBlur: 10,
        borderColor: color,
        borderWidth: 1,
    }
});

export const formatDecimal = (value: number) => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const formatNumber = (value: number) => {
    if (value >= 1000000) {
        return parseFloat((value / 1000000).toFixed(2)).toString() + 'M';
    } else if (value >= 1000) {
        return parseFloat((value / 1000).toFixed(2)).toString() + 'K';
    }
    return formatDecimal(value);
};

export const formatSOL = (value: number) => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

export const formatSOLNumber = (value: number) => {
    if (value >= 1000000) {
        return parseFloat((value / 1000000).toFixed(4)).toString() + 'M';
    } else if (value >= 1000) {
        return parseFloat((value / 1000).toFixed(4)).toString() + 'K';
    }
    return formatSOL(value);
};

export const getChartMax = (value: { max: number }) => {
    return value.max / 0.9;
};

/**
 * 值轴配置工厂函数
 */
export const getValueAxisStyle = (name?: string) => ({
    type: 'value',
    name: name,
    max: getChartMax,
    nameLocation: 'middle',
    nameGap: 30,
    nameTextStyle: {
        color: colors.primary,
    },
    axisLabel: {
        color: colors.primary,
        formatter: formatNumber,
    },
    axisLine: {
        lineStyle: {
            color: colors.primary,
        },
    },
    splitLine: {
        lineStyle: {
            color: colors.grid,
            type: 'dashed',
        },
    },
});

export const interpolateColor = (startColor: string, endColor: string, factor: number) => {
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const c1 = hexToRgb(startColor);
    const c2 = hexToRgb(endColor);

    if (!c1 || !c2) return startColor;

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));

    return `rgb(${r}, ${g}, ${b})`;
};

/**
 * 渐变柱状图数据处理
 */
export const getGradientBarData = (data: any[], valueKey: string, startColor = colors.secondary, endColor = colors.primary) => {
    return data.map((item, index) => {
        const color = interpolateColor(
            startColor,
            endColor,
            index / (data.length - 1 || 1)
        );
        return {
            value: item[valueKey],
            itemStyle: {
                color,
                shadowColor: color,
                shadowBlur: 10,
                borderColor: color,
                borderWidth: 1
            },
            label: {
                color
            },
            // Preserve other properties
            ...item
        };
    });
};

/**
 * 折线图系列样式工厂函数
 */
export const getLineSeriesStyle = (color = colors.secondary) => ({
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
        width: 3,
        color: color,
        shadowColor: color,
        shadowBlur: 10
    },
    itemStyle: {
        color: color,
        borderColor: '#fff',
        borderWidth: 2,
        shadowColor: color,
        shadowBlur: 10
    },
    areaStyle: {
        color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
                { offset: 0, color: color },
                { offset: 1, color: 'rgba(0, 0, 0, 0)' }
            ]
        },
        opacity: 0.3
    }
});
