import React, { useRef, useEffect, useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { AlertCircle } from 'lucide-react';
import { kelvinToRGB } from '../../engine/math/ColorSpaces';

type ToneZone = 'blacks' | 'shadows' | 'exposure' | 'highlights' | 'whites' | null;

export const Histogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { photos, activePhotoId } = useCatalogStore();
  const { developState, updateTone, commitHistory } = useEditStore();
  const [hoveredZone, setHoveredZone] = useState<ToneZone>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startVal, setStartVal] = useState(0);

  const [showShadowClipping, setShowShadowClipping] = useState(false);
  const [showHighlightClipping, setShowHighlightClipping] = useState(false);

  const [hasShadowClip, setHasShadowClip] = useState(false);
  const [hasHighlightClip, setHasHighlightClip] = useState(false);

  const activePhoto = photos.find((p) => p.id === activePhotoId);

  // Real pixel histogram calculation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activePhoto) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, width, height);

    // 5 Tone Zone Division lines (Blacks, Shadows, Exposure, Highlights, Whites)
    ctx.strokeStyle = '#222731';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((width / 5) * i, 0);
      ctx.lineTo((width / 5) * i, height);
      ctx.stroke();
    }

    // Hovered Zone Highlight
    if (hoveredZone) {
      const zoneBounds: Record<string, [number, number]> = {
        blacks: [0, 0.2],
        shadows: [0.2, 0.4],
        exposure: [0.4, 0.6],
        highlights: [0.6, 0.8],
        whites: [0.8, 1.0]
      };
      const [zStart, zEnd] = zoneBounds[hoveredZone] || [0, 0];
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(zStart * width, 0, (zEnd - zStart) * width, height);
    }

    const src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const renderHistogramFromImage = () => {
      const sampleCanvas = document.createElement('canvas');
      const sW = 160;
      const sH = Math.round(160 * ((img.naturalHeight || 800) / (img.naturalWidth || 1200)));
      sampleCanvas.width = sW;
      sampleCanvas.height = sH;
      const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      if (!sCtx) return;

      sCtx.drawImage(img, 0, 0, sW, sH);
      const imgData = sCtx.getImageData(0, 0, sW, sH).data;

      const binsR = new Uint32Array(256);
      const binsG = new Uint32Array(256);
      const binsB = new Uint32Array(256);

      const expFactor = Math.pow(2.0, developState.tone.exposure);
      const [wbR, wbG, wbB] = kelvinToRGB(developState.tone.temperature);
      const tintVal = developState.tone.tint * 0.003;
      const contrastFactor = (developState.tone.contrast / 100) + 1.0;
      const highlightsVal = developState.tone.highlights * 0.006;
      const shadowsVal = developState.tone.shadows * 0.006;
      const whitesVal = developState.tone.whites * 0.004;
      const blacksVal = developState.tone.blacks * 0.004;

      let shadowClipped = 0;
      let highlightClipped = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        let r = imgData[i] / 255.0;
        let g = imgData[i + 1] / 255.0;
        let b = imgData[i + 2] / 255.0;

        // WB & Tint
        r *= wbR;
        g *= wbG;
        b *= wbB;
        g -= tintVal;
        r += tintVal * 0.5;
        b += tintVal * 0.5;

        // Exposure
        r *= expFactor;
        g *= expFactor;
        b *= expFactor;

        // Highlights / Shadows / Whites / Blacks
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (shadowsVal !== 0) {
          const sw = Math.max(0, 1.0 - luma * 2.0);
          r += r * shadowsVal * sw;
          g += g * shadowsVal * sw;
          b += b * shadowsVal * sw;
        }
        if (highlightsVal !== 0) {
          const hw = Math.max(0, (luma - 0.5) * 2.0);
          r += (1.0 - r) * highlightsVal * hw;
          g += (1.0 - g) * highlightsVal * hw;
          b += (1.0 - b) * highlightsVal * hw;
        }
        if (whitesVal !== 0) {
          const ww = Math.max(0, (luma - 0.75) * 4.0);
          r += r * whitesVal * ww;
          g += g * whitesVal * ww;
          b += b * whitesVal * ww;
        }
        if (blacksVal !== 0) {
          const bw = Math.max(0, 1.0 - luma * 4.0);
          r += r * blacksVal * bw;
          g += g * blacksVal * bw;
          b += b * blacksVal * bw;
        }

        // Contrast
        r = (r - 0.5) * contrastFactor + 0.5;
        g = (g - 0.5) * contrastFactor + 0.5;
        b = (b - 0.5) * contrastFactor + 0.5;

        const outR = Math.max(0, Math.min(255, Math.round(r * 255)));
        const outG = Math.max(0, Math.min(255, Math.round(g * 255)));
        const outB = Math.max(0, Math.min(255, Math.round(b * 255)));

        binsR[outR]++;
        binsG[outG]++;
        binsB[outB]++;

        if (outR === 0 && outG === 0 && outB === 0) shadowClipped++;
        if (outR === 255 && outG === 255 && outB === 255) highlightClipped++;
      }

      setHasShadowClip(shadowClipped > 20);
      setHasHighlightClip(highlightClipped > 20);

      // Find peak bin for normalization
      let maxCount = 1;
      for (let i = 1; i < 255; i++) {
        if (binsR[i] > maxCount) maxCount = binsR[i];
        if (binsG[i] > maxCount) maxCount = binsG[i];
        if (binsB[i] > maxCount) maxCount = binsB[i];
      }

      const drawChannel = (bins: Uint32Array, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < 256; i++) {
          const px = (i / 255) * width;
          const py = height - (Math.min(1.0, bins[i] / maxCount) * height * 0.9);
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
    };

    img.onload = renderHistogramFromImage;
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      renderHistogramFromImage();
    }
  }, [developState, activePhoto, hoveredZone]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;

    if (!isDragging) {
      if (normX < 0.2) setHoveredZone('blacks');
      else if (normX < 0.4) setHoveredZone('shadows');
      else if (normX < 0.6) setHoveredZone('exposure');
      else if (normX < 0.8) setHoveredZone('highlights');
      else setHoveredZone('whites');
    } else if (hoveredZone) {
      const deltaX = e.clientX - dragStartX;
      if (hoveredZone === 'exposure') {
        const newExp = Math.max(-5.0, Math.min(5.0, startVal + deltaX * 0.02));
        updateTone({ exposure: newExp });
      } else {
        const newVal = Math.max(-100, Math.min(100, Math.round(startVal + deltaX * 0.8)));
        updateTone({ [hoveredZone]: newVal });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hoveredZone) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    if (hoveredZone === 'exposure') {
      setStartVal(developState.tone.exposure);
    } else {
      setStartVal((developState.tone as any)[hoveredZone] || 0);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      commitHistory('Histogram Adjust ' + (hoveredZone || ''));
    }
  };

  return (
    <div className="bg-dark-900 border-b border-dark-800 flex flex-col select-none">
      {/* 1. Header with Clipping Toggles & EXIF Readout */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-dark-800/80 text-[11px] text-dark-300">
        <button
          onClick={() => setShowShadowClipping(!showShadowClipping)}
          className={
            'p-1 rounded transition-colors ' +
            (showShadowClipping || hasShadowClip
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-dark-500 hover:text-white')
          }
          title="Toggle Shadow Clipping (J)"
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </button>

        {activePhoto?.exif && (
          <div className="flex items-center gap-2.5 font-mono text-[10px] text-dark-300">
            <span>ISO {activePhoto.exif.iso || 100}</span>
            <span>{activePhoto.exif.focalLength || '50mm'}</span>
            <span>{activePhoto.exif.fNumber || 'f/2.8'}</span>
            <span>{activePhoto.exif.exposureTime || '1/125s'}</span>
          </div>
        )}

        <button
          onClick={() => setShowHighlightClipping(!showHighlightClipping)}
          className={
            'p-1 rounded transition-colors ' +
            (showHighlightClipping || hasHighlightClip
              ? 'bg-rose-500/20 text-rose-400'
              : 'text-dark-500 hover:text-white')
          }
          title="Toggle Highlight Clipping (J)"
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Interactive Canvas Histogram */}
      <div className="relative h-28 w-full p-1.5 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={95}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (!isDragging) setHoveredZone(null);
          }}
          className={'w-full h-full rounded cursor-ew-resize ' + (isDragging ? 'cursor-grabbing' : '')}
        />
        {hoveredZone && (
          <div className="absolute bottom-2 left-3 px-1.5 py-0.5 rounded bg-dark-950/90 text-white font-mono text-[10px] uppercase border border-dark-700 shadow">
            {hoveredZone}:{' '}
            {hoveredZone === 'exposure'
              ? (developState.tone.exposure > 0 ? '+' : '') + developState.tone.exposure.toFixed(2) + ' EV'
              : (developState.tone as any)[hoveredZone] || 0}
          </div>
        )}
      </div>
    </div>
  );
};
