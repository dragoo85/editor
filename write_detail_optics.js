const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/DetailOptics.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Sparkles, ShieldAlert, RotateCcw } from 'lucide-react';

export const DetailOptics: React.FC = () => {
  const { developState, updateDetail, updateOptics, resetDetail, resetOptics } = useEditStore();
  const det = developState.detail;
  const opt = developState.optics;

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Detail / Sharpening Group */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Sharpening & Noise</span>
        </div>
        <button
          onClick={resetDetail}
          className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
          title="Reset Detail"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <Slider
          label="Sharpening Amount"
          value={det.sharpenAmount}
          min={0}
          max={150}
          defaultValue={25}
          onChange={(val) => updateDetail({ sharpenAmount: val })}
        />
        <Slider
          label="Radius"
          value={det.sharpenRadius}
          min={0.5}
          max={3.0}
          step={0.1}
          defaultValue={1.0}
          unit=" px"
          onChange={(val) => updateDetail({ sharpenRadius: val })}
        />
        <Slider
          label="Detail"
          value={det.sharpenDetail}
          min={0}
          max={100}
          defaultValue={25}
          onChange={(val) => updateDetail({ sharpenDetail: val })}
        />
        <Slider
          label="Masking"
          value={det.sharpenMasking}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(val) => updateDetail({ sharpenMasking: val })}
        />

        <div className="h-px bg-dark-800 my-1.5" />

        <Slider
          label="Luminance Noise Reduction"
          value={det.noiseReductionLuma}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(val) => updateDetail({ noiseReductionLuma: val })}
        />
        <Slider
          label="Color Noise Reduction"
          value={det.noiseReductionColor}
          min={0}
          max={100}
          defaultValue={25}
          onChange={(val) => updateDetail({ noiseReductionColor: val })}
        />
      </div>

      {/* Effects: Vignette & Grain */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-dark-800">
        <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1">Effects</span>

        <Slider
          label="Vignette Amount"
          value={det.vignetteAmount}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateDetail({ vignetteAmount: val })}
        />
        <Slider
          label="Vignette Midpoint"
          value={det.vignetteMidpoint}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(val) => updateDetail({ vignetteMidpoint: val })}
        />
        <Slider
          label="Vignette Feather"
          value={det.vignetteFeather}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(val) => updateDetail({ vignetteFeather: val })}
        />

        <div className="h-px bg-dark-800 my-1" />

        <Slider
          label="Film Grain Amount"
          value={det.grainAmount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(val) => updateDetail({ grainAmount: val })}
        />
        <Slider
          label="Grain Size"
          value={det.grainSize}
          min={0}
          max={100}
          defaultValue={25}
          onChange={(val) => updateDetail({ grainSize: val })}
        />
      </div>

      {/* Optics / Lens Corrections */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-dark-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Lens Optics</span>
          <button
            onClick={resetOptics}
            className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
            title="Reset Optics"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <Slider
          label="Distortion Correction"
          value={opt.distortion}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateOptics({ distortion: val })}
        />
        <Slider
          label="Chromatic Aberration (Defringe)"
          value={opt.chromaticAberration}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(val) => updateOptics({ chromaticAberration: val })}
        />
      </div>
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved DetailOptics.tsx');
