import React, { createContext, useContext, useState } from 'react';
import { zhTranslations } from '@/locales/zh';
import { enTranslations } from '@/locales/en';

type Locale = 'zh' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  getTranslations: () => Record<string, any>;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 从 localStorage 读取保存的语言
    const saved = localStorage.getItem('locale') as Locale | null;
    return saved || 'zh';
  });

  const getTranslations = () => {
    // 返回对应语言的翻译
    return locale === 'zh' ? zhTranslations : enTranslations;
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, getTranslations }}>
      {children}
    </LocaleContext.Provider>
  );
};

// 自定义 Hook
export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
};
