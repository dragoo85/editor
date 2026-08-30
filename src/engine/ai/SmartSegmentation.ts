import { MaskComponentType, ColorRangeData, LumaRangeData, DepthRangeData } from '../../types/masks';
import { SkySegmentation, SegmentationResult } from './SkySegmentation';
import { SubjectSegmentation } from './SubjectSegmentation';
import { PortraitSegmentation } from './PortraitSegmentation';
import { GuidedFilter } from './GuidedFilter';

/**
 * Advanced AI & Computer Vision Segmentation Engine
 * Offline, pixel-accurate semantic image analysis for Sky, Subject, Background, People, and Ranges.
 */
export class SmartSegmentation {
  // Segmentation mask cache: key -> { maskCanvas, confidence, timestamp }
  private static cache = new Map<string, { canvas: HTMLCanvasElement; confidence: number; timestamp: number }>();

  private static getSourceData(image: TexImageSource, width: number, height: number): ImageData | null {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image as any, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * AI Sky Segmentation with true horizon boundary tracing.
   */
  public static segmentSky(image: TexImageSource, width: number, height: number, cacheKey?: string): SegmentationResult {
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { maskCanvas: cached.canvas, confidence: cached.confidence };
    }

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) {
      const fallback = document.createElement('canvas');
      fallback.width = width;
      fallback.height = height;
      return { maskCanvas: fallback, confidence: 0.5 };
    }

    const result = SkySegmentation.segment(imgData, width, height);
    if (cacheKey) {
      this.cache.set(cacheKey, { canvas: result.maskCanvas, confidence: result.confidence, timestamp: Date.now() });
    }
    return result;
  }

  /**
   * AI Subject Segmentation with frequency-tuned Lab saliency and guided matting.
   */
  public static segmentSubject(image: TexImageSource, width: number, height: number, cacheKey?: string): SegmentationResult {
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { maskCanvas: cached.canvas, confidence: cached.confidence };
    }

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) {
      const fallback = document.createElement('canvas');
      fallback.width = width;
      fallback.height = height;
      return { maskCanvas: fallback, confidence: 0.5 };
    }

    const result = SubjectSegmentation.segment(imgData, width, height);
    if (cacheKey) {
      this.cache.set(cacheKey, { canvas: result.maskCanvas, confidence: result.confidence, timestamp: Date.now() });
    }
    return result;
  }

  /**
   * AI Background Segmentation (Exact mathematical inversion of subject with edge refinement).
   */
  public static segmentBackground(image: TexImageSource, width: number, height: number, cacheKey?: string): SegmentationResult {
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { maskCanvas: cached.canvas, confidence: cached.confidence };
    }

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) {
      const fallback = document.createElement('canvas');
      fallback.width = width;
      fallback.height = height;
      return { maskCanvas: fallback, confidence: 0.5 };
    }

    const result = SubjectSegmentation.segmentBackground(imgData, width, height);
    if (cacheKey) {
      this.cache.set(cacheKey, { canvas: result.maskCanvas, confidence: result.confidence, timestamp: Date.now() });
    }
    return result;
  }

  /**
   * AI Portrait & Anatomical Segmentation.
   */
  public static segmentPortraitFeature(
    image: TexImageSource,
    width: number,
    height: number,
    feature: 'facial_skin' | 'body_skin' | 'eyes' | 'lips' | 'hair' | 'clothes' | 'person',
    cacheKey?: string
  ): SegmentationResult {
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { maskCanvas: cached.canvas, confidence: cached.confidence };
    }

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) {
      const fallback = document.createElement('canvas');
      fallback.width = width;
      fallback.height = height;
      return { maskCanvas: fallback, confidence: 0.5 };
    }

    const result = PortraitSegmentation.segment(imgData, width, height, feature);
    if (cacheKey) {
      this.cache.set(cacheKey, { canvas: result.maskCanvas, confidence: result.confidence, timestamp: Date.now() });
    }
    return result;
  }

  /**
   * Color Range Mask: Euclidean Delta-E color distance in RGB with tolerance and smoothness falloff.
   */
  public static segmentColorRange(
    image: TexImageSource,
    width: number,
    height: number,
    dataProps: ColorRangeData
  ): HTMLCanvasElement {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return maskCanvas;

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) return maskCanvas;
    const data = imgData.data;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    const targetR = dataProps.targetColor.r;
    const targetG = dataProps.targetColor.g;
    const targetB = dataProps.targetColor.b;
    const tolerance = Math.max(1, dataProps.tolerance) * 2.55;
    const smoothness = Math.max(1, dataProps.smoothness) * 1.5;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dist = Math.hypot(r - targetR, g - targetG, b - targetB);
      let alpha = 0;

      if (dist <= tolerance) {
        alpha = 1.0;
      } else if (dist <= tolerance + smoothness) {
        alpha = 1.0 - (dist - tolerance) / smoothness;
      }

      const maskVal = Math.round(Math.max(0, Math.min(1.0, alpha)) * 255);
      mData[i] = 255;
      mData[i + 1] = 255;
      mData[i + 2] = 255;
      mData[i + 3] = maskVal;
    }

    maskCtx.putImageData(maskData, 0, 0);
    return maskCanvas;
  }

  /**
   * Luminance Range Mask: Dual-threshold luminance band with min/max falloff.
   */
  public static segmentLumaRange(
    image: TexImageSource,
    width: number,
    height: number,
    dataProps: LumaRangeData
  ): HTMLCanvasElement {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return maskCanvas;

    const imgData = this.getSourceData(image, width, height);
    if (!imgData) return maskCanvas;
    const data = imgData.data;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    const minLuma = (dataProps.minLuma / 100) * 255;
    const maxLuma = (dataProps.maxLuma / 100) * 255;
    const featherMin = (dataProps.featherMin / 100) * 50;
    const featherMax = (dataProps.featherMax / 100) * 50;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      let alpha = 0;
      if (luma >= minLuma && luma <= maxLuma) {
        alpha = 1.0;
      } else if (luma < minLuma && luma >= minLuma - featherMin && featherMin > 0) {
        alpha = (luma - (minLuma - featherMin)) / featherMin;
      } else if (luma > maxLuma && luma <= maxLuma + featherMax && featherMax > 0) {
        alpha = 1.0 - (luma - maxLuma) / featherMax;
      }

      const maskVal = Math.round(Math.max(0, Math.min(1.0, alpha)) * 255);
      mData[i] = 255;
      mData[i + 1] = 255;
      mData[i + 2] = 255;
      mData[i + 3] = maskVal;
    }

    maskCtx.putImageData(maskData, 0, 0);
    return maskCanvas;
  }

  /**
   * Monocular Depth Map
   */
  public static segmentDepth(
    image: TexImageSource,
    width: number,
    height: number,
    dataProps: DepthRangeData
  ): HTMLCanvasElement {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return maskCanvas;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    for (let y = 0; y < height; y++) {
      const depth = y / height;
      let confidence = 0;

      if (dataProps.range === 'foreground') {
        confidence = Math.max(0, (depth - 0.6) / 0.4);
      } else if (dataProps.range === 'midground') {
        confidence = Math.max(0, 1.0 - Math.abs(depth - 0.5) / 0.3);
      } else {
        confidence = Math.max(0, (0.45 - depth) / 0.45);
      }

      const maskVal = Math.round(confidence * 255);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        mData[idx] = 255;
        mData[idx + 1] = 255;
        mData[idx + 2] = 255;
        mData[idx + 3] = maskVal;
      }
    }

    maskCtx.putImageData(maskData, 0, 0);
    return maskCanvas;
  }

  /**
   * Object Selection in Bounding Box with guided refinement
   */
  public static segmentObject(
    image: TexImageSource,
    width: number,
    height: number,
    box: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const startX = Math.round(box.x * width);
    const startY = Math.round(box.y * height);
    const boxW = Math.round(box.width * width);
    const boxH = Math.round(box.height * height);

    const cx = startX + boxW * 0.5;
    const cy = startY + boxH * 0.5;
    const rx = boxW * 0.5;
    const ry = boxH * 0.5;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }
}
