const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/Histogram.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React, { useRef, useEffect, useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { AlertCircle } from 'lucide-react';

export const Histogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { photos, activePhotoId } = useCatalogStore();
  const { developState } = useEditStore();
  const [showShadowClipping, setShowShadowClipping] = useState(false);
  const [showHighlightClipping, setShowHighlightClipping] = useState(false);

  const activePhoto = photos.find(p => p.id === activePhotoId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark background grid
    ctx.fillStyle = '#111215';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#252932';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 4) * i, 0);
      ctx.lineTo((width / 4) * i, height);
      ctx.stroke();
    }

    // Generate simulated dynamic histogram based on exposure and adjustments
    const binsR = new Float32Array(256);
    const binsG = new Float32Array(256);
    const binsB = new Float32Array(256);

    const expShift = developState.tone.exposure * 24;
    const tempShift = ((developState.tone.temperature - 5500) / 6500) * 35;
    const tintShift = developState.tone.tint * 0.4;
    const contrast = (developState.tone.contrast / 100) + 1.0;

    // Normal distribution peaks shifted by develop parameters
    for (let i = 0; i < 256; i++) {
      const x = i;
      
      // Luminance / Base curve
      const norm = (x - 128) / 55;
      let base = Math.exp(-0.5 * norm * norm) * 0.7;

      // Secondary highlight & shadow components
      const shadowNorm = (x - (40 + expShift)) / 30;
      const shadowVal = Math.exp(-0.5 * shadowNorm * shadowNorm) * 0.4;

      const hiNorm = (x - (200 + expShift)) / 35;
      const hiVal = Math.exp(-0.5 * hiNorm * hiNorm) * 0.3;

      let rVal = (base + shadowVal + hiVal) * (1 + (tempShift * 0.01) + (tintShift * 0.005));
      let gVal = (base + shadowVal + hiVal) * (1 - (tintShift * 0.01));
      let bVal = (base + shadowVal + hiVal) * (1 - (tempShift * 0.01) + (tintShift * 0.005));

      const center = 128;
      const rIdx = Math.max(0, Math.min(255, Math.round((x - center + expShift + tempShift) * contrast + center)));
      const gIdx = Math.max(0, Math.min(255, Math.round((x - center + expShift - tintShift * 0.5) * contrast + center)));
      const bIdx = Math.max(0, Math.min(255, Math.round((x - center + expShift - tempShift) * contrast + center)));

      binsR[rIdx] = Math.max(binsR[rIdx], rVal);
      binsG[gIdx] = Math.max(binsG[gIdx], gVal);
      binsB[bIdx] = Math.max(binsB[bIdx], bVal);
    }

    const drawChannel = (bins: Float32Array, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < 256; i++) {
        const px = (i / 255) * width;
        const py = height - (Math.min(1.0, bins[i]) * height * 0.9);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    ctx.globalCompositeOperation = 'screen';
    drawChannel(binsR, 'rgba(239, 68, 68, 0.45)');
    drawChannel(binsG, 'rgba(34, 197, 94, 0.45)');
    drawChannel(binsB, 'rgba(59, 130, 246, 0.45)');
    ctx.globalCompositeOperation = 'source-over';
  }, [developState, activePhoto]);

  return (
    <div className="bg-dark-900 border-b border-dark-800 flex flex-col select-none">
      <div className="relative w-full h-24 bg-dark-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={280}
          height={96}
          className="w-full h-full block"
        />

        {/* Shadow clipping toggle */}
        <button
          onClick={() => setShowShadowClipping(!showShadowClipping)}
          className={'absolute top-1.5 left-2 p-1 rounded transition-colors ' + (
            showShadowClipping ? 'bg-blue-600 text-white' : 'text-dark-500 hover:text-white bg-dark-900/60'
          )}
          title="Show Shadow Clipping (Blue)"
        >
          <AlertCircle className="w-3 h-3" />
        </button>

        {/* Highlight clipping toggle */}
        <button
          onClick={() => setShowHighlightClipping(!showHighlightClipping)}
          className={'absolute top-1.5 right-2 p-1 rounded transition-colors ' + (
            showHighlightClipping ? 'bg-rose-600 text-white' : 'text-dark-500 hover:text-white bg-dark-900/60'
          )}
          title="Show Highlight Clipping (Red)"
        >
          <AlertCircle className="w-3 h-3" />
        </button>
      </div>

      {/* Exposure Metadata underneath Histogram */}
      {activePhoto?.exif && (
        <div className="px-3 py-1 bg-dark-900 flex items-center justify-between text-[10px] text-dark-400 font-mono">
          <span>{activePhoto.exif.iso ? 'ISO ' + activePhoto.exif.iso : 'ISO 100'}</span>
          <span>{activePhoto.exif.focalLength || '50mm'}</span>
          <span>{activePhoto.exif.fNumber || 'f/2.8'}</span>
          <span>{activePhoto.exif.exposureTime ? activePhoto.exif.exposureTime + 's' : '1/250s'}</span>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved Histogram.tsx');
