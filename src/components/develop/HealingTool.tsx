import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { HealMode, HealOperation } from '../../engine/healing/HealEngine';
import { RemovalOperation } from '../../engine/removal/RemovalEngine';
import {
  Bandage, Copy, Scissors, Eye, EyeOff, Trash2, Plus, Sparkles, X, Check, ShieldCheck
} from 'lucide-react';

export const HealingTool: React.FC = () => {
  const {
    healOperations,
    removalOperations,
    addHealOperation,
    updateHealOperation,
    deleteHealOperation,
    addRemovalOperation,
    updateRemovalOperation,
    deleteRemovalOperation,
    setActiveTool
  } = useEditStore();

  const [activeTab, setActiveTab] = useState<'heal' | 'removal'>('heal');
  const [healMode, setHealMode] = useState<HealMode>('heal');
  const [brushRadius, setBrushRadius] = useState<number>(30);
  const [brushFeather, setBrushFeather] = useState<number>(50);
  const [brushOpacity, setBrushOpacity] = useState<number>(100);

  // Removal parameters
  const [removalExpansion, setRemovalExpansion] = useState<number>(4);
  const [removalFeather, setRemovalFeather] = useState<number>(4);
  const [removeShadow, setRemoveShadow] = useState<boolean>(true);

  return (
    <div className="flex flex-col h-full bg-dark-900 select-none text-xs border-l border-dark-800">
      {/* Header */}
      <div className="p-3 border-b border-dark-800 bg-dark-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bandage className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-xs uppercase tracking-wide">
            Healing & Removal
          </span>
        </div>
        <button
          onClick={() => setActiveTool('select')}
          className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-800"
          title="Close Tool"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center border-b border-dark-800 bg-dark-950 text-xs">
        <button
          onClick={() => setActiveTab('heal')}
          className={'flex-1 py-2 font-semibold text-center border-b-2 transition-all ' + (
            activeTab === 'heal'
              ? 'border-emerald-400 text-white bg-dark-850'
              : 'border-transparent text-dark-400 hover:text-dark-200'
          )}
        >
          Heal & Clone
        </button>
        <button
          onClick={() => setActiveTab('removal')}
          className={'flex-1 py-2 font-semibold text-center border-b-2 transition-all ' + (
            activeTab === 'removal'
              ? 'border-accent-blue text-white bg-dark-850'
              : 'border-transparent text-dark-400 hover:text-dark-200'
          )}
        >
          Object Removal
        </button>
      </div>

      {activeTab === 'heal' ? (
        <div className="p-3 flex flex-col gap-3">
          {/* Heal / Clone / Patch Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-dark-950 p-1 rounded border border-dark-800 text-[11px]">
            {(['heal', 'clone', 'patch'] as HealMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setHealMode(mode)}
                className={'py-1.5 rounded font-semibold text-center uppercase tracking-wider transition-colors ' + (
                  healMode === mode
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-dark-400 hover:text-white hover:bg-dark-850'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Slider label="Brush Size" value={brushRadius} min={5} max={300} step={1} unit=" px" onChange={setBrushRadius} />
            <Slider label="Feather" value={brushFeather} min={0} max={100} step={1} unit="%" onChange={setBrushFeather} />
            <Slider label="Opacity" value={brushOpacity} min={10} max={100} step={1} unit="%" onChange={setBrushOpacity} />
          </div>

          {/* Heal Operations List */}
          <div className="border-t border-dark-800 pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-dark-300">Heal Operations ({healOperations.length})</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {healOperations.length === 0 ? (
                <p className="text-[11px] text-dark-500 py-2 text-center">Click on the image to place a healing spot.</p>
              ) : (
                healOperations.map((op, idx) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 rounded bg-dark-850 border border-dark-800"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateHealOperation(op.id, { enabled: !op.enabled })}
                        className="text-dark-400 hover:text-white"
                      >
                        {op.enabled ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
                      </button>
                      <span className="font-medium text-white text-[11px]">
                        Spot #{idx + 1} ({op.mode.toUpperCase()})
                      </span>
                    </div>

                    <button
                      onClick={() => deleteHealOperation(op.id)}
                      className="p-1 text-dark-500 hover:text-rose-400 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-3">
          <div className="p-2.5 rounded bg-dark-850 border border-dark-800 flex flex-col gap-1 text-[11px]">
            <span className="font-semibold text-white">Structural Context Inpainting</span>
            <span className="text-dark-400">Brush over an unwanted object to seamlessly reconstruct background structures.</span>
          </div>

          <div className="flex flex-col gap-3">
            <Slider label="Expansion" value={removalExpansion} min={0} max={20} step={1} unit=" px" onChange={setRemovalExpansion} />
            <Slider label="Edge Feather" value={removalFeather} min={0} max={20} step={1} unit=" px" onChange={setRemovalFeather} />
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-dark-300">
              <input
                type="checkbox"
                checked={removeShadow}
                onChange={(e) => setRemoveShadow(e.target.checked)}
                className="rounded bg-dark-800 border-dark-700 text-accent-blue focus:ring-0"
              />
              Remove Associated Object Shadows
            </label>
          </div>

          {/* Removal Operations List */}
          <div className="border-t border-dark-800 pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-dark-300">Removal Stack ({removalOperations.length})</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {removalOperations.length === 0 ? (
                <p className="text-[11px] text-dark-500 py-2 text-center">Paint over objects to remove them non-destructively.</p>
              ) : (
                removalOperations.map((op, idx) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 rounded bg-dark-850 border border-dark-800"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateRemovalOperation(op.id, { enabled: !op.enabled })}
                        className="text-dark-400 hover:text-white"
                      >
                        {op.enabled ? <Eye className="w-3.5 h-3.5 text-accent-blue" /> : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
                      </button>
                      <span className="font-medium text-white text-[11px]">{op.name || `Removal #${idx + 1}`}</span>
                    </div>

                    <button
                      onClick={() => deleteRemovalOperation(op.id)}
                      className="p-1 text-dark-500 hover:text-rose-400 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
