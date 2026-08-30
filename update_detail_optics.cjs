const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/components/develop/DetailOptics.tsx'), `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Eye, Disc, Sparkles, Aperture, RefreshCcw } from 'lucide-react';

export const DetailOptics: React.FC = () => {
  const { developState, updateDetail, updateOptics } = useEditStore();
  const det = developState.detail;
  const opt = developState.optics;

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* 1. Sharpening & Noise Reduction */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-dark-800 pb-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-cyan" />
            <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Detail & Sharpness</span>
          </div>
          <button
            onClick={() => updateDetail({ sharpenAmount: 40, sharpenRadius: 1.0, sharpenDetail: 25, sharpenMasking: 0 })}
            className="text-dark-500 hover:text-white transition-colors"
            title="Reset Sharpening"
          >
            <RefreshCcw className="w-3 h-3" />
          </button>
        </div>

        <Slider
          label="Amount"
          value={det.sharpenAmount}
          min={0}
          max={150}
          defaultValue={40}
          onChange={(v) => updateDetail({ sharpenAmount: v })}
        />
        <Slider
          label="Radius"
          value={det.sharpenRadius}
          min={0.5}
          max={3.0}
          step={0.1}
          unit=" px"
          defaultValue={1.0}
          onChange={(v) => updateDetail({ sharpenRadius: v })}
        />
        <Slider
          label="Detail"
          value={det.sharpenDetail}
          min={0}
          max={100}
          defaultValue={25}
          onChange={(v) => updateDetail({ sharpenDetail: v })}
        />
        <Slider
          label="Masking"
          value={det.sharpenMasking}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => updateDetail({ sharpenMasking: v })}
        />

        <div className="pt-2 border-t border-dark-800/60">
          <span className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Noise Reduction</span>
          <Slider
            label="Luminance"
            value={det.noiseReductionLuminance}
            min={0}
            max={100}
            defaultValue={0}
            onChange={(v) => updateDetail({ noiseReductionLuminance: v })}
          />
          <Slider
            label="Color"
            value={det.noiseReductionColor}
            min={0}
            max={100}
            defaultValue={25}
            onChange={(v) => updateDetail({ noiseReductionColor: v })}
          />
        </div>
      </div>

      {/* 2. Lens Optics & Profile Correction */}
      <div className="flex flex-col gap-2 pt-2 border-t border-dark-800">
        <div className="flex items-center justify-between border-b border-dark-800 pb-1.5">
          <div className="flex items-center gap-2">
            <Aperture className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Lens Optics & Corrections</span>
          </div>
          <button
            onClick={() => updateOptics({ distortion: 0, chromaticAberration: 0, vignetteAmount: 0 })}
            className="text-dark-500 hover:text-white transition-colors"
            title="Reset Optics"
          >
            <RefreshCcw className="w-3 h-3" />
          </button>
        </div>

        <Slider
          label="Distortion (Barrel/Pin)"
          value={opt.distortion}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateOptics({ distortion: v })}
        />
        <Slider
          label="CA Defringe (Purple/Green)"
          value={opt.chromaticAberration}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => updateOptics({ chromaticAberration: v })}
        />
      </div>

      {/* 3. Effects: Vignette & Grain */}
      <div className="flex flex-col gap-2 pt-2 border-t border-dark-800">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-1.5">
          <Disc className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Effects (Vignette & Grain)</span>
        </div>

        <Slider
          label="Vignette Amount"
          value={det.vignetteAmount}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateDetail({ vignetteAmount: v })}
        />
        <Slider
          label="Vignette Midpoint"
          value={det.vignetteMidpoint}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => updateDetail({ vignetteMidpoint: v })}
        />
        <Slider
          label="Film Grain"
          value={det.grainAmount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => updateDetail({ grainAmount: v })}
        />
      </div>
    </div>
  );
};
`, 'utf8');

console.log('DetailOptics.tsx updated with full lens and sharpness controls.');
