import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { Histogram } from './Histogram';
import { ToneControls } from './ToneControls';
import { CurveEditor } from './CurveEditor';
import { HSLPanel } from './HSLPanel';
import { ColorGrading } from './ColorGrading';
import { DetailOptics } from './DetailOptics';
import { CalibrationPanel } from './CalibrationPanel';
import { CropTool } from './CropTool';
import { MaskingPanel } from './MaskingPanel';
import { HealingTool } from './HealingTool';

import {
  Crop,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Sliders,
  Sun,
  Eye,
  Disc,
  SlidersHorizontal,
  Aperture,
  CheckCircle2
} from 'lucide-react';

export const DevelopRightPanel: React.FC = () => {
  const { activeTool, setActiveTool } = useEditStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    curve: true,
    hsl: false,
    grading: false,
    detail: false,
    optics: false,
    calibration: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-80 bg-dark-900 border-l border-dark-800 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Interactive Histogram */}
      <Histogram />

      {/* 2. Lightroom-Style Tool Strip */}
      <div className="h-10 bg-dark-850 border-b border-dark-800 flex items-center justify-around px-2 text-dark-400">
        <button
          onClick={() => setActiveTool(activeTool === 'crop' ? 'select' : 'crop')}
          className={'p-1.5 rounded transition-colors ' + (
            activeTool === 'crop' ? 'bg-accent-blue text-white shadow-sm' : 'hover:bg-dark-800 hover:text-white'
          )}
          title="Crop & Straighten (C / R)"
        >
          <Crop className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'heal' ? 'select' : 'heal')}
          className={'p-1.5 rounded transition-colors ' + (
            activeTool === 'heal' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-dark-800 hover:text-white'
          )}
          title="Spot Removal & Healing (H / Q)"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'mask' ? 'select' : 'mask')}
          className={'p-1.5 rounded transition-colors ' + (
            activeTool === 'mask' ? 'bg-rose-600 text-white shadow-sm' : 'hover:bg-dark-800 hover:text-white'
          )}
          title="Masking & AI Selection (M / K)"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Active Top Tool (Crop, Heal, Mask) overlay inside panel */}
      {activeTool === 'crop' && <CropTool />}
      {activeTool === 'heal' && <HealingTool />}
      {activeTool === 'mask' && <MaskingPanel />}

      {/* 3. Collapsible Global Accordions (Shown when activeTool === 'select') */}
      {activeTool === 'select' && (
        <div className="flex-1 overflow-y-auto divide-y divide-dark-800 text-xs">
        {/* Basic Tone */}
        <div>
          <button
            onClick={() => toggleSection('basic')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-accent-blue" />
              <span>Basic</span>
            </div>
            {openSections.basic ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.basic && <ToneControls />}
        </div>

        {/* Tone Curve */}
        <div>
          <button
            onClick={() => toggleSection('curve')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Tone Curve</span>
            </div>
            {openSections.curve ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.curve && <CurveEditor />}
        </div>

        {/* HSL / Color Mixer */}
        <div>
          <button
            onClick={() => toggleSection('hsl')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Disc className="w-3.5 h-3.5 text-accent-amber" />
              <span>Color Mixer / HSL</span>
            </div>
            {openSections.hsl ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.hsl && <HSLPanel />}
        </div>

        {/* Color Grading */}
        <div>
          <button
            onClick={() => toggleSection('grading')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Color Grading</span>
            </div>
            {openSections.grading ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.grading && <ColorGrading />}
        </div>

        {/* Detail & Lens Optics */}
        <div>
          <button
            onClick={() => toggleSection('detail')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Aperture className="w-3.5 h-3.5 text-purple-400" />
              <span>Detail & Optics</span>
            </div>
            {openSections.detail ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.detail && <DetailOptics />}
        </div>

        {/* Camera Calibration */}
        <div>
          <button
            onClick={() => toggleSection('calibration')}
            className="w-full h-8 px-3.5 flex items-center justify-between bg-dark-900 hover:bg-dark-850 text-dark-200 font-bold uppercase tracking-wider text-[11px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-purple" />
              <span>Calibration</span>
            </div>
            {openSections.calibration ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-500" />}
          </button>
          {openSections.calibration && <CalibrationPanel />}
        </div>
      </div>
      )}
    </div>
  );
};
