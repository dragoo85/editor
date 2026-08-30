const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/components/develop/MaskingPanel.tsx'), `import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { useCatalogStore } from '../../state/catalogStore';
import { MaskLayer, MaskType, DEFAULT_MASK_ADJUSTMENTS } from '../../types/masks';
import { SmartSegmentation } from '../../engine/ai/SmartSegmentation';
import { Slider } from '../common/Slider';
import {
  Layers,
  Sparkles,
  User,
  Sun,
  CloudSun,
  Box,
  Paintbrush,
  Maximize2,
  Circle,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Sliders,
  Check
} from 'lucide-react';

export const MaskingPanel: React.FC = () => {
  const {
    developState,
    addMask,
    updateMask,
    deleteMask,
    activeMaskId,
    setActiveMaskId,
    showMaskOverlay,
    setShowMaskOverlay
  } = useEditStore();

  const { photos, activePhotoId } = useCatalogStore();
  const activePhoto = photos.find(p => p.id === activePhotoId);

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'tone' | 'color' | 'detail'>('tone');

  const masks = developState.masks;
  const activeMask = masks.find(m => m.id === activeMaskId) || masks[0];

  const handleCreateAIMask = async (type: 'subject' | 'sky' | 'background' | 'person' | 'object') => {
    if (!activePhoto) return;
    setIsProcessingAI(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
    });

    const w = img.naturalWidth || 1920;
    const h = img.naturalHeight || 1080;

    let maskCanvas: HTMLCanvasElement;
    let maskName = 'AI Mask';

    if (type === 'sky') {
      maskCanvas = SmartSegmentation.segmentSky(img, w, h);
      maskName = 'AI Sky';
    } else if (type === 'person') {
      maskCanvas = SmartSegmentation.segmentPerson(img, w, h);
      maskName = 'AI Person';
    } else if (type === 'background') {
      const subCanvas = SmartSegmentation.segmentSubject(img, w, h);
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(subCanvas, 0, 0);
      }
      maskName = 'AI Background';
    } else if (type === 'object') {
      maskCanvas = SmartSegmentation.segmentObject(img, w, h, { x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      maskName = 'AI Object';
    } else {
      maskCanvas = SmartSegmentation.segmentSubject(img, w, h);
      maskName = 'AI Subject';
    }

    const newMask: MaskLayer = {
      id: 'mask_' + Date.now(),
      name: maskName + ' ' + (masks.length + 1),
      type,
      enabled: true,
      inverted: false,
      opacity: 1.0,
      data: {
        type,
        selection: { maskCanvas }
      } as any,
      adjustments: {
        ...DEFAULT_MASK_ADJUSTMENTS,
        exposure: type === 'sky' ? -0.35 : 0.4,
        highlights: type === 'sky' ? -25 : 0,
        clarity: 15
      }
    };

    addMask(newMask);
    setIsProcessingAI(false);
  };

  const handleCreateStandardMask = (type: 'brush' | 'linear' | 'radial') => {
    const newMask: MaskLayer = {
      id: 'mask_' + Date.now(),
      name: type.charAt(0).toUpperCase() + type.slice(1) + ' Mask ' + (masks.length + 1),
      type,
      enabled: true,
      inverted: false,
      opacity: 1.0,
      data: type === 'brush'
        ? { type: 'brush', strokes: [] }
        : type === 'linear'
        ? { type: 'linear', gradient: { start: { x: 0.5, y: 0.2 }, end: { x: 0.5, y: 0.8 }, feather: 0.5 } }
        : { type: 'radial', gradient: { center: { x: 0.5, y: 0.5 }, rx: 0.35, ry: 0.35, angle: 0, feather: 0.5 } },
      adjustments: {
        ...DEFAULT_MASK_ADJUSTMENTS,
        exposure: 0.5
      }
    };
    addMask(newMask);
  };

  const handleAdjustment = (key: string, val: number) => {
    if (!activeMask) return;
    updateMask(activeMask.id, {
      adjustments: {
        ...activeMask.adjustments,
        [key]: val
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Masking & AI Selection</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-dark-300">
          <input
            type="checkbox"
            checked={showMaskOverlay}
            onChange={(e) => setShowMaskOverlay(e.target.checked)}
            className="w-3.5 h-3.5 text-accent-blue rounded cursor-pointer"
          />
          Overlay (O)
        </label>
      </div>

      {/* 1. AI Smart Selections */}
      <div className="flex flex-col gap-1.5 bg-dark-850/70 p-2.5 rounded border border-dark-750">
        <span className="text-[10px] font-bold text-accent-cyan uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> AI & Smart Selections
        </span>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          <button
            onClick={() => handleCreateAIMask('subject')}
            disabled={isProcessingAI}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded border border-dark-700 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Subject</span>
          </button>
          <button
            onClick={() => handleCreateAIMask('sky')}
            disabled={isProcessingAI}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded border border-dark-700 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            <CloudSun className="w-3 h-3 text-cyan-400" />
            <span>Sky</span>
          </button>
          <button
            onClick={() => handleCreateAIMask('background')}
            disabled={isProcessingAI}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded border border-dark-700 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            <Sun className="w-3 h-3 text-indigo-400" />
            <span>Background</span>
          </button>
          <button
            onClick={() => handleCreateAIMask('person')}
            disabled={isProcessingAI}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded border border-dark-700 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            <User className="w-3 h-3 text-rose-400" />
            <span>Person</span>
          </button>
          <button
            onClick={() => handleCreateAIMask('object')}
            disabled={isProcessingAI}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded border border-dark-700 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            <Box className="w-3 h-3 text-emerald-400" />
            <span>Object</span>
          </button>
        </div>
      </div>

      {/* 2. Classical Gradient & Brush Masks */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handleCreateStandardMask('brush')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
        >
          <Paintbrush className="w-4 h-4 text-accent-blue" />
          <span>Brush</span>
        </button>
        <button
          onClick={() => handleCreateStandardMask('linear')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-emerald-400" />
          <span>Linear</span>
        </button>
        <button
          onClick={() => handleCreateStandardMask('radial')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
        >
          <Circle className="w-4 h-4 text-amber-400" />
          <span>Radial</span>
        </button>
      </div>

      {/* 3. Layer List */}
      <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
        {masks.map((mask) => (
          <div
            key={mask.id}
            onClick={() => setActiveMaskId(mask.id)}
            className={'flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ' + (
              activeMask?.id === mask.id
                ? 'bg-accent-blue/15 border-accent-blue text-white font-semibold'
                : 'bg-dark-850 border-dark-800 text-dark-300 hover:bg-dark-800 hover:text-white'
            )}
          >
            <span className="truncate">{mask.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateMask(mask.id, { enabled: !mask.enabled });
                }}
                className="p-1 text-dark-400 hover:text-white"
              >
                {mask.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMask(mask.id);
                }}
                className="p-1 text-dark-400 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Mask Local Adjustments */}
      {activeMask && (
        <div className="flex flex-col gap-2 pt-2 border-t border-dark-800 bg-dark-850/50 p-2.5 rounded border">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white uppercase text-[10px]">
              Adjustments ({activeMask.name})
            </span>
            <label className="flex items-center gap-1 cursor-pointer text-[10px] text-dark-300">
              <input
                type="checkbox"
                checked={activeMask.inverted}
                onChange={(e) => updateMask(activeMask.id, { inverted: e.target.checked })}
                className="w-3 h-3 text-accent-blue rounded"
              />
              Invert
            </label>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-dark-800 p-0.5 rounded text-[10px] font-medium text-center">
            <button
              onClick={() => setActiveTab('tone')}
              className={'py-0.5 rounded transition-colors ' + (activeTab === 'tone' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
            >
              Tone
            </button>
            <button
              onClick={() => setActiveTab('color')}
              className={'py-0.5 rounded transition-colors ' + (activeTab === 'color' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
            >
              Color
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={'py-0.5 rounded transition-colors ' + (activeTab === 'detail' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white')}
            >
              Detail
            </button>
          </div>

          {activeTab === 'tone' && (
            <div className="flex flex-col gap-0.5">
              <Slider
                label="Exposure"
                value={activeMask.adjustments.exposure}
                min={-4.0}
                max={4.0}
                step={0.05}
                defaultValue={0}
                unit=" EV"
                onChange={(v) => handleAdjustment('exposure', v)}
              />
              <Slider
                label="Contrast"
                value={activeMask.adjustments.contrast}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('contrast', v)}
              />
              <Slider
                label="Highlights"
                value={activeMask.adjustments.highlights}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('highlights', v)}
              />
              <Slider
                label="Shadows"
                value={activeMask.adjustments.shadows}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('shadows', v)}
              />
            </div>
          )}

          {activeTab === 'color' && (
            <div className="flex flex-col gap-0.5">
              <Slider
                label="Temp Shift"
                value={activeMask.adjustments.temperature}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('temperature', v)}
              />
              <Slider
                label="Tint Shift"
                value={activeMask.adjustments.tint}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('tint', v)}
              />
              <Slider
                label="Saturation"
                value={activeMask.adjustments.saturation}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('saturation', v)}
              />
            </div>
          )}

          {activeTab === 'detail' && (
            <div className="flex flex-col gap-0.5">
              <Slider
                label="Sharpness"
                value={activeMask.adjustments.sharpness}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('sharpness', v)}
              />
              <Slider
                label="Clarity"
                value={activeMask.adjustments.clarity}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('clarity', v)}
              />
              <Slider
                label="Dehaze"
                value={activeMask.adjustments.dehaze}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={(v) => handleAdjustment('dehaze', v)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
`, 'utf8');

console.log('MaskingPanel.tsx updated with full AI selection suites.');
