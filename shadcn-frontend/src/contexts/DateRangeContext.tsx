/**
 * 日期范围全局 Context
 * 为所有 Statistics section 页面提供共享的时间选择器状态
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getDefaultDateRange, formatDate } from '@/services/dataService';

interface DateRangeContextType {
  startDate: string;
  endDate: string;
  setDateRange: (start: string, end: string) => void;
  handleDateChange: (startDate: Date, endDate: Date) => void;
  resetToDefault: () => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const setDateRange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleDateChange = useCallback((start: Date, end: Date) => {
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);
    setDateRange(formattedStart, formattedEnd);
  }, [setDateRange]);

  const resetToDefault = useCallback(() => {
    setDateRange(defaultStart, defaultEnd);
  }, [setDateRange, defaultStart, defaultEnd]);

  return (
    <DateRangeContext.Provider
      value={{
        startDate,
        endDate,
        setDateRange,
        handleDateChange,
        resetToDefault,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within DateRangeProvider');
  }
  return context;
};
