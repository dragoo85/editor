const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/ToneControls.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Sun, RotateCcw, Sparkles } from 'lucide-react';

export const ToneControls: React.FC = () => {
  const { developState, updateTone, resetTone } = useEditStore();
  const tone = developState.tone;

  const handleAutoTone = () => {
    updateTone({
      exposure: 0.25,
      contrast: 15,
      highlights: -25,
      shadows: 20,
      whites: 10,
      blacks: -10,
      vibrance: 15,
      clarity: 10
    }, 'Auto Tone');
  };

  const handleAutoWB = () => {
    updateTone({
      temperature: 5400,
      tint: 2
    }, 'Auto White Balance');
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Basic Tone & Color</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoTone}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-750 text-[10px] font-semibold text-accent-blue transition-colors border border-dark-700"
            title="Calculate optimal tone balance"
          >
            <Sparkles className="w-3 h-3" />
            Auto
          </button>
          <button
            onClick={resetTone}
            className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
            title="Reset Basic Tone"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* White Balance Group */}
      <div className="flex flex-col gap-1 bg-dark-850/60 p-2.5 rounded border border-dark-800">
        <div className="flex items-center justify-between text-[11px] font-medium text-dark-300 mb-1">
          <span>White Balance</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAutoWB}
              className="text-[10px] text-dark-400 hover:text-white px-1.5 py-0.5 rounded bg-dark-800"
            >
              Auto
            </button>
            <select
              value={tone.temperature < 4000 ? 'tungsten' : tone.temperature < 5000 ? 'fluorescent' : tone.temperature < 6000 ? 'daylight' : tone.temperature < 7000 ? 'cloudy' : 'shade'}
              onChange={(e) => {
                const map: Record<string, { temp: number; tint: number }> = {
                  daylight: { temp: 5500, tint: 0 },
                  cloudy: { temp: 6500, tint: 5 },
                  shade: { temp: 7500, tint: 10 },
                  tungsten: { temp: 3200, tint: 0 },
                  fluorescent: { temp: 4000, tint: -5 }
                };
                const val = map[e.target.value];
                if (val) updateTone({ temperature: val.temp, tint: val.tint }, 'WB Preset');
              }}
              className="bg-dark-800 border border-dark-700 text-dark-200 rounded px-1.5 py-0.5 text-[10px] outline-none cursor-pointer"
            >
              <option value="daylight">Daylight (5500K)</option>
              <option value="cloudy">Cloudy (6500K)</option>
              <option value="shade">Shade (7500K)</option>
              <option value="tungsten">Tungsten (3200K)</option>
              <option value="fluorescent">Fluorescent (4000K)</option>
            </select>
          </div>
        </div>

        <Slider
          label="Temp"
          value={tone.temperature}
          min={2000}
          max={12000}
          step={50}
          defaultValue={5500}
          unit="K"
          onChange={(val) => updateTone({ temperature: val })}
        />

        <Slider
          label="Tint"
          value={tone.tint}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ tint: val })}
        />
      </div>

      {/* Tone Group */}
      <div className="flex flex-col gap-0.5">
        <Slider
          label="Exposure"
          value={tone.exposure}
          min={-5.0}
          max={5.0}
          step={0.05}
          defaultValue={0}
          unit=" EV"
          formatValue={(v) => (v > 0 ? '+' + v.toFixed(2) : v.toFixed(2)) + ' EV'}
          onChange={(val) => updateTone({ exposure: val })}
        />

        <Slider
          label="Contrast"
          value={tone.contrast}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ contrast: val })}
        />

        <Slider
          label="Highlights"
          value={tone.highlights}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ highlights: val })}
        />

        <Slider
          label="Shadows"
          value={tone.shadows}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ shadows: val })}
        />

        <Slider
          label="Whites"
          value={tone.whites}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ whites: val })}
        />

        <Slider
          label="Blacks"
          value={tone.blacks}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ blacks: val })}
        />
      </div>

      {/* Presence & Clarity Group */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-dark-800">
        <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1">Presence</span>

        <Slider
          label="Texture"
          value={tone.texture}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ texture: val })}
        />

        <Slider
          label="Clarity"
          value={tone.clarity}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ clarity: val })}
        />

        <Slider
          label="Dehaze"
          value={tone.dehaze}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ dehaze: val })}
        />

        <Slider
          label="Vibrance"
          value={tone.vibrance}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ vibrance: val })}
        />

        <Slider
          label="Saturation"
          value={tone.saturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateTone({ saturation: val })}
        />
      </div>
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved ToneControls.tsx');
