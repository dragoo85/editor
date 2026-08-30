const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/types/masks.ts'), `import { ToneAdjustments } from './adjustments';

export type MaskType = 
  | 'brush' 
  | 'linear' 
  | 'radial' 
  | 'subject' 
  | 'sky' 
  | 'background' 
  | 'person' 
  | 'object' 
  | 'color_range' 
  | 'luma_range';

export interface Point2D {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export interface BrushStroke {
  points: { x: number; y: number; pressure?: number }[];
  radius: number;
  feather: number;
  isEraser: boolean;
}

export interface LinearGradientMaskData {
  start: Point2D;
  end: Point2D;
  feather: number;
}

export interface RadialGradientMaskData {
  center: Point2D;
  rx: number;
  ry: number;
  angle: number; // in degrees
  feather: number;
}

export interface ColorRangeMaskData {
  targetColor: { r: number; g: number; b: number };
  tolerance: number;
  smoothness: number;
}

export interface LumaRangeMaskData {
  minLuma: number; // 0 to 1
  maxLuma: number; // 0 to 1
  featherMin: number;
  featherMax: number;
}

export interface SmartSelectionData {
  box?: { x: number; y: number; width: number; height: number };
  seedPoint?: Point2D;
  maskCanvas?: HTMLCanvasElement;
}

export interface MaskAdjustments {
  exposure: number;      // -5.0 to +5.0 EV
  temperature: number;   // -100 to +100
  tint: number;          // -100 to +100
  contrast: number;      // -100 to +100
  highlights: number;    // -100 to +100
  shadows: number;       // -100 to +100
  whites: number;        // -100 to +100
  blacks: number;        // -100 to +100
  clarity: number;       // -100 to +100
  dehaze: number;        // -100 to +100
  sharpness: number;     // -100 to +100
  saturation: number;    // -100 to +100
}

export const DEFAULT_MASK_ADJUSTMENTS: MaskAdjustments = {
  exposure: 0.5,
  temperature: 0,
  tint: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  clarity: 0,
  dehaze: 0,
  sharpness: 0,
  saturation: 0
};

export type MaskData = 
  | { type: 'brush'; strokes: BrushStroke[] }
  | { type: 'linear'; gradient: LinearGradientMaskData }
  | { type: 'radial'; gradient: RadialGradientMaskData }
  | { type: 'subject'; selection: SmartSelectionData }
  | { type: 'sky'; selection: SmartSelectionData }
  | { type: 'background'; selection: SmartSelectionData }
  | { type: 'person'; selection: SmartSelectionData }
  | { type: 'object'; selection: SmartSelectionData }
  | { type: 'color_range'; range: ColorRangeMaskData }
  | { type: 'luma_range'; range: LumaRangeMaskData };

export interface MaskLayer {
  id: string;
  name: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  opacity: number;
  data: MaskData;
  adjustments: MaskAdjustments;
}

export interface HealingPin {
  id: string;
  type: 'heal' | 'clone';
  target: Point2D;
  source: Point2D;
  radius: number;
  feather: number;
  opacity: number;
}
`, 'utf8');

console.log('src/types/masks.ts updated with full AI and gradient types.');
