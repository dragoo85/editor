import React, { useRef, useEffect, useState, useCallback } from 'react';
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

  const { photos, activePhotoId, setActivePhoto } = useCatalogStore();
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
    activeMaskGroupId,
    activeComponentId,
    overlayConfig,
    brushSettings,
    updateComponent
  } = useEditStore();

  useEffect(() => {
    if (!activePhotoId && photos.length > 0) {
      setActivePhoto(photos[0].id);
    }
  }, [activePhotoId, photos, setActivePhoto]);

  const activePhoto = photos.find(p => p.id === activePhotoId) || photos[0];

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>(; { x: 0, y: 0 });
  const [isPaintingMask, setIsPaintingMask] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);

  const requestRender = useCallback(() => {
    if (!canvasRef || !canvasRef.current || !pipelineRef.current || !imageElementRef.current) return;

    const stateToRender = activePresetPreview
      ? { ...developState, ...activePresetPreview }
      : (isBeforeAfter ? DEFAULT_DEVELOP_STATE : developState);

    pipelineRef.current.render(
      stateToRender,
      canvasRef.current.width,
      canvasRef.current.height,
      activeMaskGroupId,
      overlayConfig
    );
  }, [developState, activePresetPreview, isBeforeAfter, activeMaskGroupId, overlayConfig]);

  const getOrCreatePipeline = useCallback(() => {
    if (pipelineRef.current) return pipelineRef.current;
    if (!canvasRef.current) return null;
    try {
      pipelineRef.current = new RenderPipeline(canvasRef.current);
      return pipelineRef.current;
    } catch (e) {
      console.error('Failed to initialize WebGL2 render pipeline:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!activePhoto) return;
    const src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      const pipeline = getOrCreatePipeline();
      if (canvasRef.current && pipeline) {
        canvasRef.current.width = img.naturalWidth || 1200;
        canvasRef.current.height = img.naturalHeight || 800;
        pipeline.setImageSource(img, canvasRef.current.width, canvasRef.current.height);
        requestRender();
      }
    };
    img.src = src;
  }, [activePhoto, getOrCreatePipeline, requestRender]);

  useEffect(() => {
    requestRender();
  }, [developState, activePresetPreview, isBeforeAfter, activeMaskGroupId, overlayConfig, requestRender]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(Math.max(0.1, Math.min(8.0, zoom * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.spaceKey || activeTool === 'select') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'mask' && activeMaskGroupId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const stroke: BrushStroke = {
        points: [{ x: normX, y: normY, pressure: 1.0 }],
        radius: brushSettings.size,
        feather: brushSettings.feather,
        isEraser: e.altKey || brushSettings.isEraser
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
    if (isPaintingMask && currentStroke && activeMaskGroupId) {
      const group = developState.masks.find(g => g.id === activeMaskGroupId);
      const comp = group?.components.find(c => c.id === activeComponentId) || group?.components[0];
      if (group && comp && comp.type === 'brush') {
        const strokes = [...(comp.strokes || []), currentStroke];
        updateComponent(group.id, comp.id, { strokes }, true);
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
    <div ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} className={'relative flex-1 bg-dark-950 overflow-hidden flex items-center justify-center select-none ' + (isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool === 'mask' ? 'cursor-crosshair' : 'cursor-default')} style={{ minWidth: 0, minHeight: 0 }}>
      {isBeforeAfter ? (
        <SplitView splitPosition={splitPosition} onChangeSplit={setSplitPosition}>
          <div className="w-full h-full flex items-center justify-center p-4" style={{ transform: 'translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')', transformOrigin: 'center center', transition: isPanning ? 'none' : 'transform 0.05s ease-out' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)' }} className="rounded-sm" />
          </div>
        </SplitView>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4" style={{ transform: 'translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')', transformOrigin: 'center center', transition: isPanning ? 'none' : 'transform 0.05s ease-out' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)' }} className="rounded-sm" />

          <div className="pointer-events-none">
            {{* Crop grid overlay *}}
            {activeTool === 'crop' && (
              <div className="absolute inset-8 border-2 border-white/80 pointer-events-none grid grid-cols-3 grid-rows-3 shadow-2xl">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/30" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
