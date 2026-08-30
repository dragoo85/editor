import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { ColorWheel } from '../common/ColorWheel';
import { Slider } from '../common/Slider';
import { Eye, RotateCcw } from 'lucide-react';
import { ColorGradingAdjustments } from '../../types/adjustments';

type WheelTab = '3way' | 'shadows' | 'midtones' | 'highlights';

export const ColorGrading: React.FC = () => {
  const { developState, updateColorGrading, resetColorGrading } = useEditStore();
  const [activeTab, setActiveTab] = useState<WheelTab>('3way');

  const cg = developState.colorGrading;

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent-blue" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">3-Way Color Grading</span>
        </div>
        <button
          onClick={resetColorGrading}
          className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
          title="Reset Color Grading"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-dark-850 rounded border border-dark-750 text-[11px] font-medium">
        {[
          { id: '3way', label: '3-Way' },
          { id: 'shadows', label: 'Shadows' },
          { id: 'midtones', label: 'Midtones' },
          { id: 'highlights', label: 'Highlights' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as WheelTab)}
            className={'py-1 rounded transition-colors ' + (
              activeTab === tab.id ? 'bg-dark-700 text-white font-semibold' : 'text-dark-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Color Wheels */}
      {activeTab === '3way' ? (
        <div className="grid grid-cols-3 gap-1.5 justify-center">
          <ColorWheel
            label="SHADOWS"
            wheel={cg.shadows}
            onChange={(wheel) => updateColorGrading({ shadows: wheel }, 'Grading Shadows')}
          />
          <ColorWheel
            label="MIDTONES"
            wheel={cg.midtones}
            onChange={(wheel) => updateColorGrading({ midtones: wheel }, 'Grading Midtones')}
          />
          <ColorWheel
            label="HIGHLIGHTS"
            wheel={cg.highlights}
            onChange={(wheel) => updateColorGrading({ highlights: wheel }, 'Grading Highlights')}
          />
        </div>
      ) : (
        <div className="flex justify-center my-2">
          <ColorWheel
            label={activeTab.toUpperCase()}
            wheel={(cg as any)[activeTab]}
            onChange={(wheel) => updateColorGrading({ [activeTab]: wheel } as any, 'Grading ' + activeTab)}
          />
        </div>
      )}

      {/* Blending & Balance */}
      <div className="flex flex-col gap-1 pt-2 border-t border-dark-800">
        <Slider
          label="Blending"
          value={cg.blending}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(val) => updateColorGrading({ blending: val })}
        />

        <Slider
          label="Balance"
          value={cg.balance}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateColorGrading({ balance: val })}
        />
      </div>
    </div>
  );
};
