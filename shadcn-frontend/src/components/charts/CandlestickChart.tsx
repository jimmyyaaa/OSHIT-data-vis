/**
 * CandlestickChart Component
 * K线图 - 用于显示OHLC（开、收、低、高）数据
 * 样式与旧前端保持一致
 */

import React from 'react';
import * as echarts from 'echarts';
import { useTheme } from '@/contexts/ThemeContext';
import { getEchartsTheme } from './utils';
import { Card } from '@/components/ui/card';

interface HourlyPriceData {
  time: string;
  ohlc: [number, number, number, number]; // [open, close, low, high]
}

interface CandlestickChartProps {
  title?: string;
  data: HourlyPriceData[];
  height?: number;
}

/**
 * 将 HourlyPriceData 格式转换为 ECharts candlestick 数据格式
 * ECharts candlestick 需要 [open, close, low, high]
 */
const transformCandleData = (data: HourlyPriceData[]) => {
  return data.map((item) => ({
    time: item.time,
    value: item.ohlc, // [open, close, low, high]
  }));
};

// 格式化小数点为4位
const formatDecimal = (value: number | undefined, decimals = 4): string => {
  if (value === undefined || value === null) return 'N/A';
  return parseFloat(value.toString()).toFixed(decimals);
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  title = 'SHIT Price K线',
  data = [],
  height = 400,
}) => {
  const { isDark } = useTheme();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const theme = getEchartsTheme();

  React.useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chartInstance = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

    // 转换数据格式
    const candleData = transformCandleData(data);
    const times = candleData.map((item) => item.time);
    const ohlcValues = candleData.map((item) => item.value);

    const option: echarts.EChartsOption = {
      ...theme,
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            textStyle: {
              color: theme.textStyle?.color || '#000',
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            if (param.seriesType === 'candlestick') {
              result += 'Open: ' + formatDecimal(param.data[0]) + '<br/>';
              result += 'Close: ' + formatDecimal(param.data[1]) + '<br/>';
              result += 'Low: ' + formatDecimal(param.data[2]) + '<br/>';
              result += 'High: ' + formatDecimal(param.data[3]) + '<br/>';
            }
          });
          return result;
        },
      },
      grid: {
        top: title ? '15%' : '10%',
        bottom: '10%',
        left: '5%',
        right: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        scale: true,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100,
        },
        {
          type: 'slider',
          show: false,
          top: '90%',
          start: 50,
          end: 100,
        },
      ],
      series: [
        {
          type: 'candlestick',
          data: ohlcValues,
          itemStyle: {
            color: '#55efc4', // Low Saturation Green (up)
            color0: '#ff7675', // Low Saturation Red (down)
            borderColor: '#55efc4',
            borderColor0: '#ff7675',
          },
        },
      ],
    };

    chartInstance.setOption(option);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.resize();
    });
    
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chartInstance.dispose();
    };
  }, [data, isDark, theme]);

  return (
    <Card className="p-4">
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </Card>
  );
};

export default CandlestickChart;
