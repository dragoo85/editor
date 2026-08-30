import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Palette, RotateCcw } from 'lucide-react';
import { HSLAdjustments } from '../../types/adjustments';

type HSLTab = 'hue' | 'saturation' | 'luminance' | 'all';
type HSLBand = keyof HSLAdjustments;

const BANDS: { key: HSLBand; label: string; color: string }[] = [
  { key: 'red', label: 'Red', color: '#ef4444' },
  { key: 'orange', label: 'Orange', color: '#f97316' },
  { key: 'yellow', label: 'Yellow', color: '#eab308' },
  { key: 'green', label: 'Green', color: '#22c55e' },
  { key: 'aqua', label: 'Aqua', color: '#06b6d4' },
  { key: 'blue', label: 'Blue', color: '#3b82f6' },
  { key: 'purple', label: 'Purple', color: '#a855f7' },
  { key: 'magenta', label: 'Magenta', color: '#ec4899' }
];

export const HSLPanel: React.FC = () => {
  const { developState, updateHSL, resetHSL } = useEditStore();
  const [activeTab, setActiveTab] = useState<HSLTab>('all');
  const [selectedBand, setSelectedBand] = useState<HSLBand>('red');

  const hsl = developState.hsl;

  const handleUpdate = (band: HSLBand, property: 'hue' | 'saturation' | 'luminance', val: number) => {
    updateHSL({
      [band]: {
        ...hsl[band],
        [property]: val
      }
    } as any, 'HSL Adjustment');
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-accent-purple" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Color Mixer / HSL</span>
        </div>
        <button
          onClick={resetHSL}
          className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
          title="Reset HSL"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Mode Switches */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-dark-850 rounded border border-dark-750 text-[11px] font-medium">
        {[
          { id: 'all', label: 'Color' },
          { id: 'hue', label: 'Hue' },
          { id: 'saturation', label: 'Sat' },
          { id: 'luminance', label: 'Luma' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as HSLTab)}
            className={'py-1 rounded transition-colors ' + (
              activeTab === tab.id ? 'bg-dark-700 text-white font-semibold' : 'text-dark-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* When in "Color" mode: choose band, then show Hue/Sat/Luma sliders */}
      {activeTab === 'all' ? (
        <div className="flex flex-col gap-3">
          {/* Color swatch buttons */}
          <div className="flex items-center justify-between gap-1 p-1 bg-dark-850/60 rounded border border-dark-800">
            {BANDS.map((b) => (
              <button
                key={b.key}
                onClick={() => setSelectedBand(b.key)}
                className={'w-6 h-6 rounded-full flex items-center justify-center transition-transform ' + (
                  selectedBand === b.key ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                )}
                style={{ backgroundColor: b.color }}
                title={b.label}
              />
            ))}
          </div>

          {/* Sliders for selected band */}
          <div className="flex flex-col gap-1 bg-dark-850/50 p-2.5 rounded border border-dark-800">
            <span className="font-semibold text-white uppercase text-[10px] mb-1" style={{ color: BANDS.find(b => b.key === selectedBand)?.color }}>
              {selectedBand} Channel
            </span>
            <Slider
              label="Hue Shift"
              value={hsl[selectedBand].hue}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(val) => handleUpdate(selectedBand, 'hue', val)}
            />
            <Slider
              label="Saturation"
              value={hsl[selectedBand].saturation}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(val) => handleUpdate(selectedBand, 'saturation', val)}
            />
            <Slider
              label="Luminance"
              value={hsl[selectedBand].luminance}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(val) => handleUpdate(selectedBand, 'luminance', val)}
            />
          </div>
        </div>
      ) : (
        /* When in Hue / Sat / Luma tabs: list all 8 colors with corresponding slider */
        <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-1">
          {BANDS.map((b) => (
            <div key={b.key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
              <div className="flex-1">
                <Slider
                  label={b.label}
                  value={(hsl[b.key] as any)[activeTab]}
                  min={-100}
                  max={100}
                  defaultValue={0}
                  onChange={(val) => handleUpdate(b.key, activeTab as any, val)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
