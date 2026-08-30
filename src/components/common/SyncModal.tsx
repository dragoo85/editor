import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { Check, X, Copy, Sliders, Sun, Palette, Eye, Sparkles, Layers, Scissors, ShieldAlert } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { photos, selectedPhotoIds, activePhotoId, updatePhotoEditState } = useCatalogStore();
  const { developState } = useEditStore();

  const [syncCategories, setSyncCategories] = useState({
    tone: true,
    curve: true,
    hsl: true,
    colorGrading: true,
    detail: true,
    optics: true,
    geometry: false,
    masks: false,
    healing: false
  });

  if (!isOpen) return null;

  const targetCount = selectedPhotoIds.length > 1 ? selectedPhotoIds.length - 1 : photos.length - 1;

  const handleCheckAll = (val: boolean) => {
    setSyncCategories({
      tone: val,
      curve: val,
      hsl: val,
      colorGrading: val,
      detail: val,
      optics: val,
      geometry: val,
      masks: val,
      healing: val
    });
  };

  const handleSync = () => {
    const activePhoto = photos.find(p => p.id === activePhotoId);
    if (!activePhoto) return;

    const sourceState = developState;
    const targetIds = selectedPhotoIds.length > 1 
      ? selectedPhotoIds.filter(id => id !== activePhotoId)
      : photos.map(p => p.id).filter(id => id !== activePhotoId);

    for (const id of targetIds) {
      const targetPhoto = photos.find(p => p.id === id);
      const currentTargetState = targetPhoto?.editState || {};

      const mergedState = {
        ...currentTargetState,
        ...(syncCategories.tone && { tone: { ...sourceState.tone } }),
        ...(syncCategories.curve && { curve: { ...sourceState.curve } }),
        ...(syncCategories.hsl && { hsl: { ...sourceState.hsl } }),
        ...(syncCategories.colorGrading && { colorGrading: { ...sourceState.colorGrading } }),
        ...(syncCategories.detail && { detail: { ...sourceState.detail } }),
        ...(syncCategories.optics && { optics: { ...sourceState.optics } }),
        ...(syncCategories.geometry && { geometry: { ...sourceState.geometry } }),
        ...(syncCategories.masks && { masks: JSON.parse(JSON.stringify(sourceState.masks)) }),
        ...(syncCategories.healing && { healingPins: JSON.parse(JSON.stringify(sourceState.healingPins)) })
      };

      updatePhotoEditState(id, mergedState);
    }

    onClose();
  };

  const categories = [
    { key: 'tone', label: 'Basic Tone (Exposure, Temp, Contrast, Highlights...)', icon: Sun },
    { key: 'curve', label: 'Spline Tone Curves (RGB, R, G, B)', icon: Sliders },
    { key: 'hsl', label: 'Color Mixer / HSL (8 Bands)', icon: Palette },
    { key: 'colorGrading', label: '3-Way Color Grading (Shadows, Midtones, Highlights)', icon: Eye },
    { key: 'detail', label: 'Detail (Sharpening, Noise Reduction, Vignette, Grain)', icon: Sparkles },
    { key: 'optics', label: 'Optics & Lens Correction (Distortion, CA Defringe)', icon: ShieldAlert },
    { key: 'geometry', label: 'Transform & Crop (Aspect, Rotation, Straighten)', icon: Scissors },
    { key: 'masks', label: 'Local Adjustment Masks (Brush, Gradients, Range)', icon: Layers },
    { key: 'healing', label: 'Spot Healing & Clone Pins', icon: Copy }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="w-[520px] bg-dark-900 border border-dark-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-dark-850 border-b border-dark-750">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-semibold text-white">Synchronize Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-750 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          <p className="text-dark-300">
            Copy adjustments from active photo to <strong className="text-white">{targetCount}</strong> target photo{targetCount === 1 ? '' : 's'}.
          </p>

          <div className="flex items-center gap-2 pb-2 border-b border-dark-800">
            <button
              onClick={() => handleCheckAll(true)}
              className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded font-medium transition-colors"
            >
              Check All
            </button>
            <button
              onClick={() => handleCheckAll(false)}
              className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded font-medium transition-colors"
            >
              Uncheck All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isChecked = (syncCategories as any)[cat.key];
              return (
                <label
                  key={cat.key}
                  className="flex items-center gap-3 p-2 rounded bg-dark-850/60 hover:bg-dark-800 border border-dark-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setSyncCategories({ ...syncCategories, [cat.key]: e.target.checked })}
                    className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-accent-blue focus:ring-0 cursor-pointer"
                  />
                  <Icon className="w-3.5 h-3.5 text-dark-400" />
                  <span className="text-dark-200">{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-dark-850 border-t border-dark-750">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-dark-750 hover:bg-dark-700 text-dark-200 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSync}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent-blue hover:bg-blue-600 text-white text-xs font-semibold shadow transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Synchronize
          </button>
        </div>
      </div>
    </div>
  );
};
