const fs = require('fs');
const path = require('path');
const full = path.resolve('src/engine/gl/MaskRenderer.ts');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import { MaskLayer } from '../../types/masks';

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
      }

      this.ctx.restore();
    }
  }
}
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved MaskRenderer.ts');
