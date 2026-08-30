import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Sliders, Sun, Thermometer, RotateCcw } from 'lucide-react';

export const ToneControls: React.FC = () => {
  const { developState, updateTone, resetTone, commitHistory } = useEditStore();
  const tone = developState.tone;

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs">
      {/* 1. White Balance */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-dark-800 pb-1.5">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-accent-amber" />
            <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">White Balance</span>
          </div>
          <button
            onClick={() => {
              updateTone({ temperature: 5500, tint: 0 });
              commitHistory('Reset White Balance');
            }}
            className="text-dark-500 hover:text-white transition-colors"
            title="Reset White Balance"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <Slider
          label="Temp"
          value={tone.temperature}
          min={2000}
          max={12000}
          step={50}
          defaultValue={5500}
          unit=" K"
          onChange={(v) => updateTone({ temperature: v })}
          onChangeEnd={() => commitHistory('Adjust Temperature')}
        />
        <Slider
          label="Tint"
          value={tone.tint}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ tint: v })}
          onChangeEnd={() => commitHistory('Adjust Tint')}
        />
      </div>

      {/* 2. Tone Parameters */}
      <div className="flex flex-col gap-2 pt-2 border-t border-dark-800">
        <div className="flex items-center justify-between border-b border-dark-800 pb-1.5">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-accent-blue" />
            <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Basic Tone</span>
          </div>
          <button
            onClick={resetTone}
            className="text-dark-500 hover:text-white transition-colors"
            title="Reset Tone"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <Slider
          label="Exposure"
          value={tone.exposure}
          min={-5.0}
          max={5.0}
          step={0.05}
          defaultValue={0.0}
          unit=" EV"
          formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(2) + ' EV'}
          onChange={(v) => updateTone({ exposure: v })}
          onChangeEnd={() => commitHistory('Adjust Exposure')}
        />
        <Slider
          label="Contrast"
          value={tone.contrast}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ contrast: v })}
          onChangeEnd={() => commitHistory('Adjust Contrast')}
        />
        <Slider
          label="Highlights"
          value={tone.highlights}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ highlights: v })}
          onChangeEnd={() => commitHistory('Adjust Highlights')}
        />
        <Slider
          label="Shadows"
          value={tone.shadows}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ shadows: v })}
          onChangeEnd={() => commitHistory('Adjust Shadows')}
        />
        <Slider
          label="Whites"
          value={tone.whites}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ whites: v })}
          onChangeEnd={() => commitHistory('Adjust Whites')}
        />
        <Slider
          label="Blacks"
          value={tone.blacks}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ blacks: v })}
          onChangeEnd={() => commitHistory('Adjust Blacks')}
        />
      </div>

      {/* 3. Presence Parameters */}
      <div className="flex flex-col gap-2 pt-2 border-t border-dark-800">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Presence</span>
        </div>

        <Slider
          label="Texture"
          value={tone.texture}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ texture: v })}
          onChangeEnd={() => commitHistory('Adjust Texture')}
        />
        <Slider
          label="Clarity"
          value={tone.clarity}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ clarity: v })}
          onChangeEnd={() => commitHistory('Adjust Clarity')}
        />
        <Slider
          label="Dehaze"
          value={tone.dehaze}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ dehaze: v })}
          onChangeEnd={() => commitHistory('Adjust Dehaze')}
        />
        <Slider
          label="Vibrance"
          value={tone.vibrance}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ vibrance: v })}
          onChangeEnd={() => commitHistory('Adjust Vibrance')}
        />
        <Slider
          label="Saturation"
          value={tone.saturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateTone({ saturation: v })}
          onChangeEnd={() => commitHistory('Adjust Saturation')}
        />
      </div>
    </div>
  );
};
