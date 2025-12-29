/**
 * ECharts 主题和工具函数
 * 支持深色/浅色模式自动适配
 */

// 获取 CSS 变量的计算值
export const getCSSColorValue = (varName: string): string => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value;
};

// 颜色配置 - 从 index.css 中的 CSS 变量获取
export const chartColors = {
  chart1: 'var(--chart-1)',
  chart2: 'var(--chart-2)',
  chart3: 'var(--chart-3)',
  chart4: 'var(--chart-4)',
  chart5: 'var(--chart-5)',
  destructive: 'var(--destructive)',
  primary: 'var(--primary)',
};

// 获取 ECharts 主题配置
export const getEchartsTheme = () => {
  // 计算 CSS 变量的实际值
  const colors = [
    getCSSColorValue('--chart-1'),
    getCSSColorValue('--chart-2'),
    getCSSColorValue('--chart-3'),
    getCSSColorValue('--chart-4'),
    getCSSColorValue('--chart-5'),
    getCSSColorValue('--destructive'),
    getCSSColorValue('--primary'),
  ];
  
  const textColor = getCSSColorValue('--foreground');
  const borderColor = getCSSColorValue('--border');
  const cardColor = getCSSColorValue('--card');

  return {
    backgroundColor: 'transparent',
    colors,
    textStyle: {
      color: textColor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    title: {
      textStyle: {
        color: textColor,
        fontSize: 14,
        fontWeight: 'bold',
      },
    },
    line: {
      itemStyle: {
        borderWidth: 1,
      },
      lineStyle: {
        width: 2,
      },
      symbolSize: 4,
      smooth: true,
    },
    grid: {
      borderColor,
    },
    xAxis: {
      type: 'category',
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisLabel: {
        color: textColor,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed',
        },
      },
    },
    yAxis: {
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisLabel: {
        color: textColor,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed',
        },
      },
    },
    tooltip: {
      backgroundColor: cardColor,
      borderColor,
      textStyle: {
        color: textColor,
      },
    },
    legend: {
      textStyle: {
        color: textColor,
      },
      backgroundColor: 'transparent',
    },
  };
};

// 格式化数字 - 支持自定义精度的紧凑格式（K, M, B, T）
export const formatNumberCompact = (value: number | undefined | null, precision: number = 2): string => {
  if (value === undefined || value === null || value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  // 定义单位：K (千), M (百万), B (十亿), T (万亿)
  if (absValue >= 1e12) {
    return sign + (absValue / 1e12).toFixed(precision) + 'T';
  } else if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(precision) + 'B';
  } else if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(precision) + 'M';
  } else if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(precision) + 'K';
  }
  
  return value.toFixed(precision);
};

// 格式化数字 - 保持原有行为，用于向后兼容
export const formatNumber = (value: number): string => {
  return formatNumberCompact(value, 2);
};

// 格式化百分比
export const formatPercent = (value: number, decimals: number = 2): string => {
  return (value * 100).toFixed(decimals) + '%';
};
