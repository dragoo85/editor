import { DevelopState } from '../../types/adjustments';
import { MaskGroup } from '../../types/masks';
import { MaskRenderer } from '../gl/MaskRenderer';

export class CpuPipeline {
  /**
   * Applies global adjustments + sequential masked adjustments entirely on CPU.
   * Produces pixel-accurate identical mathematics to the GPU shader pipeline.
   */
  public static process(
    sourceImgData: ImageData,
    state: DevelopState,
    maskRenderer: MaskRenderer
  ): ImageData {
    const width = sourceImgData.width;
    const height = sourceImgData.height;
    const size = width * height;
    const src = sourceImgData.data;

    // Create working 32-bit floating point color buffer [0..1]
    const rBuf = new Float32Array(size);
    const gBuf = new Float32Array(size);
    const bBuf = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      const idx = i * 4;
      rBuf[i] = src[idx] / 255.0;
      gBuf[i] = src[idx + 1] / 255.0;
      bBuf[i] = src[idx + 2] / 255.0;
    }

    // 1. Global Exposure & Contrast
    const tone = state.tone;
    const expMult = Math.pow(2.0, tone.exposure);
    const contrastMult = (tone.contrast / 100.0) + 1.0;

    for (let i = 0; i < size; i++) {
      let r = rBuf[i] * expMult;
      let g = gBuf[i] * expMult;
      let b = bBuf[i] * expMult;

      if (Math.abs(tone.contrast) > 0.01) {
        r = (r - 0.5) * contrastMult + 0.5;
        g = (g - 0.5) * contrastMult + 0.5;
        b = (b - 0.5) * contrastMult + 0.5;
      }

      rBuf[i] = Math.max(0.0, Math.min(1.0, r));
      gBuf[i] = Math.max(0.0, Math.min(1.0, g));
      bBuf[i] = Math.max(0.0, Math.min(1.0, b));
    }

    // 2. Sequential Masked Adjustments
    const enabledMasks = (state.masks || []).filter(m => m.enabled && m.components.length > 0);

    for (const maskGroup of enabledMasks) {
      const ma = maskGroup.adjustments;
      if (!ma) continue;

      const alphaField = maskRenderer.compositeMaskGroup(maskGroup);
      const maskExpMult = Math.pow(2.0, ma.exposure);
      const maskContMult = (ma.contrast / 100.0) + 1.0;

      for (let i = 0; i < size; i++) {
        const a = alphaField[i];
        if (a <= 0.0001) continue;

        let r = rBuf[i];
        let g = gBuf[i];
        let b = bBuf[i];

        // Exposure
        if (Math.abs(ma.exposure) > 0.001) {
          const adjR = r * maskExpMult;
          const adjG = g * maskExpMult;
          const adjB = b * maskExpMult;
          r = r * (1.0 - a) + adjR * a;
          g = g * (1.0 - a) + adjG * a;
          b = b * (1.0 - a) + adjB * a;
        }

        // Contrast
        if (Math.abs(ma.contrast) > 0.001) {
          const adjR = (r - 0.5) * maskContMult + 0.5;
          const adjG = (g - 0.5) * maskContMult + 0.5;
          const adjB = (b - 0.5) * maskContMult + 0.5;
          r = r * (1.0 - a) + adjR * a;
          g = g * (1.0 - a) + adjG * a;
          b = b * (1.0 - a) + adjB * a;
        }

        // Temperature & Tint
        if (Math.abs(ma.temperature) > 0.001 || Math.abs(ma.tint) > 0.001) {
          const adjR = r + ma.temperature * 0.003 + ma.tint * 0.0015;
          const adjB = b - ma.temperature * 0.003;
          const adjG = g - ma.tint * 0.003;
          r = r * (1.0 - a) + adjR * a;
          g = g * (1.0 - a) + adjG * a;
          b = b * (1.0 - a) + adjB * a;
        }

        // Saturation
        if (Math.abs(ma.saturation) > 0.001) {
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const satMult = 1.0 + ma.saturation * 0.01;
          const adjR = luma + (r - luma) * satMult;
          const adjG = luma + (g - luma) * satMult;
          const adjB = luma + (b - luma) * satMult;
          r = r * (1.0 - a) + adjR * a;
          g = g * (1.0 - a) + adjG * a;
          b = b * (1.0 - a) + adjB * a;
        }

        rBuf[i] = Math.max(0.0, Math.min(1.0, r));
        gBuf[i] = Math.max(0.0, Math.min(1.0, g));
        bBuf[i] = Math.max(0.0, Math.min(1.0, b));
      }
    }

    // Write back to output ImageData
    const outImgData = new ImageData(width, height);
    const out = outImgData.data;

    for (let i = 0; i < size; i++) {
      const idx = i * 4;
      out[idx] = Math.round(rBuf[i] * 255);
      out[idx + 1] = Math.round(gBuf[i] * 255);
      out[idx + 2] = Math.round(bBuf[i] * 255);
      out[idx + 3] = 255;
    }

    return outImgData;
  }
}
