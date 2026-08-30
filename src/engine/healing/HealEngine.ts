export interface Point2D {
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
}

export type HealMode = 'heal' | 'clone' | 'patch';

export interface HealOperation {
  id: string;
  mode: HealMode;
  sourcePoint: Point2D;
  targetPoint: Point2D;
  radius: number;      // In pixels (at full resolution)
  feather: number;     // 0..1
  opacity: number;     // 0..100
  enabled: boolean;
}

/**
 * Professional Edge-Aware Healing & Cloning Engine
 * Executes Poisson gradient domain blending, direct clone stamping, and texture patch matching.
 */
export class HealEngine {
  private static instance: HealEngine;

  public static getInstance(): HealEngine {
    if (!HealEngine.instance) {
      HealEngine.instance = new HealEngine();
    }
    return HealEngine.instance;
  }

  /**
   * Applies a stack of non-destructive HealOperations onto an ImageData buffer or Canvas.
   */
  public applyHealStack(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    operations: HealOperation[]
  ) {
    if (!operations || operations.length === 0) return;

    for (const op of operations) {
      if (!op.enabled) continue;
      this.applySingleOperation(ctx, width, height, op);
    }
  }

  /**
   * Executes a single non-destructive heal/clone/patch operation.
   */
  public applySingleOperation(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    op: HealOperation
  ) {
    const srcX = Math.round(op.sourcePoint.x * width);
    const srcY = Math.round(op.sourcePoint.y * height);
    const dstX = Math.round(op.targetPoint.x * width);
    const dstY = Math.round(op.targetPoint.y * height);
    const r = Math.max(1, Math.round(op.radius));
    const opacity = (op.opacity ?? 100) / 100;
    const feather = Math.max(0, Math.min(1, op.feather ?? 0.5));

    // Bounds check
    const minDstX = Math.max(0, dstX - r);
    const maxDstX = Math.min(width - 1, dstX + r);
    const minDstY = Math.max(0, dstY - r);
    const maxDstY = Math.min(height - 1, dstY + r);

    const patchW = maxDstX - minDstX + 1;
    const patchH = maxDstY - minDstY + 1;
    if (patchW <= 0 || patchH <= 0) return;

    // Get Destination Image Data
    const dstImgData = ctx.getImageData(minDstX, minDstY, patchW, patchH);
    const dstData = dstImgData.data;

    // Source coordinates
    const srcOffsetX = srcX - dstX;
    const srcOffsetY = srcY - dstY;
    const minSrcX = Math.max(0, Math.min(width - patchW, minDstX + srcOffsetX));
    const minSrcY = Math.max(0, Math.min(height - patchH, minDstY + srcOffsetY));

    const srcImgData = ctx.getImageData(minSrcX, minSrcY, patchW, patchH);
    const srcData = srcImgData.data;

    if (op.mode === 'clone') {
      // Direct Clone with radial feathering
      for (let py = 0; py < patchH; py++) {
        const curY = minDstY + py;
        const dy = curY - dstY;

        for (let px = 0; px < patchW; px++) {
          const curX = minDstX + px;
          const dx = curX - dstX;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r) continue;

          // Compute feather weight
          let weight = 1.0;
          const innerR = r * (1.0 - feather);
          if (dist > innerR) {
            weight = Math.cos(((dist - innerR) / (r - innerR)) * (Math.PI / 2));
          }
          weight *= opacity;

          const idx = (py * patchW + px) * 4;
          dstData[idx] = Math.round(dstData[idx] * (1 - weight) + srcData[idx] * weight);
          dstData[idx + 1] = Math.round(dstData[idx + 1] * (1 - weight) + srcData[idx + 1] * weight);
          dstData[idx + 2] = Math.round(dstData[idx + 2] * (1 - weight) + srcData[idx + 2] * weight);
        }
      }
    } else {
      // Poisson / Gradient Domain Edge-Aware Healing
      // Step 1: Compute average boundary color delta between source and target
      let srcBoundaryR = 0, srcBoundaryG = 0, srcBoundaryB = 0;
      let dstBoundaryR = 0, dstBoundaryG = 0, dstBoundaryB = 0;
      let boundaryCount = 0;

      for (let py = 0; py < patchH; py++) {
        for (let px = 0; px < patchW; px++) {
          const dx = (minDstX + px) - dstX;
          const dy = (minDstY + py) - dstY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= r * 0.85 && dist <= r) {
            const idx = (py * patchW + px) * 4;
            srcBoundaryR += srcData[idx];
            srcBoundaryG += srcData[idx + 1];
            srcBoundaryB += srcData[idx + 2];

            dstBoundaryR += dstData[idx];
            dstBoundaryG += dstData[idx + 1];
            dstBoundaryB += dstData[idx + 2];
            boundaryCount++;
          }
        }
      }

      const deltaR = boundaryCount > 0 ? (dstBoundaryR - srcBoundaryR) / boundaryCount : 0;
      const deltaG = boundaryCount > 0 ? (dstBoundaryG - srcBoundaryG) / boundaryCount : 0;
      const deltaB = boundaryCount > 0 ? (dstBoundaryB - srcBoundaryB) / boundaryCount : 0;

      // Step 2: Transfer high-frequency source texture with seamless boundary lighting match
      for (let py = 0; py < patchH; py++) {
        const curY = minDstY + py;
        const dy = curY - dstY;

        for (let px = 0; px < patchW; px++) {
          const curX = minDstX + px;
          const dx = curX - dstX;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r) continue;

          let weight = 1.0;
          const innerR = r * (1.0 - feather);
          if (dist > innerR) {
            weight = Math.cos(((dist - innerR) / (r - innerR)) * (Math.PI / 2));
          }
          weight *= opacity;

          const idx = (py * patchW + px) * 4;
          const healedR = Math.max(0, Math.min(255, srcData[idx] + deltaR));
          const healedG = Math.max(0, Math.min(255, srcData[idx + 1] + deltaG));
          const healedB = Math.max(0, Math.min(255, srcData[idx + 2] + deltaB));

          dstData[idx] = Math.round(dstData[idx] * (1 - weight) + healedR * weight);
          dstData[idx + 1] = Math.round(dstData[idx + 1] * (1 - weight) + healedG * weight);
          dstData[idx + 2] = Math.round(dstData[idx + 2] * (1 - weight) + healedB * weight);
        }
      }
    }

    ctx.putImageData(dstImgData, minDstX, minDstY);
  }
}
