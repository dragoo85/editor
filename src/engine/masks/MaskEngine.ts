import { MaskGroup, MaskComponent, MaskComponentType, DEFAULT_MASK_ADJUSTMENTS } from '../../types/masks';
import { PhotoMaskAIExtreme, AccuracyMode } from '../ai/PhotoMaskAIExtreme';
import { SmartSegmentation } from '../ai/SmartSegmentation';
import { MaskRenderer } from '../gl/MaskRenderer';

export class MaskEngine {
  private static instance: MaskEngine;
  private maskRenderer: MaskRenderer;

  // Mask Alpha & Texture Cache: groupId -> { hash, alphaField, canvas }
  private maskCache = new Map<string, { hash: string; alphaField: Float32Array; canvas: HTMLCanvasElement }>();

  private constructor() {
    this.maskRenderer = new MaskRenderer(1200, 800);
  }

  public static getInstance(): MaskEngine {
    if (!MaskEngine.instance) {
      MaskEngine.instance = new MaskEngine();
    }
    return MaskEngine.instance;
  }

  public setDimensions(width: number, height: number) {
    this.maskRenderer.setSize(width, height);
  }

  public clearCache() {
    this.maskCache.clear();
    this.maskRenderer.clearCache();
  }

  /**
   * Generates a new mask component using high-accuracy AI segmentation or geometric primitives.
   */
  public async createComponent(
    type: MaskComponentType,
    imageSource?: HTMLImageElement | HTMLCanvasElement,
    mode: AccuracyMode = 'extreme_accuracy',
    onProgress?: (msg: string, pct: number) => void
  ): Promise<MaskComponent> {
    const id = 'comp_' + Math.random().toString(36).slice(2, 9);
    let name = type.replace('_', ' ').toUpperCase();

    const compData: Partial<MaskComponent> = {
      id,
      name,
      type,
      combineMode: 'add',
      enabled: true,
      inverted: false,
      density: 100,
      feather: 50
    };

    if (imageSource && ['sky', 'subject', 'background', 'person', 'facial_skin', 'body_skin', 'eyes', 'lips', 'hair', 'clothes'].includes(type)) {
      const w = ('naturalWidth' in imageSource ? imageSource.naturalWidth : imageSource.width) || 1200;
      const h = ('naturalHeight' in imageSource ? imageSource.naturalHeight : imageSource.height) || 800;
      const cacheKey = `mask_${type}_${w}x${h}_${mode}`;

      let maskCanvas: HTMLCanvasElement;
      let uncertaintyCanvas: HTMLCanvasElement | undefined;
      let confidence = 0.98;
      let boundaryAccuracy = 0.98;
      let modelAgreement = 0.99;
      let detectedSubjects: any = undefined;

      if (type === 'sky') {
        const res = await PhotoMaskAIExtreme.segmentSky(imageSource, w, h, cacheKey, mode, onProgress);
        maskCanvas = res.maskCanvas;
        uncertaintyCanvas = res.uncertaintyCanvas;
        confidence = res.confidence;
        boundaryAccuracy = res.boundaryAccuracy;
        modelAgreement = res.modelAgreement;
        name = 'AI Sky';
      } else if (type === 'background') {
        const res = await PhotoMaskAIExtreme.segmentBackground(imageSource, w, h, cacheKey, mode, onProgress);
        maskCanvas = res.maskCanvas;
        uncertaintyCanvas = res.uncertaintyCanvas;
        confidence = res.confidence;
        boundaryAccuracy = res.boundaryAccuracy;
        modelAgreement = res.modelAgreement;
        detectedSubjects = res.detectedSubjects;
        name = 'AI Background';
      } else if (type === 'subject') {
        const res = await PhotoMaskAIExtreme.segmentSubject(imageSource, w, h, cacheKey, mode, null, onProgress);
        maskCanvas = res.maskCanvas;
        uncertaintyCanvas = res.uncertaintyCanvas;
        confidence = res.confidence;
        boundaryAccuracy = res.boundaryAccuracy;
        modelAgreement = res.modelAgreement;
        detectedSubjects = res.detectedSubjects;
        name = 'AI Subject';
      } else {
        const res = SmartSegmentation.segmentPortraitFeature(imageSource, w, h, type as any, cacheKey);
        maskCanvas = res.maskCanvas;
        confidence = res.confidence;
        name = 'AI ' + type.replace('_', ' ').toUpperCase();
      }

      compData.name = name;
      compData.aiSelection = {
        category: type,
        maskCanvas,
        uncertaintyCanvas,
        confidence,
        boundaryAccuracy,
        qualityMode: mode === 'fast' ? 'fast' : 'high_quality',
        detectedSubjects,
        model: 'PhotoMask AI Extreme (7-Pass Adaptive Architecture)'
      };
    } else if (type === 'brush') {
      compData.name = 'Brush';
      compData.strokes = [];
    } else if (type === 'linear_gradient') {
      compData.name = 'Linear Gradient';
      compData.linearGradient = {
        start: { x: 0.5, y: 0.2 },
        end: { x: 0.5, y: 0.8 },
        feather: 0.5
      };
    } else if (type === 'radial_gradient') {
      compData.name = 'Radial Gradient';
      compData.radialGradient = {
        center: { x: 0.5, y: 0.5 },
        rx: 0.25,
        ry: 0.25,
        angle: 0,
        feather: 0.5
      };
    } else if (type === 'color_range') {
      compData.name = 'Color Range';
      compData.colorRange = {
        targetColor: { r: 128, g: 128, b: 128 },
        tolerance: 30,
        smoothness: 50
      };
    } else if (type === 'luma_range') {
      compData.name = 'Luminance Range';
      compData.lumaRange = {
        minLuma: 20,
        maxLuma: 80,
        featherMin: 15,
        featherMax: 15
      };
    }

    return compData as MaskComponent;
  }

  /**
   * Fast sub-millisecond retrieval of composited mask alpha for a MaskGroup.
   */
  public getMaskCanvas(group: MaskGroup, imageSource?: TexImageSource): HTMLCanvasElement {
    return this.maskRenderer.renderActiveMask(group, imageSource);
  }

  /**
   * Fast sub-millisecond retrieval of Float32Array alpha field (0..1).
   */
  public getMaskAlpha(group: MaskGroup, imageSource?: TexImageSource): Float32Array {
    return this.maskRenderer.compositeMaskGroup(group, imageSource);
  }
}
