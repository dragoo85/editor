import React, { useRef, useState, useEffect } from 'react';

interface SplitViewProps {
  splitPosition: number;
  onChangeSplit: (pos: number) => void;
  children: React.ReactNode;
}

export const SplitView: React.FC<SplitViewProps> = ({ splitPosition, onChangeSplit, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    onChangeSplit(Math.max(0.05, Math.min(0.95, pos)));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging) handlePointer(e.clientX);
    };
    const onUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {children}

      {/* Split Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-accent-blue/90 shadow-2xl cursor-ew-resize z-20"
        style={{ left: (splitPosition * 100) + '%' }}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-dark-900 border border-accent-blue flex items-center justify-center shadow-lg">
          <span className="text-[9px] font-bold text-white">?</span>
        </div>

        {/* Labels */}
        <div className="absolute top-4 -left-16 px-2 py-0.5 rounded bg-dark-900/80 backdrop-blur text-[10px] text-dark-300 font-mono">
          BEFORE
        </div>
        <div className="absolute top-4 left-3 px-2 py-0.5 rounded bg-dark-900/80 backdrop-blur text-[10px] text-accent-blue font-mono">
          AFTER
        </div>
      </div>
    </div>
  );
};
