import { CurvePoint } from '../../types/adjustments';

/**
 * Steffen Monotone Interpolation Spline
 * Produces smooth, non-oscillating curves that pass precisely through all control points.
 */
export class MonotoneCubicSpline {
  private xs: number[];
  private ys: number[];
  private ms: number[];

  constructor(points: CurvePoint[]) {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const unique: CurvePoint[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i].x !== sorted[i - 1].x) {
        unique.push(sorted[i]);
      }
    }

    if (unique.length <= 1) {
      const val = unique.length === 1 ? unique[0].y : 0;
      this.xs = [0, 255];
      this.ys = [val, val];
      this.ms = [0, 0];
      return;
    }

    const n = unique.length;
    this.xs = unique.map(p => p.x);
    this.ys = unique.map(p => p.y);

    if (n === 2) {
      const slope = (this.ys[1] - this.ys[0]) / (this.xs[1] - this.xs[0]);
      this.ms = [slope, slope];
      return;
    }

    const dxs: number[] = [];
    const dys: number[] = [];
    const slopes: number[] = [];

    for (let i = 0; i < n - 1; i++) {
      const dx = this.xs[i + 1] - this.xs[i];
      const dy = this.ys[i + 1] - this.ys[i];
      dxs.push(dx);
      dys.push(dy);
      slopes.push(dx === 0 ? 0 : dy / dx);
    }

    this.ms = [slopes[0]];
    for (let i = 0; i < slopes.length - 1; i++) {
      const s0 = slopes[i];
      const s1 = slopes[i + 1];
      if (s0 * s1 <= 0) {
        this.ms.push(0);
      } else {
        const dx0 = dxs[i];
        const dx1 = dxs[i + 1];
        const common = dx0 + dx1;
        this.ms.push((3 * common) / ((common + dx1) / s0 + (common + dx0) / s1));
      }
    }
    this.ms.push(slopes[slopes.length - 1]);
  }

  public evaluate(x: number): number {
    const n = this.xs.length;
    if (x <= this.xs[0]) return Math.max(0, Math.min(255, this.ys[0]));
    if (x >= this.xs[n - 1]) return Math.max(0, Math.min(255, this.ys[n - 1]));

    let i = 0;
    while (i < n - 2 && x > this.xs[i + 1]) {
      i++;
    }

    const h = this.xs[i + 1] - this.xs[i];
    if (h === 0) return this.ys[i];

    const t = (x - this.xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const y = h00 * this.ys[i] + h10 * h * this.ms[i] + h01 * this.ys[i + 1] + h11 * h * this.ms[i + 1];
    return Math.max(0, Math.min(255, y));
  }

  public generateLUT(): Uint8Array {
    const lut = new Uint8Array(256);
    for (let x = 0; x < 256; x++) {
      lut[x] = Math.round(this.evaluate(x));
    }
    return lut;
  }
}
