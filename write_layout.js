const fs = require('fs');
const path = require('path');

function save(relPath, content) {
  const full = path.resolve(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Saved:', relPath);
}

// 1. TitleBar.tsx
save('src/components/layout/TitleBar.tsx', `import React from 'react';
import { Aperture, Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-dark-950 border-b border-dark-850 flex items-center justify-between px-3 select-none z-50">
      {/* App Logo & Title */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center shadow-sm">
          <Aperture className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-dark-200">
          LUMINA <span className="text-accent-blue font-normal">PHOTO STUDIO</span>
        </span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-dark-800 text-[10px] text-dark-400 font-mono">
          OFFLINE PRO
        </span>
      </div>

      {/* Center Drag Region */}
      <div className="flex-1 h-full flex items-center justify-center text-[11px] text-dark-400 font-medium pointer-events-none">
        Catalog / Non-Destructive RAW Editor
      </div>

      {/* Windows Window Controls */}
      <div className="flex items-center">
        <button
          onClick={() => (window as any).electronAPI?.minimize?.()}
          className="h-8 px-3 text-dark-400 hover:text-white hover:bg-dark-800 flex items-center justify-center transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.maximize?.()}
          className="h-8 px-3 text-dark-400 hover:text-white hover:bg-dark-800 flex items-center justify-center transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.close?.()}
          className="h-8 px-3 text-dark-400 hover:text-white hover:bg-rose-600 flex items-center justify-center transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
`);

// 2. TopNav.tsx
save('src/components/layout/TopNav.tsx', `import React from 'react';
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
            title="Before / After Split (\)"
          >
            <Columns className="w-3.5 h-3.5" />
            Before/After
          </button>

          {/* Zoom controls */}
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
`);

// 3. Filmstrip.tsx
save('src/components/layout/Filmstrip.tsx', `import React, { useRef, useEffect } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { Star, Flag, Check, X as RejectIcon } from 'lucide-react';
import { FlagType, ColorLabel } from '../../types/image';

const COLOR_MAP: Record<ColorLabel, string> = {
  none: 'transparent',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7'
};

export const Filmstrip: React.FC = () => {
  const {
    photos,
    selectedPhotoIds,
    activePhotoId,
    setActivePhoto,
    toggleSelectPhoto,
    updatePhotoRating,
    updatePhotoFlag,
    updatePhotoColorLabel
  } = useCatalogStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active photo into view
  useEffect(() => {
    if (activePhotoId && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-photo-id="' + activePhotoId + '"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activePhotoId]);

  if (photos.length === 0) return null;

  return (
    <div className="h-28 bg-dark-950 border-t border-dark-850 flex flex-col select-none z-30">
      {/* Filmstrip Reel Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-dark-900/60 border-b border-dark-850 text-[10px] text-dark-400">
        <span>FILMSTRIP ({photos.length} photos)</span>
        <div className="flex items-center gap-2">
          <span>Shortcuts: <strong>1-5</strong> Rating, <strong>P</strong> Pick, <strong>X</strong> Reject, <strong>U</strong> Unflag</span>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div ref={scrollRef} className="flex-1 flex items-center gap-2 px-3 overflow-x-auto overflow-y-hidden py-1.5 scrollbar-thin">
        {photos.map((photo, idx) => {
          const isActive = photo.id === activePhotoId;
          const isSelected = selectedPhotoIds.includes(photo.id);

          return (
            <div
              key={photo.id}
              data-photo-id={photo.id}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  toggleSelectPhoto(photo.id, true);
                } else {
                  setActivePhoto(photo.id);
                }
              }}
              className={'group relative flex-shrink-0 w-24 h-20 bg-dark-900 rounded border overflow-hidden cursor-pointer transition-all ' + (
                isActive
                  ? 'border-accent-blue ring-2 ring-accent-blue/30 shadow-lg'
                  : isSelected
                  ? 'border-white/60 bg-dark-800'
                  : 'border-dark-800 hover:border-dark-600'
              )}
            >
              {/* Thumbnail Image */}
              <img
                src={photo.thumbnailUrl}
                alt={photo.filename}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Color Label indicator bottom bar */}
              {photo.colorLabel !== 'none' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 z-10"
                  style={{ backgroundColor: COLOR_MAP[photo.colorLabel] }}
                />
              )}

              {/* Rating overlay stars */}
              <div className="absolute top-1 left-1 flex items-center gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-950/75 px-1 py-0.5 rounded backdrop-blur-xs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={(e) => {
                      e.stopPropagation();
                      updatePhotoRating(photo.id, photo.rating === star ? 0 : star);
                    }}
                    className={'p-0 hover:scale-125 transition-transform ' + (
                      photo.rating >= star ? 'text-amber-400' : 'text-dark-500'
                    )}
                  >
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </button>
                ))}
              </div>

              {/* Flag Badge indicator */}
              {photo.flag !== 'none' && (
                <div className={'absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold z-10 flex items-center gap-0.5 ' + (
                  photo.flag === 'pick'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                )}>
                  {photo.flag === 'pick' ? <Check className="w-2.5 h-2.5" /> : <RejectIcon className="w-2.5 h-2.5" />}
                </div>
              )}

              {/* Star count if rated and not hovered */}
              {photo.rating > 0 && (
                <div className="absolute bottom-1.5 left-1 px-1 py-0.2 rounded bg-dark-950/80 text-amber-400 flex items-center gap-0.5 text-[9px] font-mono group-hover:opacity-0">
                  <Star className="w-2 h-2 fill-current" />
                  <span>{photo.rating}</span>
                </div>
              )}

              {/* Filename index badge */}
              <div className="absolute bottom-1 right-1 text-[8px] font-mono text-dark-300 bg-dark-950/70 px-1 rounded">
                #{idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
`);

// 4. StatusBar.tsx
save('src/components/layout/StatusBar.tsx', `import React from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { photos, selectedPhotoIds, activePhotoId } = useCatalogStore();
  const { zoom, developState } = useEditStore();

  const activePhoto = photos.find(p => p.id === activePhotoId);

  return (
    <div className="h-6 bg-dark-950 border-t border-dark-850 flex items-center justify-between px-3 text-[11px] text-dark-400 select-none z-30">
      {/* Active Photo Info */}
      <div className="flex items-center gap-3">
        {activePhoto ? (
          <>
            <span className="text-dark-200 font-medium">{activePhoto.filename}</span>
            <span>{activePhoto.width} � {activePhoto.height} px</span>
            {activePhoto.exif?.iso && (
              <span className="font-mono">ISO {activePhoto.exif.iso}</span>
            )}
            {activePhoto.exif?.fNumber && (
              <span className="font-mono">{activePhoto.exif.fNumber}</span>
            )}
            {activePhoto.exif?.exposureTime && (
              <span className="font-mono">{activePhoto.exif.exposureTime}s</span>
            )}
          </>
        ) : (
          <span>No photo selected</span>
        )}
      </div>

      {/* Performance & Status Badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-dark-300">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>GPU Acceleration (WebGL2 Float32)</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Offline & Private</span>
        </div>
        <span className="font-mono text-dark-300">Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
`);

console.log('Layout components generated.');
