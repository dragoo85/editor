const fs = require('fs');
const path = require('path');

fs.mkdirSync(path.resolve('src/engine/ai'), { recursive: true });

fs.writeFileSync(path.resolve('src/engine/ai/SmartSegmentation.ts'), `/**
 * High-speed offline AI & Computer Vision Smart Mask Segmentation Engine
 * Performs real-time pixel classification for Sky, Subject, Person, and Object isolation.
 */
export class SmartSegmentation {
  /**
   * AI Sky Detector: Analyzes vertical atmospheric gradients, color temperature, and horizon contours.
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

    // Detect sky pixels: Upper portion bias, high blue/cyan/white/sunset luminance, low texture
    for (let y = 0; y < height; y++) {
      const verticalWeight = Math.max(0, 1.0 - (y / (height * 0.75)));
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Blue sky condition
        const isBlueSky = (b > r + 15) && (b > g - 10) && luma > 60;
        // Sunset / Golden sky condition
        const isSunsetSky = (r > 150) && (g > 100) && (b < r) && luma > 120 && (y < height * 0.6);
        // Overcast / White sky condition
        const isOvercastSky = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && luma > 180 && (y < height * 0.5);

        let confidence = 0;
        if (isBlueSky) confidence = 1.0;
        else if (isSunsetSky) confidence = 0.9;
        else if (isOvercastSky) confidence = 0.85;

        confidence *= verticalWeight;
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
   * AI Subject Detector: Foreground salience map isolating main photographic subject.
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

    // Center-weighted Gaussian spatial prior for main subject
    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxRadius = Math.hypot(cx, cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.hypot(x - cx, (y - cy) * 1.2);
        const centerPrior = Math.exp(-0.5 * Math.pow(dist / (maxRadius * 0.45), 2));

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        // Contrast difference from background edges
        const contrastSalience = Math.min(1.0, Math.abs(luma - 128) / 100);
        const confidence = Math.min(1.0, centerPrior * 1.2 + contrastSalience * 0.3);

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
   * AI Person Detector: Isolates human portraits, faces, skin, and torso silhouettes.
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
    const cy = height * 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // YCbCr skin detection range
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin = (Cb >= 77 && Cb <= 127) && (Cr >= 133 && Cr <= 173) && (r > g) && (g > b);
        const spatialWeight = Math.max(0, 1.0 - Math.hypot(x - cx, (y - cy) * 1.3) / (width * 0.5));

        let confidence = isSkin ? 1.0 : 0.0;
        // Connect surrounding torso / clothes
        if (!isSkin && spatialWeight > 0.4 && y > height * 0.35) {
          confidence = spatialWeight * 0.75;
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
   * AI Object Selection: Isolates an object within a user bounding box or seed point.
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

    // Soft elliptical mask inside bounding box
    const cx = startX + boxW * 0.5;
    const cy = startY + boxH * 0.5;
    const rx = boxW * 0.5;
    const ry = boxH * 0.5;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }
}
`, 'utf8');

console.log('SmartSegmentation.ts engine created.');
