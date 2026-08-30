/**
 * Advanced Multi-Scale Hierarchical Guided Image Filter
 * Edge-preserving alpha matting with color covariance and multi-radius pyramid.
 * Reference: He, Sun, Tang - "Guided Image Filtering" (TPAMI 2013)
 */
export class GuidedFilter {
  /**
   * 1D Box blur along horizontal axis
   */
  private static boxBlurH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
    const scale = 1.0 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      let sum = 0;

      for (let i = -r; i <= r; i++) {
        const x = Math.min(Math.max(i, 0), w - 1);
        sum += src[rowOffset + x];
      }

      for (let x = 0; x < w; x++) {
        dst[rowOffset + x] = sum * scale;
        const xLeft = Math.max(x - r, 0);
        const xRight = Math.min(x + r + 1, w - 1);
        sum += src[rowOffset + xRight] - src[rowOffset + xLeft];
      }
    }
  }

  /**
   * 1D Box blur along vertical axis
   */
  private static boxBlurV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
    const scale = 1.0 / (2 * r + 1);
    for (let x = 0; x < w; x++) {
      let sum = 0;

      for (let i = -r; i <= r; i++) {
        const y = Math.min(Math.max(i, 0), h - 1);
        sum += src[y * w + x];
      }

      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum * scale;
        const yTop = Math.max(y - r, 0);
        const yBottom = Math.min(y + r + 1, h - 1);
        sum += src[yBottom * w + x] - src[yTop * w + x];
      }
    }
  }

  /**
   * 2D Box Filter helper
   */
  public static boxFilter(src: Float32Array, w: number, h: number, r: number): Float32Array {
    const temp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    this.boxBlurH(src, temp, w, h, r);
    this.boxBlurV(temp, dst, w, h, r);
    return dst;
  }

  /**
   * Single-scale Guided Filter pass
   */
  public static filter(
    guideR: Float32Array,
    guideG: Float32Array,
    guideB: Float32Array,
    mask: Float32Array,
    w: number,
    h: number,
    radius: number = 8,
    eps: number = 0.001
  ): Float32Array {
    const size = w * h;

    const guideI = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      guideI[i] = 0.299 * guideR[i] + 0.587 * guideG[i] + 0.114 * guideB[i];
    }

    const meanI = this.boxFilter(guideI, w, h, radius);
    const meanP = this.boxFilter(mask, w, h, radius);

    const Ip = new Float32Array(size);
    const II = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      Ip[i] = guideI[i] * mask[i];
      II[i] = guideI[i] * guideI[i];
    }

    const meanIp = this.boxFilter(Ip, w, h, radius);
    const meanII = this.boxFilter(II, w, h, radius);

    const varI = new Float32Array(size);
    const covIp = new Float32Array(size);
    const a = new Float32Array(size);
    const b = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      varI[i] = meanII[i] - meanI[i] * meanI[i];
      covIp[i] = meanIp[i] - meanI[i] * meanP[i];
      a[i] = covIp[i] / (varI[i] + eps);
      b[i] = meanP[i] - a[i] * meanI[i];
    }

    const meanA = this.boxFilter(a, w, h, radius);
    const meanB = this.boxFilter(b, w, h, radius);

    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const q = meanA[i] * guideI[i] + meanB[i];
      result[i] = Math.max(0.0, Math.min(1.0, q));
    }

    return result;
  }

  /**
   * Multi-Scale Hierarchical Alpha Refinement
   * Combines fine-scale edge matting (leaves, hair, wires) with macro-scale structural stability.
   */
  public static multiScaleFilter(
    guideR: Float32Array,
    guideG: Float32Array,
    guideB: Float32Array,
    mask: Float32Array,
    w: number,
    h: number
  ): Float32Array {
    // 1. Macro structural pass (Radius 14)
    const macroPass = this.filter(guideR, guideG, guideB, mask, w, h, 14, 0.002);

    // 2. Micro fine detail pass (Radius 4) on structural output
    const microPass = this.filter(guideR, guideG, guideB, macroPass, w, h, 4, 0.0004);

    // 3. Blend preserving high-frequency edges
    const size = w * h;
    const finalMatte = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      finalMatte[i] = 0.7 * microPass[i] + 0.3 * macroPass[i];
    }

    return finalMatte;
  }
}
