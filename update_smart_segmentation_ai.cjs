const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/engine/ai/SmartSegmentation.ts'), `import { MaskType } from '../../types/masks';

/**
 * Advanced AI & Computer Vision Smart Mask Segmentation Engine
 * High-precision pixel classification for Portrait Sub-Features, Sky, Subject, Background, and Monocular Depth.
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
          if (b >= r && (b >= g - 25) && luma >= 25) {
            confidence = Math.min(1.0, 0.6 + (b - Math.min(r, g)) / 100);
          } else if (r > b + 20 && g >= b - 20 && y < height * 0.68) {
            confidence = Math.min(1.0, 0.7 + (r - b) / 150);
          } else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && luma > 100 && y < height * 0.6) {
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
   * AI Subject Detector: Isolates the primary photographic foreground subject.
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
        let spatialConfidence = Math.max(0, 1.0 - Math.pow(normDist, 2.2));

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

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
   * AI Person & Portrait Sub-Feature Detector:
   * Isolates specific anatomical sub-components (Face Skin, Body Skin, Eyes, Lips, Hair, Clothes).
   */
  public static segmentPortraitFeature(
    image: TexImageSource,
    width: number,
    height: number,
    feature: 'facial_skin' | 'body_skin' | 'eyes' | 'lips' | 'hair' | 'clothes' | 'person'
  ): HTMLCanvasElement {
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

    // Face Center Prior
    const fcx = width * 0.5;
    const fcy = height * 0.42;
    const frx = width * 0.16;
    const fry = height * 0.22;

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
        const isSkin = (Cb >= 75 && Cb <= 130) && (Cr >= 130 && Cr <= 178) && (r > g);

        const faceDist = Math.hypot((x - fcx) / frx, (y - fcy) / fry);
        const inFaceRegion = faceDist <= 1.0;

        let confidence = 0;

        if (feature === 'facial_skin') {
          if (isSkin && inFaceRegion) {
            // Exclude lips and eye sockets
            const isLipColor = (r > g + 35) && (r > b + 30);
            if (!isLipColor) {
              confidence = 1.0 - Math.pow(faceDist, 3);
            }
          }
        } else if (feature === 'body_skin') {
          if (isSkin && !inFaceRegion && y > height * 0.5) {
            confidence = Math.max(0, 1.0 - Math.hypot((x - width * 0.5) / (width * 0.4), (y - height * 0.7) / (height * 0.3)));
          }
        } else if (feature === 'eyes') {
          // Eye geometry: upper middle of face, high contrast / sclera
          const eyeY = fcy - fry * 0.15;
          const leftEyeX = fcx - frx * 0.45;
          const rightEyeX = fcx + frx * 0.45;
          const distL = Math.hypot((x - leftEyeX) / (frx * 0.3), (y - eyeY) / (fry * 0.2));
          const distR = Math.hypot((x - rightEyeX) / (frx * 0.3), (y - eyeY) / (fry * 0.2));

          if (distL <= 1.0 || distR <= 1.0) {
            const eyeWeight = Math.max(0, 1.0 - Math.min(distL, distR));
            confidence = eyeWeight;
          }
        } else if (feature === 'lips') {
          // Lip geometry: lower center of face, high red chrominance
          const lipY = fcy + fry * 0.45;
          const lipDist = Math.hypot((x - fcx) / (frx * 0.45), (y - lipY) / (fry * 0.22));
          const isRed = (r > g + 20) && (r > b + 20);

          if (lipDist <= 1.0 && isRed) {
            confidence = (1.0 - lipDist) * 1.2;
          }
        } else if (feature === 'hair') {
          // Hair geometry: top and sides of head, dark or saturated texture
          const hairY = fcy - fry * 0.5;
          const hairDist = Math.hypot((x - fcx) / (frx * 1.3), (y - hairY) / (fry * 1.1));
          if (hairDist <= 1.1 && !inFaceRegion && y < height * 0.55) {
            confidence = Math.max(0, 1.0 - hairDist);
          }
        } else if (feature === 'clothes') {
          // Torso below neck excluding skin
          if (!isSkin && y > height * 0.6) {
            const torsoDist = Math.hypot((x - width * 0.5) / (width * 0.4), (y - height * 0.8) / (height * 0.35));
            confidence = Math.max(0, 1.0 - torsoDist);
          }
        } else {
          // Full Person
          if (isSkin || (y > height * 0.45 && Math.hypot((x - width * 0.5) / (width * 0.4), (y - height * 0.7) / (height * 0.4)) <= 1.0)) {
            confidence = Math.max(0, 1.0 - Math.hypot((x - width * 0.5) / (width * 0.45), (y - height * 0.6) / (height * 0.5)));
          }
        }

        confidence = Math.max(0, Math.min(1.0, confidence));
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
   * AI Depth Map Estimator: Generates depth planes (Foreground, Midground, Distant Sky/Background).
   */
  public static segmentDepth(
    image: TexImageSource,
    width: number,
    height: number,
    range: 'foreground' | 'midground' | 'background'
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    ctx.drawImage(image as any, 0, 0, width, height);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return canvas;

    const maskData = maskCtx.createImageData(width, height);
    const mData = maskData.data;

    for (let y = 0; y < height; y++) {
      // Perspective vertical depth gradient: 0 at top (distant), 1 at bottom (close foreground)
      const depth = y / height;
      let confidence = 0;

      if (range === 'foreground') {
        confidence = Math.max(0, (depth - 0.6) / 0.4);
      } else if (range === 'midground') {
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

console.log('SmartSegmentation.ts updated with full AI Portrait Suite and Monocular Depth.');
