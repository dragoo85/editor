/**
 * PhotoMask AI V2 — Scene Understanding Engine
 * Pre-analyzes scene layout, monocular relative depth, atmospheric scattering, and edge boundaries.
 */

export interface SceneAnalysis {
  width: number;
  height: number;
  relativeDepth: Float32Array;
  skySpectralLikelihood: Float32Array;
  textureEntropy: Float32Array;
  edgeTensor: Float32Array;
  estimatedHorizonY: number;
  sceneType: 'landscape' | 'portrait' | 'urban' | 'indoor' | 'macro';
}

export class SceneAnalyzer {
  public static analyze(imgData: ImageData, width: number, height: number): SceneAnalysis {
    const size = width * height;
    const data = imgData.data;

    const rNorm = new Float32Array(size);
    const gNorm = new Float32Array(size);
    const bNorm = new Float32Array(size);
    const luma = new Float32Array(size);
    const sat = new Float32Array(size);
    const hue = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      const idx = i * 4;
      const r = data[idx] / 255.0;
      const g = data[idx + 1] / 255.0;
      const b = data[idx + 2] / 255.0;

      rNorm[i] = r;
      gNorm[i] = g;
      bNorm[i] = b;
      luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      sat[i] = max > 0.001 ? delta / max : 0;

      if (delta < 0.001) {
        hue[i] = 0;
      } else if (max === r) {
        hue[i] = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        hue[i] = ((b - r) / delta + 2) / 6;
      } else {
        hue[i] = ((r - g) / delta + 4) / 6;
      }
    }

    // 1. Scharr Gradient Edge Tensor
    const edgeTensor = new Float32Array(size);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const i = row + x;
        const gx =
          (3 * luma[i - width + 1] + 10 * luma[i + 1] + 3 * luma[i + width + 1]) -
          (3 * luma[i - width - 1] + 10 * luma[i - 1] + 3 * luma[i + width - 1]);
        const gy =
          (3 * luma[i + width - 1] + 10 * luma[i + width] + 3 * luma[i + width + 1]) -
          (3 * luma[i - width - 1] + 10 * luma[i - width] + 3 * luma[i - width + 1]);
        edgeTensor[i] = Math.hypot(gx, gy) / 32.0;
      }
    }

    // 2. High-Frequency Texture Entropy (3x3 local variance)
    const textureEntropy = new Float32Array(size);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        let sum = 0;
        let sumSq = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const val = luma[(y + dy) * width + (x + dx)];
            sum += val;
            sumSq += val * val;
          }
        }
        const mean = sum / 9.0;
        textureEntropy[i] = Math.sqrt(Math.max(0, sumSq / 9.0 - mean * mean));
      }
    }

    // 3. Monocular Relative Depth Field
    // Atmospheric haze gradient + vertical perspective geometry
    const relativeDepth = new Float32Array(size);
    for (let y = 0; y < height; y++) {
      const yNorm = y / height;
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        // Upper background regions have higher depth (further away); low saturation + high haze increases depth
        const haze = (luma[i] > 0.4 && sat[i] < 0.25) ? (luma[i] - 0.4) * 0.5 : 0;
        relativeDepth[i] = Math.min(1.0, Math.max(0.0, (1.0 - yNorm * 0.7) + haze));
      }
    }

    // 4. Multi-Spectral Atmospheric Scattering Likelihood
    const skySpectralLikelihood = new Float32Array(size);
    let horizonYVotes = 0;
    let horizonYSum = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const r = rNorm[i];
        const g = gNorm[i];
        const b = bNorm[i];
        const hVal = hue[i];
        const sVal = sat[i];
        const lVal = luma[i];
        const tex = textureEntropy[i];

        let p = 0;
        if (hVal >= 0.48 && hVal <= 0.74 && b >= r && b >= g - 0.08 && lVal > 0.15) {
          p = 0.85 + (b - Math.min(r, g)) * 0.4;
        } else if ((hVal <= 0.16 || hVal >= 0.88) && r > b + 0.08 && g >= b - 0.1) {
          p = 0.8 + (r - b) * 0.4;
        } else if (sVal < 0.22 && lVal > 0.45) {
          p = 0.75 + (lVal - 0.45) * 0.45;
        } else if (sVal < 0.18 && lVal > 0.2 && Math.abs(r - g) < 0.08 && Math.abs(g - b) < 0.08) {
          p = 0.6;
        }

        if (tex > 0.06) {
          p *= Math.max(0.0, 1.0 - (tex - 0.06) * 10.0);
        }

        skySpectralLikelihood[i] = Math.max(0.0, Math.min(1.0, p));

        if (p > 0.5) {
          horizonYSum += y;
          horizonYVotes++;
        }
      }
    }

    const estimatedHorizonY = horizonYVotes > 0 ? (horizonYSum / horizonYVotes) / height : 0.5;

    let sceneType: SceneAnalysis['sceneType'] = 'landscape';
    if (horizonYVotes > size * 0.2) {
      sceneType = 'landscape';
    } else if (edgeTensor.filter(e => e > 0.3).length > size * 0.15) {
      sceneType = 'urban';
    } else {
      sceneType = 'portrait';
    }

    return {
      width,
      height,
      relativeDepth,
      skySpectralLikelihood,
      textureEntropy,
      edgeTensor,
      estimatedHorizonY,
      sceneType
    };
  }
}
