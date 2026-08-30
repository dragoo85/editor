export type MaskComponentType = 
  | 'brush' 
  | 'linear_gradient' 
  | 'radial_gradient' 
  | 'color_range' 
  | 'luma_range' 
  | 'depth'
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
  | 'object';

export type CombineMode = 'add' | 'subtract' | 'intersect';

export interface Point2D {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export interface BrushStroke {
  points: { x: number; y: number; pressure?: number }[];
  radius: number;
  feather: number;
  isEraser: boolean;
  autoMask?: boolean;
}

export interface LinearGradientData {
  start: Point2D;
  end: Point2D;
  feather: number;
}

export interface RadialGradientData {
  center: Point2D;
  rx: number;
  ry: number;
  angle: number; // degrees
  feather: number;
}

export interface ColorRangeData {
  targetColor: { r: number; g: number; b: number };
  tolerance: number; // 0 to 100
  smoothness: number; // 0 to 100
}

export interface LumaRangeData {
  minLuma: number; // 0 to 100
  maxLuma: number; // 0 to 100
  featherMin: number; // 0 to 100
  featherMax: number; // 0 to 100
}

export interface DepthRangeData {
  range: 'foreground' | 'midground' | 'background';
  near: number;
  far: number;
  feather: number;
}

export interface ObjectSelectionData {
  box: { x: number; y: number; width: number; height: number };
  maskCanvas?: HTMLCanvasElement;
}

export interface AISelectionData {
  category: MaskComponentType;
  maskCanvas?: HTMLCanvasElement;
  uncertaintyCanvas?: HTMLCanvasElement;
  confidence?: number;
  model?: string;
  qualityMode?: 'fast' | 'high_quality';
  boundaryAccuracy?: number;
  prompts?: { x: number; y: number; positive: boolean }[];
  detectedSubjects?: { id: string; label: string; box: { x: number; y: number; w: number; h: number }; confidence: number }[];
}

export interface MaskComponent {
  id: string;
  name: string;
  type: MaskComponentType;
  combineMode: CombineMode;
  enabled: boolean;
  inverted: boolean;
  density: number; // 0 to 100
  feather: number; // 0 to 100
  strokes?: BrushStroke[];
  linearGradient?: LinearGradientData;
  radialGradient?: RadialGradientData;
  colorRange?: ColorRangeData;
  lumaRange?: LumaRangeData;
  depthRange?: DepthRangeData;
  objectSelection?: ObjectSelectionData;
  aiSelection?: AISelectionData;
}

export interface MaskAdjustments {
  // LIGHT
  exposure: number;       // -5.0 to +5.0 EV
  contrast: number;       // -100 to +100
  highlights: number;     // -100 to +100
  shadows: number;        // -100 to +100
  whites: number;         // -100 to +100
  blacks: number;         // -100 to +100

  // COLOR
  temperature: number;    // -100 to +100
  tint: number;           // -100 to +100
  vibrance: number;       // -100 to +100
  saturation: number;     // -100 to +100

  // EFFECTS
  texture: number;        // -100 to +100
  clarity: number;        // -100 to +100
  dehaze: number;         // -100 to +100
  sharpness: number;      // -100 to +100
  noiseReduction: number; // 0 to 100
  defringe: number;       // 0 to 100

  // REFINE
  edgeFeather: number;    // 0 to 100
  shiftEdge: number;      // -100 to +100
  smoothness: number;     // 0 to 100
}

export const DEFAULT_MASK_ADJUSTMENTS: MaskAdjustments = {
  exposure: 0.0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  sharpness: 0,
  noiseReduction: 0,
  defringe: 0,
  edgeFeather: 0,
  shiftEdge: 0,
  smoothness: 0
};

export interface MaskGroup {
  id: string;
  name: string;
  enabled: boolean;
  inverted: boolean;
  opacity: number; // 0 to 100
  components: MaskComponent[];
  adjustments: MaskAdjustments;
}

export type OverlayMode = 'color' | 'grayscale' | 'white_on_black' | 'black_on_white' | 'boundary' | 'uncertainty';

export interface MaskOverlayConfig {
  showOverlay: boolean;
  overlayMode: OverlayMode;
  overlayColor: [number, number, number]; // RGB normalized [0..1]
  overlayOpacity: number; // 0 to 100
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
