const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/CanvasViewport.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { RenderPipeline } from '../../engine/gl/Pipeline';
import { SplitView } from '../common/SplitView';
import { DEFAULT_DEVELOP_STATE } from '../../types/adjustments';
import { BrushStroke, Point2D } from '../../types/masks';

export const CanvasViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipelineRef = useRef<RenderPipeline | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { photos, activePhotoId } = useCatalogStore();
  const {
    developState,
    activePresetPreview,
    isBeforeAfter,
    splitPosition,
    setSplitPosition,
    zoom,
    pan,
    setPan,
    setZoom,
    activeTool,
    activeMaskId,
    updateMask,
    showMaskOverlay,
    maskOverlayColor,
    updateHealingPin
  } = useEditStore();

  const activePhoto = photos.find(p => p.id === activePhotoId);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [isPaintingMask, setIsPaintingMask] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);

  // Initialize WebGL2 Render Pipeline
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      pipelineRef.current = new RenderPipeline(canvasRef.current);
    } catch (e) {
      console.error('Failed to initialize WebGL2 render pipeline:', e);
    }
  }, []);

  // Load Image when active photo changes
  useEffect(() => {
    if (!activePhoto) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      if (canvasRef.current && pipelineRef.current) {
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;
        pipelineRef.current.setImageSource(img, img.naturalWidth, img.naturalHeight);
        requestRender();
      }
    };
    img.src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
  }, [activePhotoId]);

  // Real-time 60fps GPU render trigger
  const requestRender = useCallback(() => {
    if (!canvasRef.current || !pipelineRef.current || !imageElementRef.current) return;
    const stateToRender = activePresetPreview
      ? { ...developState, ...activePresetPreview }
      : (isBeforeAfter ? DEFAULT_DEVELOP_STATE : developState);

    pipelineRef.current.render(
      stateToRender,
      canvasRef.current.width,
      canvasRef.current.height,
      showMaskOverlay,
      maskOverlayColor
    );
  }, [developState, activePresetPreview, isBeforeAfter, showMaskOverlay, maskOverlayColor]);

  useEffect(() => {
    requestRender();
  }, [developState, activePresetPreview, isBeforeAfter, showMaskOverlay, requestRender]);

  // Zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(Math.max(0.1, Math.min(8.0, zoom * factor)));
  };

  // Pointer & Pan / Paint Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Space or Middle-click triggers pan
    if (e.button === 1 || e.spaceKey || activeTool === 'select') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Mask painting
    if (activeTool === 'mask' && activeMaskId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const stroke: BrushStroke = {
        points: [{ x: normX, y: normY, pressure: 1.0 }],
        radius: 30,
        feather: 0.5,
        isEraser: e.altKey
      };
      setIsPaintingMask(true);
      setCurrentStroke(stroke);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isPaintingMask && currentStroke && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const updatedStroke = {
        ...currentStroke,
        points: [...currentStroke.points, { x: normX, y: normY, pressure: 1.0 }]
      };
      setCurrentStroke(updatedStroke);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isPaintingMask && currentStroke && activeMaskId) {
      const activeMask = developState.masks.find(m => m.id === activeMaskId);
      if (activeMask && activeMask.data.type === 'brush') {
        const updatedStrokes = [...activeMask.data.strokes, currentStroke];
        updateMask(activeMaskId, {
          data: { type: 'brush', strokes: updatedStrokes }
        });
      }
      setIsPaintingMask(false);
      setCurrentStroke(null);
    }
  };

  if (!activePhoto) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-950 text-dark-500 gap-2 select-none">
        <p className="text-base font-medium text-dark-300">No photograph selected for development.</p>
        <p className="text-xs text-dark-500">Select a photo from the filmstrip or import new photos.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={'relative flex-1 bg-dark-950 overflow-hidden flex items-center justify-center select-none ' + (
        isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool === 'mask' ? 'cursor-crosshair' : 'cursor-default'
      )}
    >
      {/* Interactive Before / After Split View */}
      {isBeforeAfter ? (
        <SplitView splitPosition={splitPosition} onChangeSplit={setSplitPosition}>
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: 'translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')',
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out'
            }}
          >
            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl rounded" />
          </div>
        </SplitView>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: 'translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')',
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out'
          }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain shadow-2xl rounded"
          />

          {/* Interactive Healing Pins Overlay */}
          {activeTool === 'heal' && developState.healingPins.map((pin) => (
            <div
              key={pin.id}
              className="absolute pointer-events-none"
              style={{
                left: (pin.target.x * 100) + '%',
                top: (pin.target.y * 100) + '%'
              }}
            >
              {/* Target Ring */}
              <div
                className="rounded-full border-2 border-dashed border-emerald-400 -translate-x-1/2 -translate-y-1/2"
                style={{ width: (pin.radius * 2) + 'px', height: (pin.radius * 2) + 'px' }}
              />
              {/* Center Dot */}
              <div className="w-2 h-2 rounded-full bg-emerald-400 -translate-x-1/2 -translate-y-1/2 shadow" />
            </div>
          ))}

          {/* Interactive Crop Grid Overlay */}
          {activeTool === 'crop' && (
            <div className="absolute inset-4 border-2 border-white/80 pointer-events-none grid grid-cols-3 grid-rows-3 shadow-2xl">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved CanvasViewport.tsx');
