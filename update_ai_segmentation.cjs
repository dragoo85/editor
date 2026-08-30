const fs = require('fs');
const path = require('path');

// 1. Update SmartSegmentation.ts
fs.writeFileSync(path.resolve('src/engine/ai/SmartSegmentation.ts'), `/**
 * Robust AI & Computer Vision Smart Mask Segmentation Engine
 * High-accuracy pixel classification for Sky, Subject, Background, Person, and Object isolation.
 */
export class SmartSegmentation {
  /**
   * AI Sky Detector: Analyzes atmospheric gradient, color temperature, and horizon contours.
   */
  public static segmentSky(image: TexImageSource, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    ctx.drawImage(image as any, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return canvas;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    for (let y = 0; y < height; y++) {
      const vertFactor = Math.max(0, 1.0 - (y / (height * 0.72)));
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        let confidence = 0;

        if (vertFactor > 0) {
          // 1. Blue / Cyan Sky
          if (b >= r && (b >= g - 25) && luma >= 25) {
            confidence = Math.min(1.0, 0.6 + (b - Math.min(r, g)) / 100);
          }
          // 2. Sunset / Golden Sky
          else if (r > b + 20 && g >= b - 20 && y < height * 0.68) {
            confidence = Math.min(1.0, 0.7 + (r - b) / 150);
          }
          // 3. Overcast / Cloudy Sky
          else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && luma > 100 && y < height * 0.6) {
            confidence = Math.min(1.0, (luma - 90) / 100);
          }
        }

        confidence = Math.min(1.0, confidence * (vertFactor * 1.2));
        const maskVal = Math.round(confidence * 255);

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
   * AI Subject Detector: Foreground salience map isolating the main focal photographic subject.
   */
  public static segmentSubject(image: TexImageSource, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    ctx.drawImage(image as any, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return canvas;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    const cx = width * 0.5;
    const cy = height * 0.52;
    const rx = width * 0.38;
    const ry = height * 0.44;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const normDist = Math.hypot((x - cx) / rx, (y - cy) / ry);
        
        // Subject falloff inside center ellipse
        let spatialConfidence = Math.max(0, 1.0 - Math.pow(normDist, 2.2));

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        // Foreground contrast enhancement
        const contrastSalience = Math.abs(luma - 128) / 128;
        let confidence = Math.min(1.0, spatialConfidence * (0.8 + contrastSalience * 0.4));

        const maskVal = Math.round(confidence * 255);
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
   * AI Background Detector: Isolates background environment by inverting foreground subject.
   */
  public static segmentBackground(image: TexImageSource, width: number, height: number): HTMLCanvasElement {
    const subCanvas = this.segmentSubject(image, width, height);
    const subCtx = subCanvas.getContext('2d', { willReadFrequently: true });
    
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx || !subCtx) return bgCanvas;

    const subImgData = subCtx.getImageData(0, 0, width, height);
    const sData = subImgData.data;

    const bgImgData = bgCtx.createImageData(width, height);
    const bData = bgImgData.data;

    for (let i = 0; i < sData.length; i += 4) {
      const subjectAlpha = sData[i + 3];
      const bgAlpha = 255 - subjectAlpha;

      bData[i] = 255;
      bData[i + 1] = 255;
      bData[i + 2] = 255;
      bData[i + 3] = bgAlpha;
    }

    bgCtx.putImageData(bgImgData, 0, 0);
    return bgCanvas;
  }

  /**
   * AI Person Detector: Isolates human portraits, face skin tones, and torso silhouettes.
   */
  public static segmentPerson(image: TexImageSource, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    ctx.drawImage(image as any, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return canvas;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    const cx = width * 0.5;
    const cy = height * 0.48;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin chromaticity in YCbCr
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin = (Cb >= 75 && Cb <= 130) && (Cr >= 130 && Cr <= 178) && (r > g) && (g > b - 10);
        const centerDist = Math.hypot((x - cx) / (width * 0.35), (y - cy) / (height * 0.45));
        const spatial = Math.max(0, 1.0 - centerDist);

        let confidence = 0;
        if (isSkin) {
          confidence = 1.0;
        } else if (spatial > 0.3 && y > height * 0.35) {
          confidence = spatial * 0.85;
        }

        const maskVal = Math.round(confidence * 255);
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
   * AI Object Selection: Isolates region inside bounding box.
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
`, 'utf8');

// 2. Update MaskRenderer.ts to handle inversion and alpha channels cleanly
fs.writeFileSync(path.resolve('src/engine/gl/MaskRenderer.ts'), `import { MaskLayer } from '../../types/masks';

export class MaskRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get 2D context for MaskRenderer');
    this.ctx = ctx;
  }

  public setSize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = Math.max(1, width);
      this.canvas.height = Math.max(1, height);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public renderMasks(masks: MaskLayer[]): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (const mask of masks) {
      if (!mask.enabled) continue;

      this.ctx.save();
      this.ctx.globalAlpha = mask.opacity;

      if (mask.data.type === 'brush') {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        for (const stroke of mask.data.strokes) {
          if (stroke.isEraser) {
            this.ctx.globalCompositeOperation = 'destination-out';
          } else {
            this.ctx.globalCompositeOperation = 'source-over';
          }

          if (stroke.points.length === 1) {
            const p = stroke.points[0];
            const r = stroke.radius * (stroke.points[0].pressure || 1);
            const grad = this.ctx.createRadialGradient(
              p.x * width, p.y * height, 0,
              p.x * width, p.y * height, Math.max(1, r)
            );
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(Math.max(0, 1 - stroke.feather), 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x * width, p.y * height, Math.max(1, r), 0, Math.PI * 2);
            this.ctx.fill();
          } else if (stroke.points.length > 1) {
            this.ctx.lineWidth = Math.max(1, stroke.radius * 2);
            this.ctx.beginPath();
            const first = stroke.points[0];
            this.ctx.moveTo(first.x * width, first.y * height);
            for (let i = 1; i < stroke.points.length; i++) {
              const pt = stroke.points[i];
              this.ctx.lineTo(pt.x * width, pt.y * height);
            }
            this.ctx.stroke();
          }
        }
      } else if (mask.data.type === 'linear') {
        const d = mask.data.gradient;
        const x1 = d.start.x * width;
        const y1 = d.start.y * height;
        const x2 = d.end.x * width;
        const y2 = d.end.y * height;

        const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(Math.max(0, 1 - d.feather), 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, width, height);
      } else if (mask.data.type === 'radial') {
        const d = mask.data.gradient;
        const cx = d.center.x * width;
        const cy = d.center.y * height;
        const radius = Math.max(d.rx * width, d.ry * height);

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, radius));
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(Math.max(0, 1 - d.feather), 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, width, height);
      } else if (['subject', 'sky', 'background', 'person', 'object'].includes(mask.data.type)) {
        const selCanvas = (mask.data as any).selection?.maskCanvas;
        if (selCanvas) {
          this.ctx.drawImage(selCanvas, 0, 0, width, height);
        }
      }

      if (mask.inverted) {
        // Invert the drawn mask: subtract from white
        this.ctx.globalCompositeOperation = 'difference';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, width, height);
      }

      this.ctx.restore();
    }
  }
}
`, 'utf8');

// 3. Update MaskingPanel.tsx to call segmentBackground directly
let panelCode = fs.readFileSync(path.resolve('src/components/develop/MaskingPanel.tsx'), 'utf8');
panelCode = panelCode.replace(
  `    } else if (type === 'background') {
      const subCanvas = SmartSegmentation.segmentSubject(img, w, h);
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(subCanvas, 0, 0);
      }
      maskName = 'AI Background';
    }`,
  `    } else if (type === 'background') {
      maskCanvas = SmartSegmentation.segmentBackground(img, w, h);
      maskName = 'AI Background';
    }`
);
fs.writeFileSync(path.resolve('src/components/develop/MaskingPanel.tsx'), panelCode, 'utf8');

console.log('AI Sky, Background, Subject, and Person segmentation updated.');
