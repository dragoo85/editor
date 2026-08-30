const fs = require('fs');
const path = require('path');

// 1. Fix Pipeline.ts mask texture initialization and rendering
const pipelinePath = path.resolve('src/engine/gl/Pipeline.ts');
let pipelineCode = fs.readFileSync(pipelinePath, 'utf8');

// Ensure maskTexture is always initialized with clean transparent pixels [0,0,0,0]
pipelineCode = pipelineCode.replace(
  `this.maskTexture = this.create2DTexture();`,
  `this.maskTexture = this.create2DTexture();
    const blank = new Uint8Array([0, 0, 0, 0]);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.maskTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, blank
    );`
);

// Ensure render clears maskTexture if masks is empty
pipelineCode = pipelineCode.replace(
  `    // 2. Render Masks to Mask Texture
    if (state.masks.length > 0) {
      this.maskRenderer.renderMasks(state.masks);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        this.maskRenderer.getCanvas()
      );
    }`,
  `    // 2. Render Masks to Mask Texture
    if (state.masks.length > 0) {
      this.maskRenderer.renderMasks(state.masks);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        this.maskRenderer.getCanvas()
      );
    } else {
      const blank = new Uint8Array([0, 0, 0, 0]);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, blank
      );
    }`
);

fs.writeFileSync(pipelinePath, pipelineCode, 'utf8');

// 2. Fix catalogStore.ts to auto-select first photo
const catalogStorePath = path.resolve('src/state/catalogStore.ts');
let catalogCode = fs.readFileSync(catalogStorePath, 'utf8');
catalogCode = catalogCode.replace(
  `const catalogDB = new CatalogDB();

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  photos: catalogDB.getAllPhotos(),
  selectedPhotoIds: [],
  activePhotoId: null,`,
  `const catalogDB = new CatalogDB();
const initialPhotos = catalogDB.getAllPhotos();

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  photos: initialPhotos,
  selectedPhotoIds: initialPhotos.length > 0 ? [initialPhotos[0].id] : [],
  activePhotoId: initialPhotos.length > 0 ? initialPhotos[0].id : null,`
);
fs.writeFileSync(catalogStorePath, catalogCode, 'utf8');

// 3. Fix CanvasViewport.tsx for resilient mounting and render lifecycle
fs.writeFileSync(path.resolve('src/components/develop/CanvasViewport.tsx'), `import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    activeMaskId,
    updateMask,
    showMaskOverlay,
    maskOverlayColor
  } = useEditStore();

  // If no active photo but photos exist, select first photo
  useEffect(() => {
    if (!activePhotoId && photos.length > 0) {
      setActivePhoto(photos[0].id);
    }
  }, [activePhotoId, photos, setActivePhoto]);

  const activePhoto = photos.find(p => p.id === activePhotoId) || photos[0];

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [isPaintingMask, setIsPaintingMask] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);

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

  // Ensure Pipeline is ready
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

  // Load Image whenever activePhoto changes or mounts
  useEffect(() => {
    if (!activePhoto) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      const pipeline = getOrCreatePipeline();
      if (canvasRef.current && pipeline) {
        canvasRef.current.width = img.naturalWidth || 1920;
        canvasRef.current.height = img.naturalHeight || 1280;
        pipeline.setImageSource(img, canvasRef.current.width, canvasRef.current.height);
        requestRender();
      }
    };
    img.src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
  }, [activePhoto, getOrCreatePipeline, requestRender]);

  useEffect(() => {
    requestRender();
  }, [developState, activePresetPreview, isBeforeAfter, showMaskOverlay, requestRender]);

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
      const mask = developState.masks.find(m => m.id === activeMaskId);
      if (mask && mask.data.type === 'brush') {
        const updatedStrokes = [...mask.data.strokes, currentStroke];
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
            <canvas ref={canvasRef} className="max-w-[95%] max-h-[95%] object-contain shadow-2xl rounded" />
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
            className="max-w-[95%] max-h-[95%] object-contain shadow-2xl rounded"
          />

          {/* Interactive Crop Grid Overlay */}
          {activeTool === 'crop' && (
            <div className="absolute inset-8 border-2 border-white/80 pointer-events-none grid grid-cols-3 grid-rows-3 shadow-2xl">
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
`, 'utf8');

console.log('CanvasViewport, Pipeline, and catalogStore fixed.');
