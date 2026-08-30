import { GuidedFilter } from './GuidedFilter';
import { SegmentationResult } from './SkySegmentation';

export class PortraitSegmentation {
  public static segment(
    imgData: ImageData,
    width: number,
    height: number,
    feature: 'person' | 'facial_skin' | 'body_skin' | 'eyes' | 'lips' | 'hair' | 'clothes'
  ): SegmentationResult {
    const size = width * height;
    const data = imgData.data;

    const rNorm = new Float32Array(size);
    const gNorm = new Float32Array(size);
    const bNorm = new Float32Array(size);
    const luma = new Float32Array(size);
    const isSkinArr = new Uint8Array(size);

    let skinCount = 0;
    let skinSumX = 0;
    let skinSumY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        rNorm[i] = r / 255.0;
        gNorm[i] = g / 255.0;
        bNorm[i] = b / 255.0;
        luma[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

        // YCbCr skin detection
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          Cb >= 75 &&
          Cb <= 135 &&
          Cr >= 128 &&
          Cr <= 180 &&
          r > g &&
          g > b * 0.7 &&
          r - g >= 10;

        if (isSkin) {
          isSkinArr[i] = 1;
          skinCount++;
          skinSumX += x;
          skinSumY += y;
        }
      }
    }

    // Determine primary face center from skin centroid
    const faceCenterX = skinCount > 0 ? skinSumX / skinCount : width * 0.5;
    const faceCenterY = skinCount > 0 ? Math.min(height * 0.45, skinSumY / skinCount) : height * 0.4;
    const faceRadius = Math.max(width * 0.12, Math.sqrt(skinCount) * 0.4);

    const rawProb = new Float32Array(size);
    let matchedPixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const r = rNorm[i];
        const g = gNorm[i];
        const b = bNorm[i];
        const l = luma[i];
        const isSkin = isSkinArr[i] === 1;

        const distToFace = Math.hypot(x - faceCenterX, y - faceCenterY);
        const inFaceZone = distToFace <= faceRadius;

        let p = 0;

        if (feature === 'facial_skin') {
          if (isSkin && inFaceZone) {
            const isLip = r > g * 1.35 && r > b * 1.35;
            if (!isLip) {
              p = 1.0 - (distToFace / faceRadius) * 0.3;
            }
          }
        } else if (feature === 'body_skin') {
          if (isSkin && !inFaceZone && y > faceCenterY) {
            p = 0.9;
          }
        } else if (feature === 'lips') {
          if (inFaceZone && y > faceCenterY) {
            const redRatio = r / (Math.max(0.01, g + b));
            if (redRatio > 0.72) {
              p = Math.min(1.0, (redRatio - 0.72) * 4.0);
            }
          }
        } else if (feature === 'eyes') {
          if (inFaceZone && y < faceCenterY + faceRadius * 0.15 && y > faceCenterY - faceRadius * 0.6) {
            // Dark pupil/iris with contrast
            if (l < 0.28 && !isSkin) {
              p = 1.0 - l / 0.28;
            }
          }
        } else if (feature === 'hair') {
          if (y < faceCenterY + faceRadius * 0.8 && distToFace <= faceRadius * 1.6 && !isSkin) {
            // Hair is typically darker or textured region around head
            if (l < 0.45) {
              p = Math.min(1.0, (0.45 - l) * 2.5);
            }
          }
        } else if (feature === 'clothes') {
          if (!isSkin && y > faceCenterY + faceRadius * 0.5) {
            const torsoDist = Math.hypot(x - faceCenterX, (y - (faceCenterY + faceRadius * 1.5)) * 0.7);
            if (torsoDist < width * 0.4) {
              p = Math.max(0, 1.0 - torsoDist / (width * 0.4));
            }
          }
        } else {
          // Entire Person
          if (isSkin || (y < faceCenterY + faceRadius * 0.8 && distToFace <= faceRadius * 1.5)) {
            p = 0.95;
          } else if (y > faceCenterY + faceRadius * 0.5) {
            const torsoDist = Math.hypot(x - faceCenterX, (y - (faceCenterY + faceRadius * 1.5)) * 0.7);
            if (torsoDist < width * 0.42) {
              p = Math.max(0, 1.0 - torsoDist / (width * 0.42));
            }
          }
        }

        rawProb[i] = Math.max(0.0, Math.min(1.0, p));
        if (rawProb[i] > 0.4) matchedPixels++;
      }
    }

    // Guided filter edge refinement
    const refined = GuidedFilter.filter(
      rNorm,
      gNorm,
      bNorm,
      rawProb,
      width,
      height,
      6,
      0.001
    );

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const ctx = maskCanvas.getContext('2d');

    if (ctx) {
      const outImg = ctx.createImageData(width, height);
      const outData = outImg.data;
      for (let i = 0; i < size; i++) {
        const val = Math.round(refined[i] * 255);
        const idx = i * 4;
        outData[idx] = 255;
        outData[idx + 1] = 255;
        outData[idx + 2] = 255;
        outData[idx + 3] = val;
      }
      ctx.putImageData(outImg, 0, 0);
    }

    const confidence = matchedPixels > 50 ? 0.91 : 0.68;

    return { maskCanvas, confidence };
  }
}
