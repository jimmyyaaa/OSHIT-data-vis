import { Loader2 } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AISummarySidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  content?: string;
  isLoading?: boolean;
  error?: string;
  children?: React.ReactNode; // 主内容区域
}

/**
 * AI总结侧边栏 - 可从右侧滑出，用户可拖拽边界调整宽度
 * 使用 ResizablePanelGroup 实现动态调整数据区和AI区的比例
 * 仅显示内容区域，由 SectionToolbar 中的 AI 分析按钮控制打开/关闭
 */
export function AISummarySidebar({
  isOpen,
  content = "AI 分析结果将显示在这里...",
  isLoading = false,
  error,
  children,
}: AISummarySidebarProps) {
  if (!isOpen) {
    return (
      <div className="w-full flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="@container w-full min-h-full">
            {children}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full flex-1 overflow-hidden">
      {/* 主内容区域 - 数据展示 */}
      <ResizablePanel defaultSize={65} minSize={40} maxSize={85} className="relative">
        <ScrollArea className="h-full w-full">
          <div className="@container w-full min-h-full">
            {children}
          </div>
        </ScrollArea>
      </ResizablePanel>

      {/* 可拖拽的分隔线 */}
      <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />

      {/* AI 总结区域 - 从右侧显示 - 仅内容，无 Header 无底部栏 */}
      <ResizablePanel defaultSize={35} minSize={15} maxSize={60}>
        <div className="w-full h-full bg-muted/30 border-l overflow-hidden">
          {/* 内容区域 - 使用 ScrollArea */}
          <ScrollArea className="h-full w-full">
            <div className="p-4 w-full">
              {isLoading ? (
                <div className="w-full flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">分析中...</p>
                </div>
              ) : error ? (
                <div className="w-full text-sm text-red-500 space-y-2">
                  <p className="font-semibold">出错了</p>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="w-full text-sm space-y-2">
                  {/* Placeholder: 显示为普通文本，待集成真实 Markdown 渲染 */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-muted-foreground">{content}</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
