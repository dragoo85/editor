import React from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import {
  LayoutGrid,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Columns,
  Download,
  Copy,
  Scissors,
  Layers,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface TopNavProps {
  onOpenExport: () => void;
  onOpenSync: () => void;
  onOpenImport: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenExport, onOpenSync, onOpenImport }) => {
  const { activeView, setActiveView, photos, selectedPhotoIds } = useCatalogStore();
  const {
    undo,
    redo,
    history,
    historyIndex,
    isBeforeAfter,
    toggleBeforeAfter,
    activeTool,
    setActiveTool,
    resetAll,
    zoom,
    setZoom
  } = useEditStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleZoom = (factor: number) => {
    setZoom(Math.max(0.1, Math.min(8.0, zoom * factor)));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  return (
    <div className="h-11 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4 select-none z-40">
      {/* Module Switches (Library / Develop) */}
      <div className="flex items-center gap-1 bg-dark-950 p-0.5 rounded-md border border-dark-800">
        <button
          onClick={() => setActiveView('library')}
          className={'flex items-center gap-2 px-4 py-1 rounded text-xs font-semibold transition-all ' + (
            activeView === 'library'
              ? 'bg-accent-blue text-white shadow-sm'
              : 'text-dark-400 hover:text-dark-200'
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          LIBRARY
        </button>
        <button
          onClick={() => setActiveView('develop')}
          className={'flex items-center gap-2 px-4 py-1 rounded text-xs font-semibold transition-all ' + (
            activeView === 'develop'
              ? 'bg-accent-blue text-white shadow-sm'
              : 'text-dark-400 hover:text-dark-200'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          DEVELOP
        </button>
      </div>

      {/* Develop Tools & View Modes (When in Develop View) */}
      {activeView === 'develop' ? (
        <div className="flex items-center gap-2">
          {/* Active Tool Selectors */}
          <div className="flex items-center bg-dark-850 rounded p-0.5 border border-dark-750">
            <button
              onClick={() => setActiveTool('select')}
              className={'p-1.5 rounded transition-colors ' + (activeTool === 'select' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
              title="Adjust / Pan (V)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('crop')}
              className={'p-1.5 rounded transition-colors ' + (activeTool === 'crop' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
              title="Crop & Straighten (C)"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('mask')}
              className={'p-1.5 rounded transition-colors ' + (activeTool === 'mask' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
              title="Masking (M)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('heal')}
              className={'p-1.5 rounded transition-colors ' + (activeTool === 'heal' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
              title="Spot Healing & Clone (H)"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-dark-800 mx-1" />

          {/* Before/After Split */}
          <button
            onClick={toggleBeforeAfter}
            className={'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ' + (
              isBeforeAfter
                ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
                : 'bg-dark-850 border-dark-750 text-dark-300 hover:text-white'
            )}
            title="Before / After Split ()"
          >
            <Columns className="w-3.5 h-3.5" />
            Before/After
          </button>

          {/* Zoom controls with 100%, 200%, 400% Inspection presets */}
          <div className="flex items-center bg-dark-850 rounded border border-dark-750 text-xs">
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1 text-dark-400 hover:text-white px-1.5"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={handleResetZoom}
              className="font-mono text-[11px] text-dark-300 hover:text-white cursor-pointer px-1.5 border-x border-dark-750"
              title="Click to reset zoom (100%)"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(1.25)}
              className="p-1 text-dark-400 hover:text-white px-1.5"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center border-l border-dark-750 text-[10px] font-mono">
              <button
                onClick={() => setZoom(1.0)}
                className={'px-1 py-0.5 hover:text-white transition-colors ' + (zoom === 1.0 ? 'text-accent-blue font-bold' : 'text-dark-400')}
                title="100% Pixel Inspection"
              >
                100%
              </button>
              <button
                onClick={() => setZoom(2.0)}
                className={'px-1 py-0.5 hover:text-white transition-colors ' + (zoom === 2.0 ? 'text-accent-blue font-bold' : 'text-dark-400')}
                title="200% Boundary Inspection"
              >
                200%
              </button>
              <button
                onClick={() => setZoom(4.0)}
                className={'px-1 py-0.5 hover:text-white transition-colors ' + (zoom === 4.0 ? 'text-accent-blue font-bold' : 'text-dark-400')}
                title="400% Sub-Pixel Inspection"
              >
                400%
              </button>
            </div>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded bg-dark-850 border border-dark-750 text-dark-300 hover:text-white disabled:opacity-35 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded bg-dark-850 border border-dark-750 text-dark-300 hover:text-white disabled:opacity-35 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetAll}
              className="p-1.5 rounded bg-dark-850 border border-dark-750 text-dark-400 hover:text-rose-400 transition-colors ml-1"
              title="Reset All Adjustments"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-400">
            {photos.length} photo{photos.length === 1 ? '' : 's'} cataloged
          </span>
        </div>
      )}

      {/* Global Actions (Sync, Import, Export) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenImport}
          className="px-3 py-1 bg-dark-800 hover:bg-dark-750 text-dark-200 border border-dark-700 rounded text-xs font-medium transition-colors"
        >
          Import Photos
        </button>

        {photos.length > 1 && (
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-1 bg-dark-800 hover:bg-dark-750 text-dark-200 border border-dark-700 rounded text-xs font-medium transition-colors"
            title="Sync adjustments across selected photos"
          >
            <Copy className="w-3.5 h-3.5 text-accent-blue" />
            Sync Settings
          </button>
        )}

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1 bg-accent-blue hover:bg-blue-600 text-white rounded text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </div>
  );
};
