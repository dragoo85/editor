import React, { useState, useEffect } from 'react';
import { Aperture, Minus, Square, Copy, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    window.electronAPI?.isMaximized?.().then((max) => {
      setIsMaximized(max);
    });

    // Listen to maximize / unmaximize events from main process
    const unsubscribe = window.electronAPI?.onMaximizedChange?.((max) => {
      setIsMaximized(max);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleToggleMaximize = () => {
    window.electronAPI?.toggleMaximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  return (
    <div
      className="h-8 bg-dark-950 border-b border-dark-850 flex items-center justify-between px-3 select-none z-50 app-drag"
      onDoubleClick={handleToggleMaximize}
    >
      {/* App Logo & Title (no-drag for interactive clicks if needed) */}
      <div className="flex items-center gap-2 app-no-drag">
        <div className="w-4 h-4 rounded bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center shadow-sm">
          <Aperture className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-dark-200">
          LUMINA <span className="text-accent-blue font-normal">PHOTO STUDIO</span>
        </span>
        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-dark-800 text-[10px] text-dark-400 font-mono">
          OFFLINE PRO
        </span>
      </div>

      {/* Center Drag Region */}
      <div className="flex-1 h-full flex items-center justify-center text-[11px] text-dark-400 font-medium">
        Catalog / Non-Destructive RAW Editor
      </div>

      {/* Windows Window Controls (strictly app-no-drag so clicks register immediately) */}
      <div className="flex items-center app-no-drag">
        <button
          type="button"
          onClick={handleMinimize}
          className="h-8 w-11 text-dark-400 hover:text-white hover:bg-dark-800 flex items-center justify-center transition-colors cursor-pointer outline-none"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="h-8 w-11 text-dark-400 hover:text-white hover:bg-dark-800 flex items-center justify-center transition-colors cursor-pointer outline-none"
          title={isMaximized ? 'Restore Down' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="h-8 w-11 text-dark-400 hover:text-white hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer outline-none"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
