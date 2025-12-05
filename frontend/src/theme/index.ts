export const theme = {
    colors: {
        primary: '#00FFFF', // Cyan
        secondary: '#FF69B4', // Hot Pink (replacing Purple)
        text: '#00FFFF',
        textSecondary: '#FF69B4',
        grid: 'rgba(0, 255, 255, 0.1)',
        tooltipBg: 'rgba(0, 5, 15, 0.95)',
        axis: '#00FFFF',
    },
    card: {
        background: 'rgba(0, 10, 20, 0.8)',
        border: '2px solid #00FFFF',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
        borderRadius: '8px',
    },
    chart: {
        grid: {
            top: '3%',
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: false,
        },
        textStyle: {
            color: '#00FFFF',
        },
    }
};

export const getCommonChartOptions = () => ({
    backgroundColor: 'transparent',
    tooltip: {
        trigger: 'axis',
        backgroundColor: theme.colors.tooltipBg,
        borderColor: theme.colors.primary,
        borderWidth: 1,
        textStyle: { color: theme.colors.primary },
        axisPointer: {
            type: 'cross',
            lineStyle: {
                color: theme.colors.primary,
                width: 1,
                opacity: 0.6,
            },
        },
    },
    grid: theme.chart.grid,
    textStyle: theme.chart.textStyle,
    xAxis: {
        axisLine: { lineStyle: { color: theme.colors.axis } },
        axisLabel: { color: theme.colors.axis },
        axisTick: { lineStyle: { color: theme.colors.axis } },
        splitLine: { show: false },
    },
    yAxis: {
        axisLine: { lineStyle: { color: theme.colors.axis } },
        axisLabel: { color: theme.colors.axis },
        axisTick: { lineStyle: { color: theme.colors.axis } },
        splitLine: {
            lineStyle: {
                color: theme.colors.grid,
                type: 'dashed',
            },
        },
    },
});

export const getTooltipOption = (numberFormatter: (val: number) => string = formatDecimal) => ({
    trigger: 'axis',
    backgroundColor: theme.colors.tooltipBg,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    textStyle: { color: theme.colors.primary },
    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
    formatter: (params: any) => {
        if (!Array.isArray(params)) {
            return params.name + '<br/>' + params.marker + params.seriesName + ': ' + numberFormatter(params.value) + '<br/>';
        }
        let result = params[0].name + '<br/>';
        params.forEach((param: any) => {
            result += param.marker + param.seriesName + ': ' + numberFormatter(param.value) + '<br/>';
        });
        return result;
    }
});

export const getYAxisOption = (name?: string, color = theme.colors.primary, formatter = formatNumber) => ({
    type: 'value',
    name: name,
    max: getChartMax,
    nameTextStyle: { color: color },
    axisLabel: { 
        color: color,
        formatter: formatter
    },
    axisLine: { lineStyle: { color: color } },
    splitLine: { lineStyle: { color: theme.colors.grid, type: 'dashed' } }
});

export const getBarSeriesStyle = (color = theme.colors.primary) => ({
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

export const getValueAxisStyle = (name?: string) => ({
    type: 'value',
    name: name,
    max: getChartMax,
    nameLocation: 'middle',
    nameGap: 30,
    nameTextStyle: {
        color: theme.colors.primary,
    },
    axisLabel: {
        color: theme.colors.primary,
        formatter: formatNumber,
    },
    axisLine: {
        lineStyle: {
            color: theme.colors.primary,
        },
    },
    splitLine: {
        lineStyle: {
            color: theme.colors.grid,
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

export const getGradientBarData = (data: any[], valueKey: string, startColor = theme.colors.secondary, endColor = theme.colors.primary) => {
    return data.map((item, index) => {
        const color = interpolateColor(
            startColor,
            endColor,
            index / (data.length - 1 || 1)
        );
        return {
            value: item[valueKey],
            itemStyle: {
                color: color,
                shadowColor: color,
                shadowBlur: 10,
                borderColor: color,
                borderWidth: 1
            },
            label: {
                color: color
            },
            // Preserve other properties
            ...item
        };
    });
};

export const getLineSeriesStyle = (color = theme.colors.secondary) => ({
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
