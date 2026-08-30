import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { RenderPipeline } from '../../engine/gl/Pipeline';
import { SplitView } from '../common/SplitView';
import { DEFAULT_DEVELOP_STATE } from '../../types/adjustments';
import { BrushStroke, Point2D } from '../../types/masks';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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

  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [isPaintingMask, setIsPaintingMask] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);

  const getOrCreatePipeline = useCallback(() => {
    if (pipelineRef.current) return pipelineRef.current;
    if (!canvasRef.current) return null;
    try {
      pipelineRef.current = new RenderPipeline(canvasRef.current);
      return pipelineRef.current;
    } catch (e) {
      console.warn('WebGL2 context creation fallback to 2D canvas:', e);
      return null;
    }
  }, []);

  const requestRender = useCallback(() => {
    if (!canvasRef.current || !imageElementRef.current) return;
    const img = imageElementRef.current;
    const w = img.naturalWidth || canvasRef.current.width || 1200;
    const h = img.naturalHeight || canvasRef.current.height || 800;

    if (canvasRef.current.width !== w || canvasRef.current.height !== h) {
      canvasRef.current.width = w;
      canvasRef.current.height = h;
    }

    const stateToRender = activePresetPreview
      ? { ...developState, ...activePresetPreview }
      : isBeforeAfter
      ? DEFAULT_DEVELOP_STATE
      : developState;

    const pipeline = getOrCreatePipeline();
    if (pipeline) {
      pipeline.render(
        stateToRender,
        w,
        h,
        activeMaskGroupId,
        overlayConfig
      );
    } else {
      // 2D Canvas Fallback
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
      }
    }
  }, [developState, activePresetPreview, isBeforeAfter, activeMaskGroupId, overlayConfig, getOrCreatePipeline]);

  // Load active photo image ONLY when photo ID or source URL changes
  useEffect(() => {
    setImageLoadError(false);
    if (!activePhoto) return;
    const src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
    if (!src) {
      setImageLoadError(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const onImageLoaded = () => {
      imageElementRef.current = img;
      setImageLoadError(false);
      if (canvasRef.current) {
        const w = img.naturalWidth || 1200;
        const h = img.naturalHeight || 800;
        canvasRef.current.width = w;
        canvasRef.current.height = h;

        const pipeline = getOrCreatePipeline();
        if (pipeline) {
          pipeline.setImageSource(img, w, h);
        }
        requestRender();
      }
    };

    img.onload = onImageLoaded;
    img.onerror = () => {
      console.error('Failed to load image:', src);
      setImageLoadError(true);
    };

    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      onImageLoaded();
    }
  }, [activePhoto?.id, activePhoto?.previewUrl, reloadCounter, getOrCreatePipeline]);

  // Re-render instantly when edit state or active mask changes
  useEffect(() => {
    requestRender();
  }, [requestRender]);

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
      const group = developState.masks.find((g) => g.id === activeMaskGroupId);
      const comp = group?.components.find((c) => c.id === activeComponentId) || group?.components[0];
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

  if (imageLoadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-950 text-dark-400 gap-3 select-none">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-base font-medium text-dark-200">Unable to display this image.</p>
        <p className="text-xs text-dark-500">The file source could not be decoded or loaded.</p>
        <button
          onClick={() => setReloadCounter((c) => c + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-white rounded text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry / Reload Image
        </button>
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
      className={
        'relative flex-1 bg-dark-950 overflow-hidden flex items-center justify-center select-none ' +
        (isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'mask'
          ? 'cursor-crosshair'
          : 'cursor-default')
      }
      style={{ minWidth: 0, minHeight: 0 }}
    >
      {isBeforeAfter ? (
        <SplitView splitPosition={splitPosition} onChangeSplit={setSplitPosition}>
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out'
            }}
          >
            <canvas
              ref={canvasRef}
              className="rounded-sm block shadow-2xl"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain'
              }}
            />
          </div>
        </SplitView>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out'
          }}
        >
          <canvas
            ref={canvasRef}
            className="rounded-sm block shadow-2xl"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
          />

          <div className="pointer-events-none">
            {/* Crop grid overlay */}
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
