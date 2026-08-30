const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/engine/gl/MaskRenderer.ts'), `import { MaskGroup, MaskComponent, MaskOverlayConfig } from '../../types/masks';
import { SmartSegmentation } from '../ai/SmartSegmentation';

/**
 * High-Precision Mask Compositing Engine
 * Rasterizes hierarchical components with Boolean ADD / SUBTRACT / INTERSECT operations,
 * guided feathering, density scaling, and real-time multi-mode overlay generation.
 */
export class MaskRenderer {
  private width: number;
  private height: number;
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private compCanvas: HTMLCanvasElement;
  private compCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);

    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.width = this.width;
    this.mainCanvas.height = this.height;
    this.mainCtx = this.mainCanvas.getContext('2d', { willReadFrequently: true })!;

    this.compCanvas = document.createElement('canvas');
    this.compCanvas.width = this.width;
    this.compCanvas.height = this.height;
    this.compCtx = this.compCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public setSize(width: number, height: number) {
    if (this.width !== width || this.height !== height) {
      this.width = Math.max(1, width);
      this.height = Math.max(1, height);
      this.mainCanvas.width = this.width;
      this.mainCanvas.height = this.height;
      this.compCanvas.width = this.width;
      this.compCanvas.height = this.height;
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.mainCanvas;
  }

  /**
   * Rasterizes a single component into a Float32Array alpha field (0..1)
   */
  private rasterizeComponent(comp: MaskComponent, imageSource?: TexImageSource): Float32Array {
    const { width, height } = this;
    const alphaField = new Float32Array(width * height);
    this.compCtx.clearRect(0, 0, width, height);

    if (comp.type === 'brush' && comp.strokes) {
      this.compCtx.fillStyle = '#000000';
      this.compCtx.fillRect(0, 0, width, height);

      for (const stroke of comp.strokes) {
        if (stroke.isEraser) {
          this.compCtx.globalCompositeOperation = 'destination-out';
        } else {
          this.compCtx.globalCompositeOperation = 'source-over';
        }

        if (stroke.points.length === 1) {
          const p = stroke.points[0];
          const r = stroke.radius * (stroke.points[0].pressure || 1);
          const grad = this.compCtx.createRadialGradient(
            p.x * width, p.y * height, 0,
            p.x * width, p.y * height, Math.max(1, r)
          );
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(Math.max(0, 1 - stroke.feather), 'rgba(255, 255, 255, 1)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          this.compCtx.fillStyle = grad;
          this.compCtx.beginPath();
          this.compCtx.arc(p.x * width, p.y * height, Math.max(1, r), 0, Math.PI * 2);
          this.compCtx.fill();
        } else if (stroke.points.length > 1) {
          this.compCtx.strokeStyle = '#ffffff';
          this.compCtx.lineCap = 'round';
          this.compCtx.lineJoin = 'round';
          this.compCtx.lineWidth = Math.max(1, stroke.radius * 2);
          this.compCtx.beginPath();
          this.compCtx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
          for (let i = 1; i < stroke.points.length; i++) {
            this.compCtx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
          }
          this.compCtx.stroke();
        }
      }
      this.compCtx.globalCompositeOperation = 'source-over';
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = imgData[i * 4] / 255;
      }
    } else if (comp.type === 'linear_gradient' && comp.linearGradient) {
      const g = comp.linearGradient;
      const x1 = g.start.x * width;
      const y1 = g.start.y * height;
      const x2 = g.end.x * width;
      const y2 = g.end.y * height;

      const grad = this.compCtx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(Math.max(0, 1 - (g.feather || 0.5)), 'rgba(255, 255, 255, 0.5)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.compCtx.fillStyle = grad;
      this.compCtx.fillRect(0, 0, width, height);

      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255) * (imgData[i * 4] / 255);
      }
    } else if (comp.type === 'radial_gradient' && comp.radialGradient) {
      const g = comp.radialGradient;
      const cx = g.center.x * width;
      const cy = g.center.y * height;
      const rx = Math.max(1, g.rx * width);
      const ry = Math.max(1, g.ry * height);

      this.compCtx.save();
      this.compCtx.translate(cx, cy);
      this.compCtx.rotate((g.angle || 0) * (Math.PI / 180));
      this.compCtx.scale(1, ry / rx);

      const grad = this.compCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(Math.max(0, 1 - (g.feather || 0.5)), 'rgba(255, 255, 255, 0.5)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.compCtx.fillStyle = grad;
      this.compCtx.beginPath();
      this.compCtx.arc(0, 0, rx, 0, Math.PI * 2);
      this.compCtx.fill();
      this.compCtx.restore();

      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255) * (imgData[i * 4] / 255);
      }
    } else if (comp.aiSelection?.maskCanvas) {
      this.compCtx.drawImage(comp.aiSelection.maskCanvas, 0, 0, width, height);
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255) * (imgData[i * 4] / 255);
      }
    } else if (comp.objectSelection?.maskCanvas) {
      this.compCtx.drawImage(comp.objectSelection.maskCanvas, 0, 0, width, height);
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255) * (imgData[i * 4] / 255);
      }
    } else if (comp.type === 'color_range' && comp.colorRange && imageSource) {
      const cCanvas = SmartSegmentation.segmentColorRange(imageSource, width, height, comp.colorRange);
      this.compCtx.drawImage(cCanvas, 0, 0, width, height);
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255);
      }
    } else if (comp.type === 'luma_range' && comp.lumaRange && imageSource) {
      const lCanvas = SmartSegmentation.segmentLumaRange(imageSource, width, height, comp.lumaRange);
      this.compCtx.drawImage(lCanvas, 0, 0, width, height);
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255);
      }
    } else if (comp.type === 'depth' && comp.depthRange && imageSource) {
      const dCanvas = SmartSegmentation.segmentDepth(imageSource, width, height, comp.depthRange);
      this.compCtx.drawImage(dCanvas, 0, 0, width, height);
      const imgData = this.compCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = (imgData[i * 4 + 3] / 255);
      }
    }

    // Invert component if requested
    if (comp.inverted) {
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] = 1.0 - alphaField[i];
      }
    }

    // Apply component density
    const density = (comp.density ?? 100) / 100;
    if (density < 1.0) {
      for (let i = 0; i < alphaField.length; i++) {
        alphaField[i] *= density;
      }
    }

    return alphaField;
  }

  /**
   * Composite an entire MaskGroup tree using ADD, SUBTRACT, and INTERSECT Boolean rules.
   */
  public compositeMaskGroup(group: MaskGroup, imageSource?: TexImageSource): Float32Array {
    const totalPixels = this.width * this.height;
    const groupAlpha = new Float32Array(totalPixels);

    if (!group.enabled || group.components.length === 0) {
      return groupAlpha;
    }

    let isFirst = true;

    for (const comp of group.components) {
      if (!comp.enabled) continue;

      const compAlpha = this.rasterizeComponent(comp, imageSource);

      if (isFirst) {
        // Initial component establishes the baseline mask
        for (let i = 0; i < totalPixels; i++) {
          groupAlpha[i] = compAlpha[i];
        }
        isFirst = false;
      } else {
        const mode = comp.combineMode || 'add';
        for (let i = 0; i < totalPixels; i++) {
          const c = compAlpha[i];
          if (mode === 'add') {
            groupAlpha[i] = Math.min(1.0, groupAlpha[i] + c);
          } else if (mode === 'subtract') {
            groupAlpha[i] = Math.max(0.0, groupAlpha[i] - c);
          } else if (mode === 'intersect') {
            groupAlpha[i] = groupAlpha[i] * c;
          }
        }
      }
    }

    // Group Inversion
    if (group.inverted) {
      for (let i = 0; i < totalPixels; i++) {
        groupAlpha[i] = 1.0 - groupAlpha[i];
      }
    }

    // Group Opacity
    const opacity = (group.opacity ?? 100) / 100;
    if (opacity < 1.0) {
      for (let i = 0; i < totalPixels; i++) {
        groupAlpha[i] *= opacity;
      }
    }

    return groupAlpha;
  }

  /**
   * Renders the active mask group to the mainCanvas texture surface.
   */
  public renderActiveMask(activeGroup: MaskGroup | null, imageSource?: TexImageSource): void {
    const { width, height } = this;
    const mainImgData = this.mainCtx.createImageData(width, height);
    const mData = mainImgData.data;

    if (!activeGroup || !activeGroup.enabled || activeGroup.components.length === 0) {
      // Clear with pure transparent black [0, 0, 0, 0]
      this.mainCtx.clearRect(0, 0, width, height);
      return;
    }

    const groupAlpha = this.compositeMaskGroup(activeGroup, imageSource);

    for (let i = 0; i < groupAlpha.length; i++) {
      const val = Math.round(groupAlpha[i] * 255);
      const idx = i * 4;
      mData[idx] = val;     // Red channel holds mask alpha for shader
      mData[idx + 1] = val; // Green
      mData[idx + 2] = val; // Blue
      mData[idx + 3] = val; // Alpha
    }

    this.mainCtx.putImageData(mainImgData, 0, 0);
  }
}
`, 'utf8');

console.log('MaskRenderer.ts Boolean Compositing Engine implemented.');
