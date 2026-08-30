const fs = require('fs');
const path = require('path');

// 1. Update masks.ts with Portrait Parts and Depth Mask types
fs.writeFileSync(path.resolve('src/types/masks.ts'), `import { ToneAdjustments } from './adjustments';

export type MaskType = 
  | 'brush' 
  | 'linear' 
  | 'radial' 
  | 'subject' 
  | 'sky' 
  | 'background' 
  | 'person' 
  | 'facial_skin'
  | 'body_skin'
  | 'eyes'
  | 'lips'
  | 'hair'
  | 'clothes'
  | 'depth'
  | 'object' 
  | 'color_range' 
  | 'luma_range';

export interface Point2D {
  x: number;
  y: number;
}

export interface BrushStroke {
  points: { x: number; y: number; pressure?: number }[];
  radius: number;
  feather: number;
  isEraser: boolean;
  autoMask?: boolean;
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
  angle: number;
  feather: number;
}

export interface ColorRangeMaskData {
  targetColor: { r: number; g: number; b: number };
  tolerance: number;
  smoothness: number;
}

export interface LumaRangeMaskData {
  minLuma: number;
  maxLuma: number;
  featherMin: number;
  featherMax: number;
}

export interface DepthMaskData {
  depthRange: 'foreground' | 'midground' | 'background';
  near: number;
  far: number;
  feather: number;
}

export interface SmartSelectionData {
  targetCategory?: MaskType;
  box?: { x: number; y: number; width: number; height: number };
  seedPoint?: Point2D;
  maskCanvas?: HTMLCanvasElement;
}

export interface MaskAdjustments {
  exposure: number;
  temperature: number;
  tint: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  clarity: number;
  dehaze: number;
  sharpness: number;
  saturation: number;
}

export const DEFAULT_MASK_ADJUSTMENTS: MaskAdjustments = {
  exposure: 0.0,
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
  | { type: 'facial_skin'; selection: SmartSelectionData }
  | { type: 'body_skin'; selection: SmartSelectionData }
  | { type: 'eyes'; selection: SmartSelectionData }
  | { type: 'lips'; selection: SmartSelectionData }
  | { type: 'hair'; selection: SmartSelectionData }
  | { type: 'clothes'; selection: SmartSelectionData }
  | { type: 'depth'; depth: DepthMaskData; selection: SmartSelectionData }
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

console.log('src/types/masks.ts updated with full AI Portrait Suite and Depth Masking types.');
