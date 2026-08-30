const fs = require('fs');
const path = require('path');

function save(relPath, content) {
  const full = path.resolve(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Saved:', relPath);
}

// 1. SyncModal.tsx
save('src/components/common/SyncModal.tsx', `import React, { useState } from 'react';
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
`);

// 2. ExportDialog.tsx
save('src/components/common/ExportDialog.tsx', `import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { RenderPipeline } from '../../engine/gl/Pipeline';
import { Download, X, Folder, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { photos, selectedPhotoIds, activePhotoId } = useCatalogStore();
  const { developState } = useEditStore();

  const [format, setFormat] = useState<'jpeg' | 'png' | 'tiff' | 'webp'>('jpeg');
  const [quality, setQuality] = useState(90);
  const [sizeMode, setSizeMode] = useState<'original' | 'longEdge' | 'custom'>('original');
  const [longEdgePixels, setLongEdgePixels] = useState(2048);
  const [dpi, setDpi] = useState(300);
  const [namingPrefix, setNamingPrefix] = useState('Lumina_');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const targetPhotos = selectedPhotoIds.length > 0
    ? photos.filter(p => selectedPhotoIds.includes(p.id))
    : (activePhotoId ? photos.filter(p => p.id === activePhotoId) : photos.slice(0, 1));

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    const offscreenCanvas = document.createElement('canvas');
    const pipeline = new RenderPipeline(offscreenCanvas);

    for (let i = 0; i < targetPhotos.length; i++) {
      const p = targetPhotos[i];
      setStatusMessage('Processing ' + (i + 1) + ' of ' + targetPhotos.length + ': ' + p.filename);
      setProgress(Math.round(((i + 1) / targetPhotos.length) * 100));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
        img.src = p.previewUrl || p.thumbnailUrl;
      });

      let outW = img.naturalWidth || 1920;
      let outH = img.naturalHeight || 1080;

      if (sizeMode === 'longEdge') {
        const aspect = outW / outH;
        if (outW >= outH) {
          outW = longEdgePixels;
          outH = Math.round(longEdgePixels / aspect);
        } else {
          outH = longEdgePixels;
          outW = Math.round(longEdgePixels * aspect);
        }
      }

      offscreenCanvas.width = outW;
      offscreenCanvas.height = outH;

      pipeline.setImageSource(img, outW, outH);
      const stateToApply = (p.id === activePhotoId ? developState : p.editState) || developState;
      pipeline.render(stateToApply, outW, outH, false);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
      const dataUrl = offscreenCanvas.toDataURL(mimeType, quality / 100);

      // Download file to client browser / Electron
      const link = document.createElement('a');
      const baseName = p.filename.substring(0, p.filename.lastIndexOf('.')) || p.filename;
      link.download = namingPrefix + baseName + '.' + (format === 'jpeg' ? 'jpg' : format);
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await new Promise(r => setTimeout(r, 150));
    }

    setIsExporting(false);
    setStatusMessage('Export completed successfully!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="w-[560px] bg-dark-900 border border-dark-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-dark-850 border-b border-dark-750">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-semibold text-white">Export Photos ({targetPhotos.length} item{targetPhotos.length === 1 ? '' : 's'})</h3>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-750">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[460px] overflow-y-auto">
          {/* Format Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-dark-300 font-medium">File Format</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'jpeg', label: 'JPEG (.jpg)' },
                { id: 'png', label: 'PNG (.png)' },
                { id: 'tiff', label: 'TIFF (.tif)' },
                { id: 'webp', label: 'WebP (.webp)' }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  className={'py-2 px-3 rounded border text-center font-medium transition-all ' + (
                    format === fmt.id
                      ? 'bg-accent-blue/15 border-accent-blue text-white'
                      : 'bg-dark-850 border-dark-750 text-dark-300 hover:text-white'
                  )}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (for JPEG / WebP) */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="flex flex-col gap-1.5 p-3 rounded bg-dark-850 border border-dark-800">
              <div className="flex justify-between items-center text-dark-300">
                <span>Quality</span>
                <span className="font-mono text-white">{quality}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-1 bg-dark-700 rounded appearance-none cursor-pointer accent-accent-blue"
              />
            </div>
          )}

          {/* Image Sizing */}
          <div className="flex flex-col gap-2 p-3 rounded bg-dark-850 border border-dark-800">
            <label className="text-dark-300 font-medium">Image Sizing</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-dark-200">
                <input
                  type="radio"
                  name="sizeMode"
                  checked={sizeMode === 'original'}
                  onChange={() => setSizeMode('original')}
                  className="text-accent-blue cursor-pointer"
                />
                Original Resolution
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-dark-200">
                <input
                  type="radio"
                  name="sizeMode"
                  checked={sizeMode === 'longEdge'}
                  onChange={() => setSizeMode('longEdge')}
                  className="text-accent-blue cursor-pointer"
                />
                Resize Long Edge
              </label>
            </div>

            {sizeMode === 'longEdge' && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-dark-400">Long Edge:</span>
                <input
                  type="number"
                  value={longEdgePixels}
                  onChange={(e) => setLongEdgePixels(parseInt(e.target.value) || 1920)}
                  className="w-24 px-2 py-1 bg-dark-750 border border-dark-700 text-white rounded font-mono"
                />
                <span className="text-dark-400">pixels</span>
              </div>
            )}
          </div>

          {/* Naming Template & Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-dark-300 font-medium">Filename Prefix</label>
              <input
                type="text"
                value={namingPrefix}
                onChange={(e) => setNamingPrefix(e.target.value)}
                className="px-2.5 py-1.5 bg-dark-850 border border-dark-750 text-white rounded font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-dark-300 font-medium">Resolution (DPI)</label>
              <input
                type="number"
                value={dpi}
                onChange={(e) => setDpi(parseInt(e.target.value) || 300)}
                className="px-2.5 py-1.5 bg-dark-850 border border-dark-750 text-white rounded font-mono text-xs"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="flex flex-col gap-1.5 p-3 rounded bg-dark-850 border border-accent-blue/40">
              <div className="flex justify-between items-center text-xs">
                <span className="text-accent-blue font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusMessage}
                </span>
                <span className="font-mono text-white">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-dark-750 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-blue transition-all duration-200 rounded-full"
                  style={{ width: progress + '%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-dark-850 border-t border-dark-750">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-1.5 rounded bg-dark-750 hover:bg-dark-700 text-dark-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded bg-accent-blue hover:bg-blue-600 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Start Export
          </button>
        </div>
      </div>
    </div>
  );
};
`);

console.log('SyncModal and ExportDialog generated.');
