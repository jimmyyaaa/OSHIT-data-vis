import { useState } from 'react';
import { dataService } from '../services/dataService';

/**
 * AI 分析上下文数据的类型定义
 * 可以包含任意结构的数据，取决于特定 section 的需求
 */
export type AIAnalysisContext = Record<string, any>;

/**
 * useAISummary Hook 的返回类型
 */
export interface UseAISummaryReturn {
  /** AI 侧边栏是否可见 */
  aiVisible: boolean;
  /** 设置 AI 侧边栏的可见性 */
  setAiVisible: (visible: boolean) => void;
  /** AI 分析结果（Markdown 格式） */
  aiSummary: string;
  /** AI 是否正在加载中 */
  aiLoading: boolean;
  /** AI 分析出错时的错误信息 */
  aiError: string | null;
  /** 触发 AI 分析的函数 */
  handleAnalyze: (context: AIAnalysisContext, systemPrompt: string) => Promise<void>;
}

/**
 * useAISummary - 通用的 AI 分析 Hook
 * 
 * 提供统一的状态管理和 API 调用逻辑，各 section 可以通过在调用 handleAnalyze 时传入不同的 systemPrompt 和数据上下文
 * 来实现定制化的 AI 分析功能。
 * 
 * @returns 包含状态和操作函数的对象
 * 
 * @example
 * ```typescript
 * const { aiVisible, setAiVisible, aiSummary, aiLoading, aiError, handleAnalyze } = useAISummary();
 * 
 * // 触发分析，传入 prompt 和数据
 * await handleAnalyze(
 *   {
 *     metrics: { ... },
 *     dailyData: [ ... ],
 *     topUsers: [ ... ]
 *   },
 *   MY_PROMPT
 * );
 * ```
 */
export const useAISummary = (): UseAISummaryReturn => {
    const [aiVisible, setAiVisible] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleAnalyze = async (context: AIAnalysisContext, systemPrompt: string) => {
        setAiVisible(true);
        setAiLoading(true);
        setAiSummary('');
        setAiError(null);

        try {
            const dataContext = JSON.stringify(context);
            const response = await dataService.getAISummary(dataContext, systemPrompt);

            // 响应格式：{ summary: "..." }
            if (response.summary) {
                setAiSummary(response.summary);
            } else {
                setAiError('未收到分析结果');
            }
        } catch (error) {
            console.error('AI Summary failed:', error);
            const errorMessage = error instanceof Error ? error.message : '无法生成AI总结，请稍后重试。';
            setAiError(errorMessage);
        } finally {
            setAiLoading(false);
        }
    };

    return {
        aiVisible,
        setAiVisible,
        aiSummary,
        aiLoading,
        aiError,
        handleAnalyze,
    };
};
