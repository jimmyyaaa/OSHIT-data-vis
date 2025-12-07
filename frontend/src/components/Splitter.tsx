import React, { useState, useCallback, useRef } from 'react';

interface SplitterProps {
  direction?: 'horizontal' | 'vertical';
  onSplit?: (ratio: number) => void;
  minRatio?: number;
  maxRatio?: number;
}

const Splitter: React.FC<SplitterProps> = ({
  direction = 'vertical',
  onSplit,
  minRatio = 0.3,
  maxRatio = 0.8,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let newRatio: number;

    if (direction === 'vertical') {
      const relativeX = e.clientX - rect.left;
      newRatio = relativeX / rect.width;
    } else {
      const relativeY = e.clientY - rect.top;
      newRatio = relativeY / rect.height;
    }

    // 限制在最小和最大比例之间
    newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
    
    onSplit?.(newRatio);
  }, [isDragging, direction, minRatio, maxRatio, onSplit]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        cursor: direction === 'vertical' ? 'col-resize' : 'row-resize',
        width: direction === 'vertical' ? '6px' : '100%',
        height: direction === 'vertical' ? '100%' : '6px',
        background: isDragging 
          ? 'linear-gradient(90deg, #00ffff, #0080ff)'
          : 'linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(0, 128, 255, 0.3))',
        borderRadius: '3px',
        transition: isDragging ? 'none' : 'background 0.2s ease',
        zIndex: 100,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 拖拽指示器 */}
      <div
        style={{
          width: direction === 'vertical' ? '2px' : '20px',
          height: direction === 'vertical' ? '20px' : '2px',
          background: '#00ffff',
          borderRadius: '1px',
          opacity: isDragging ? 1 : 0.6,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
};

export default Splitter;