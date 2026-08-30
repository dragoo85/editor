const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/HealingTool.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Sparkles, Copy, Trash2, Plus, RotateCcw } from 'lucide-react';
import { HealingPin } from '../../types/masks';

export const HealingTool: React.FC = () => {
  const { developState, addHealingPin, deleteHealingPin, updateHealingPin } = useEditStore();
  const pins = developState.healingPins;

  const handleAddPin = (type: 'heal' | 'clone') => {
    const pin: HealingPin = {
      id: 'pin_' + Date.now(),
      type,
      target: { x: 0.5, y: 0.5 },
      source: { x: 0.45, y: 0.45 },
      radius: 30,
      feather: 0.5,
      opacity: 1.0
    };
    addHealingPin(pin);
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Spot Removal / Clone</span>
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAddPin('heal')}
          className="flex items-center justify-center gap-1.5 py-2 bg-dark-850 hover:bg-dark-750 text-emerald-400 border border-dark-750 rounded text-xs font-semibold transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>+ Add Heal Spot</span>
        </button>
        <button
          onClick={() => handleAddPin('clone')}
          className="flex items-center justify-center gap-1.5 py-2 bg-dark-850 hover:bg-dark-750 text-accent-blue border border-dark-750 rounded text-xs font-semibold transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>+ Add Clone Spot</span>
        </button>
      </div>

      {/* List of active pins */}
      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
        {pins.length === 0 ? (
          <p className="text-[11px] text-dark-500 text-center py-2">
            No healing spots added. Click on the canvas to place a spot.
          </p>
        ) : (
          pins.map((pin, idx) => (
            <div
              key={pin.id}
              className="flex flex-col gap-1 p-2 bg-dark-850/60 rounded border border-dark-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white text-[10px]">
                  #{idx + 1} {pin.type === 'heal' ? 'Heal' : 'Clone'} Spot
                </span>
                <button
                  onClick={() => deleteHealingPin(pin.id)}
                  className="text-dark-400 hover:text-rose-400 p-0.5"
                  title="Remove Spot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <Slider
                label="Size"
                value={pin.radius}
                min={5}
                max={150}
                defaultValue={30}
                unit=" px"
                onChange={(val) => updateHealingPin(pin.id, { radius: val })}
              />
              <Slider
                label="Feather"
                value={Math.round(pin.feather * 100)}
                min={0}
                max={100}
                defaultValue={50}
                unit="%"
                onChange={(val) => updateHealingPin(pin.id, { feather: val / 100 })}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved HealingTool.tsx');
