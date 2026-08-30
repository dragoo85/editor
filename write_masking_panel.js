const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/MaskingPanel.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { MaskLayer, MaskType } from '../../types/masks';
import { Slider } from '../common/Slider';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Paintbrush,
  Maximize2,
  Circle,
  Pipette,
  Sun,
  RotateCcw
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

  const masks = developState.masks;
  const activeMask = masks.find(m => m.id === activeMaskId);

  const handleCreateMask = (type: MaskType) => {
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
        : type === 'radial'
        ? { type: 'radial', gradient: { center: { x: 0.5, y: 0.5 }, rx: 0.3, ry: 0.3, angle: 0, feather: 0.5 } }
        : type === 'color_range'
        ? { type: 'color_range', range: { targetColor: { r: 128, g: 128, b: 128 }, tolerance: 30, smoothness: 20 } }
        : { type: 'luma_range', range: { minLuma: 0.5, maxLuma: 1.0, featherMin: 0.1, featherMax: 0.1 } },
      adjustments: {
        exposure: 0.5,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        clarity: 0,
        saturation: 0
      }
    };
    addMask(newMask);
  };

  const handleMaskAdjustment = (prop: string, val: number) => {
    if (!activeMask) return;
    updateMask(activeMask.id, {
      adjustments: {
        ...activeMask.adjustments,
        [prop]: val
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Masking Layers</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-dark-300">
          <input
            type="checkbox"
            checked={showMaskOverlay}
            onChange={(e) => setShowMaskOverlay(e.target.checked)}
            className="w-3.5 h-3.5 text-accent-blue rounded"
          />
          Overlay (O)
        </label>
      </div>

      {/* Add New Mask Quick Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => handleCreateMask('brush')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
          title="Brush Mask"
        >
          <Paintbrush className="w-4 h-4 text-accent-blue" />
          <span>Brush</span>
        </button>

        <button
          onClick={() => handleCreateMask('linear')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
          title="Linear Gradient"
        >
          <Maximize2 className="w-4 h-4 text-emerald-400" />
          <span>Linear</span>
        </button>

        <button
          onClick={() => handleCreateMask('radial')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
          title="Radial Gradient"
        >
          <Circle className="w-4 h-4 text-amber-400" />
          <span>Radial</span>
        </button>

        <button
          onClick={() => handleCreateMask('luma_range')}
          className="flex flex-col items-center gap-1 p-2 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-[10px] font-medium transition-colors"
          title="Luminance Range"
        >
          <Sun className="w-4 h-4 text-accent-purple" />
          <span>Luma</span>
        </button>
      </div>

      {/* Mask Layer List */}
      <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
        {masks.map((mask) => (
          <div
            key={mask.id}
            onClick={() => setActiveMaskId(mask.id)}
            className={'flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ' + (
              activeMaskId === mask.id
                ? 'bg-accent-blue/15 border-accent-blue text-white font-semibold'
                : 'bg-dark-850 border-dark-800 text-dark-300 hover:bg-dark-800 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{mask.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateMask(mask.id, { enabled: !mask.enabled });
                }}
                className="p-1 text-dark-400 hover:text-white"
                title="Toggle Visibility"
              >
                {mask.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMask(mask.id);
                }}
                className="p-1 text-dark-400 hover:text-rose-400"
                title="Delete Mask"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Adjustments for Selected Mask */}
      {activeMask && (
        <div className="flex flex-col gap-2 pt-2 border-t border-dark-800 bg-dark-850/50 p-2.5 rounded border">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white uppercase text-[10px]">
              Local Adjustments ({activeMask.name})
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

          <Slider
            label="Exposure"
            value={activeMask.adjustments?.exposure ?? 0}
            min={-3.0}
            max={3.0}
            step={0.05}
            defaultValue={0}
            unit=" EV"
            onChange={(val) => handleMaskAdjustment('exposure', val)}
          />
          <Slider
            label="Contrast"
            value={activeMask.adjustments?.contrast ?? 0}
            min={-100}
            max={100}
            defaultValue={0}
            onChange={(val) => handleMaskAdjustment('contrast', val)}
          />
          <Slider
            label="Highlights"
            value={activeMask.adjustments?.highlights ?? 0}
            min={-100}
            max={100}
            defaultValue={0}
            onChange={(val) => handleMaskAdjustment('highlights', val)}
          />
          <Slider
            label="Shadows"
            value={activeMask.adjustments?.shadows ?? 0}
            min={-100}
            max={100}
            defaultValue={0}
            onChange={(val) => handleMaskAdjustment('shadows', val)}
          />
          <Slider
            label="Clarity"
            value={activeMask.adjustments?.clarity ?? 0}
            min={-100}
            max={100}
            defaultValue={0}
            onChange={(val) => handleMaskAdjustment('clarity', val)}
          />
          <Slider
            label="Saturation"
            value={activeMask.adjustments?.saturation ?? 0}
            min={-100}
            max={100}
            defaultValue={0}
            onChange={(val) => handleMaskAdjustment('saturation', val)}
          />
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved MaskingPanel.tsx');
