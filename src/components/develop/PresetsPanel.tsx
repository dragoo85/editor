import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { PresetManager, BUILTIN_PRESETS } from '../../engine/presets/PresetLibrary';
import { Preset } from '../../types/presets';
import { Bookmark, Plus, Trash2, Download, Upload, Check } from 'lucide-react';

export const PresetsPanel: React.FC = () => {
  const { developState, setDevelopState, setPresetPreview } = useEditStore();
  const [presets, setPresets] = useState<Preset[]>(PresetManager.getAllPresets());
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState('User Presets');

  const handleApply = (preset: Preset) => {
    const merged = {
      ...developState,
      ...(preset.adjustments.tone && { tone: { ...developState.tone, ...preset.adjustments.tone } }),
      ...(preset.adjustments.curve && { curve: { ...developState.curve, ...preset.adjustments.curve } }),
      ...(preset.adjustments.hsl && { hsl: { ...developState.hsl, ...preset.adjustments.hsl } }),
      ...(preset.adjustments.colorGrading && { colorGrading: { ...developState.colorGrading, ...preset.adjustments.colorGrading } }),
      ...(preset.adjustments.detail && { detail: { ...developState.detail, ...preset.adjustments.detail } }),
      ...(preset.adjustments.optics && { optics: { ...developState.optics, ...preset.adjustments.optics } })
    };
    setDevelopState(merged, true, 'Apply Preset: ' + preset.name);
    setPresetPreview(null);
  };

  const handleSaveCurrent = () => {
    if (!newPresetName.trim()) return;
    const newPreset: Preset = {
      id: 'custom_' + Date.now(),
      name: newPresetName.trim(),
      category: newPresetCategory.trim() || 'User Presets',
      description: 'Custom user preset',
      adjustments: {
        tone: { ...developState.tone },
        curve: { ...developState.curve },
        hsl: { ...developState.hsl },
        colorGrading: { ...developState.colorGrading },
        detail: { ...developState.detail },
        optics: { ...developState.optics }
      },
      isBuiltIn: false
    };
    PresetManager.saveCustomPreset(newPreset);
    setPresets(PresetManager.getAllPresets());
    setNewPresetName('');
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    PresetManager.deleteCustomPreset(id);
    setPresets(PresetManager.getAllPresets());
  };

  const handleExport = (preset: Preset) => {
    const json = PresetManager.exportPresetAsJSON(preset);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = preset.name.toLowerCase().replace(/\s+/g, '_') + '.lumina-preset';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string;
          PresetManager.importPresetFromJSON(content);
          setPresets(PresetManager.getAllPresets());
        } catch (err) {
          alert('Failed to parse preset file.');
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  // Group presets by category
  const categories = Array.from(new Set(presets.map(p => p.category)));

  return (
    <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full select-none text-xs overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-accent-blue" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">PRESETS</span>
        </div>
        <div className="flex items-center gap-1">
          <label className="p-1 text-dark-400 hover:text-white cursor-pointer rounded hover:bg-dark-800" title="Import Preset">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json,.lumina-preset" onChange={handleImportFile} className="hidden" />
          </label>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-800"
            title="Create Preset from Current Settings"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Create Preset Form */}
      {isCreating && (
        <div className="p-3 bg-dark-850 border-b border-dark-800 flex flex-col gap-2">
          <span className="font-semibold text-white text-[10px]">New Preset</span>
          <input
            type="text"
            placeholder="Preset name..."
            value={newPresetName}
            autoFocus
            onChange={(e) => setNewPresetName(e.target.value)}
            className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none focus:border-accent-blue"
          />
          <div className="flex justify-end gap-1.5 mt-1">
            <button
              onClick={() => setIsCreating(false)}
              className="px-2 py-0.5 rounded bg-dark-750 text-dark-300 text-[10px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCurrent}
              className="px-2.5 py-0.5 rounded bg-accent-blue text-white text-[10px] font-bold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Preset Categories & Items */}
      <div className="p-3 flex flex-col gap-3">
        {categories.map((cat) => {
          const catPresets = presets.filter(p => p.category === cat);
          return (
            <div key={cat} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">{cat}</span>
              <div className="flex flex-col gap-0.5">
                {catPresets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApply(preset)}
                    className="group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-dark-300 hover:bg-dark-850 hover:text-white transition-colors"
                  >
                    <span className="truncate">{preset.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(preset);
                        }}
                        className="p-0.5 text-dark-400 hover:text-white"
                        title="Export Preset"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(preset.id);
                          }}
                          className="p-0.5 text-dark-400 hover:text-rose-400"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
