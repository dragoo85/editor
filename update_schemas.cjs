const fs = require('fs');
const path = require('path');

// 1. Update src/types/masks.ts
fs.writeFileSync(path.resolve('src/types/masks.ts'), `export type MaskComponentType = 
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

export type OverlayMode = 'color' | 'grayscale' | 'white_on_black' | 'black_on_white';

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
`, 'utf8');

// 2. Update src/types/adjustments.ts
fs.writeFileSync(path.resolve('src/types/adjustments.ts'), `import { MaskGroup } from './masks';

export interface ToneAdjustments {
  exposure: number;       // -5.0 to +5.0 EV
  contrast: number;       // -100 to +100
  highlights: number;     // -100 to +100
  shadows: number;        // -100 to +100
  whites: number;         // -100 to +100
  blacks: number;         // -100 to +100
  temperature: number;    // Kelvin 2000K to 12000K
  tint: number;           // -100 to +100
  vibrance: number;       // -100 to +100
  saturation: number;     // -100 to +100
  texture: number;        // -100 to +100
  clarity: number;        // -100 to +100
  dehaze: number;         // -100 to +100
}

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ToneCurve {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface HSLChannel {
  hue: number;        // -100 to +100
  saturation: number; // -100 to +100
  luminance: number;  // -100 to +100
}

export interface HSLAdjustments {
  red: HSLChannel;
  orange: HSLChannel;
  yellow: HSLChannel;
  green: HSLChannel;
  aqua: HSLChannel;
  blue: HSLChannel;
  purple: HSLChannel;
  magenta: HSLChannel;
}

export interface ColorGradingWheel {
  hue: number;        // 0 to 360
  saturation: number; // 0 to 100
  luminance: number;  // -100 to +100
}

export interface ColorGradingAdjustments {
  shadows: ColorGradingWheel;
  midtones: ColorGradingWheel;
  highlights: ColorGradingWheel;
  blending: number;   // 0 to 100
  balance: number;    // -100 to +100
}

export interface DetailAdjustments {
  sharpenAmount: number;           // 0 to 150
  sharpenRadius: number;           // 0.5 to 3.0
  sharpenDetail: number;           // 0 to 100
  sharpenMasking: number;          // 0 to 100
  noiseReductionLuminance: number; // 0 to 100
  noiseReductionColor: number;     // 0 to 100
  vignetteAmount: number;          // -100 to +100
  vignetteMidpoint: number;        // 0 to 100
  vignetteFeather: number;         // 0 to 100
  grainAmount: number;             // 0 to 100
}

export interface OpticsAdjustments {
  distortion: number;           // -100 to +100
  chromaticAberration: number;  // 0 to 100
  vignetteAmount: number;       // -100 to +100
}

export interface GeometryAdjustments {
  rotation: number;     // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  straighten: number;   // -45 to +45 deg
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: string; // 'original', '1:1', '4:3', '16:9', 'custom'
  };
}

export interface CalibrationAdjustments {
  shadowsTint: number;       // -100 to +100
  redHue: number;            // -100 to +100
  redSaturation: number;     // -100 to +100
  greenHue: number;          // -100 to +100
  greenSaturation: number;   // -100 to +100
  blueHue: number;           // -100 to +100
  blueSaturation: number;    // -100 to +100
}

export const DEFAULT_CALIBRATION: CalibrationAdjustments = {
  shadowsTint: 0,
  redHue: 0,
  redSaturation: 0,
  greenHue: 0,
  greenSaturation: 0,
  blueHue: 0,
  blueSaturation: 0
};

export interface DevelopState {
  tone: ToneAdjustments;
  curve: ToneCurve;
  hsl: HSLAdjustments;
  colorGrading: ColorGradingAdjustments;
  detail: DetailAdjustments;
  optics: OpticsAdjustments;
  geometry: GeometryAdjustments;
  calibration: CalibrationAdjustments;
  masks: MaskGroup[];
  healingPins: Array<{
    id: string;
    type: 'heal' | 'clone';
    target: { x: number; y: number };
    source: { x: number; y: number };
    radius: number;
    feather: number;
    opacity: number;
  }>;
}

export const DEFAULT_CURVE_CHANNEL: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 }
];

export const DEFAULT_DEVELOP_STATE: DevelopState = {
  tone: {
    exposure: 0.0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 5500,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    texture: 0,
    clarity: 0,
    dehaze: 0
  },
  curve: {
    rgb: [...DEFAULT_CURVE_CHANNEL],
    red: [...DEFAULT_CURVE_CHANNEL],
    green: [...DEFAULT_CURVE_CHANNEL],
    blue: [...DEFAULT_CURVE_CHANNEL]
  },
  hsl: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    aqua: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 }
  },
  colorGrading: {
    shadows: { hue: 0, saturation: 0, luminance: 0 },
    midtones: { hue: 0, saturation: 0, luminance: 0 },
    highlights: { hue: 0, saturation: 0, luminance: 0 },
    blending: 50,
    balance: 0
  },
  detail: {
    sharpenAmount: 40,
    sharpenRadius: 1.0,
    sharpenDetail: 25,
    sharpenMasking: 0,
    noiseReductionLuminance: 0,
    noiseReductionColor: 25,
    vignetteAmount: 0,
    vignetteMidpoint: 50,
    vignetteFeather: 50,
    grainAmount: 0
  },
  optics: {
    distortion: 0,
    chromaticAberration: 0,
    vignetteAmount: 0
  },
  geometry: {
    rotation: 0,
    flipH: false,
    flipV: false,
    straighten: 0,
    crop: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      aspectRatio: 'original'
    }
  },
  calibration: DEFAULT_CALIBRATION,
  masks: [],
  healingPins: []
};
`, 'utf8');

console.log('Schemas updated successfully.');
