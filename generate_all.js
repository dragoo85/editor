const fs = require('fs');
const path = require('path');

function save(filePath, content) {
  const full = path.resolve(filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Created:', filePath);
}

// ==========================================
// 1. Types
// ==========================================

save('src/types/image.ts', `export type FlagType = 'none' | 'pick' | 'reject';
export type ColorLabel = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';

export interface ExifMetadata {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: string;
  fNumber?: string;
  exposureTime?: string;
  iso?: number;
  exposureBias?: string;
  whiteBalance?: string;
  meteringMode?: string;
  dateTimeOriginal?: string;
  width?: number;
  height?: number;
  orientation?: number;
  latitude?: number;
  longitude?: number;
  title?: string;
  caption?: string;
  copyright?: string;
  creator?: string;
  keywords?: string[];
}

export interface PhotoRecord {
  id: string;
  path: string;
  filename: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
  dateModified: number;
  dateTaken?: number;
  rating: number; // 0 to 5
  flag: FlagType;
  colorLabel: ColorLabel;
  collections: string[];
  isFavorite: boolean;
  thumbnailUrl: string;
  previewUrl: string;
  exif: ExifMetadata;
  editState?: any;
}

export interface Collection {
  id: string;
  name: string;
  isSmart?: boolean;
  photoIds?: string[];
  createdAt: number;
}
`);

save('src/types/masks.ts', `import { ToneAdjustments } from './adjustments';

export type MaskType = 'brush' | 'linear' | 'radial' | 'color_range' | 'luma_range';

export interface Point2D {
  x: number;
  y: number;
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
  angle: number;
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

export type MaskData = 
  | { type: 'brush'; strokes: BrushStroke[] }
  | { type: 'linear'; gradient: LinearGradientMaskData }
  | { type: 'radial'; gradient: RadialGradientMaskData }
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
  adjustments: Partial<ToneAdjustments>;
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
`);

save('src/types/adjustments.ts', `import { MaskLayer, HealingPin } from './masks';

export interface ToneAdjustments {
  exposure: number; // -5.0 to +5.0 EV
  contrast: number; // -100 to +100
  highlights: number; // -100 to +100
  shadows: number; // -100 to +100
  whites: number; // -100 to +100
  blacks: number; // -100 to +100
  temperature: number; // 2000K to 12000K (5500 default)
  tint: number; // -100 to +100
  vibrance: number; // -100 to +100
  saturation: number; // -100 to +100
  texture: number; // -100 to +100
  clarity: number; // -100 to +100
  dehaze: number; // -100 to +100
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
  hue: number; // -100 to +100
  saturation: number; // -100 to +100
  luminance: number; // -100 to +100
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
  hue: number; // 0 to 360
  saturation: number; // 0 to 100
  luminance: number; // -100 to +100
}

export interface ColorGradingAdjustments {
  shadows: ColorGradingWheel;
  midtones: ColorGradingWheel;
  highlights: ColorGradingWheel;
  blending: number; // 0 to 100
  balance: number; // -100 to +100
}

export interface DetailAdjustments {
  sharpenAmount: number; // 0 to 150
  sharpenRadius: number; // 0.5 to 3.0
  sharpenDetail: number; // 0 to 100
  sharpenMasking: number; // 0 to 100
  noiseReductionLuma: number; // 0 to 100
  noiseReductionColor: number; // 0 to 100
  vignetteAmount: number; // -100 to +100
  vignetteMidpoint: number; // 0 to 100
  vignetteRoundness: number; // -100 to +100
  vignetteFeather: number; // 0 to 100
  grainAmount: number; // 0 to 100
  grainSize: number; // 0 to 100
  grainRoughness: number; // 0 to 100
}

export interface OpticsAdjustments {
  distortion: number; // -100 to +100
  chromaticAberration: number; // 0 to 100
  vignettingCorrection: number; // 0 to 100
  defringePurple: number; // 0 to 100
  defringeGreen: number; // 0 to 100
}

export interface CropRect {
  x: number; // 0 to 1
  y: number; // 0 to 1
  width: number; // 0 to 1
  height: number; // 0 to 1
}

export interface GeometryAdjustments {
  rotation: number; // 0, 90, 180, 270
  straighten: number; // -45 to +45 deg
  flipH: boolean;
  flipV: boolean;
  aspectRatio: string; // 'original' | '1:1' | '4:3' | '3:2' | '16:9' | 'custom'
  cropRect: CropRect | null;
  perspectiveV: number; // -100 to +100
  perspectiveH: number; // -100 to +100
}

export interface DevelopState {
  tone: ToneAdjustments;
  curve: ToneCurve;
  hsl: HSLAdjustments;
  colorGrading: ColorGradingAdjustments;
  detail: DetailAdjustments;
  optics: OpticsAdjustments;
  geometry: GeometryAdjustments;
  masks: MaskLayer[];
  healingPins: HealingPin[];
}

export const DEFAULT_TONE: ToneAdjustments = {
  exposure: 0,
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
};

export const DEFAULT_CURVE: ToneCurve = {
  rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
};

const DEFAULT_HSL_CHANNEL: HSLChannel = { hue: 0, saturation: 0, luminance: 0 };

export const DEFAULT_HSL: HSLAdjustments = {
  red: { ...DEFAULT_HSL_CHANNEL },
  orange: { ...DEFAULT_HSL_CHANNEL },
  yellow: { ...DEFAULT_HSL_CHANNEL },
  green: { ...DEFAULT_HSL_CHANNEL },
  aqua: { ...DEFAULT_HSL_CHANNEL },
  blue: { ...DEFAULT_HSL_CHANNEL },
  purple: { ...DEFAULT_HSL_CHANNEL },
  magenta: { ...DEFAULT_HSL_CHANNEL }
};

export const DEFAULT_COLOR_GRADING: ColorGradingAdjustments = {
  shadows: { hue: 0, saturation: 0, luminance: 0 },
  midtones: { hue: 0, saturation: 0, luminance: 0 },
  highlights: { hue: 0, saturation: 0, luminance: 0 },
  blending: 50,
  balance: 0
};

export const DEFAULT_DETAIL: DetailAdjustments = {
  sharpenAmount: 25,
  sharpenRadius: 1.0,
  sharpenDetail: 25,
  sharpenMasking: 0,
  noiseReductionLuma: 0,
  noiseReductionColor: 25,
  vignetteAmount: 0,
  vignetteMidpoint: 50,
  vignetteRoundness: 0,
  vignetteFeather: 50,
  grainAmount: 0,
  grainSize: 25,
  grainRoughness: 50
};

export const DEFAULT_OPTICS: OpticsAdjustments = {
  distortion: 0,
  chromaticAberration: 0,
  vignettingCorrection: 0,
  defringePurple: 0,
  defringeGreen: 0
};

export const DEFAULT_GEOMETRY: GeometryAdjustments = {
  rotation: 0,
  straighten: 0,
  flipH: false,
  flipV: false,
  aspectRatio: 'original',
  cropRect: null,
  perspectiveV: 0,
  perspectiveH: 0
};

export const DEFAULT_DEVELOP_STATE: DevelopState = {
  tone: DEFAULT_TONE,
  curve: DEFAULT_CURVE,
  hsl: DEFAULT_HSL,
  colorGrading: DEFAULT_COLOR_GRADING,
  detail: DEFAULT_DETAIL,
  optics: DEFAULT_OPTICS,
  geometry: DEFAULT_GEOMETRY,
  masks: [],
  healingPins: []
};
`);

save('src/types/presets.ts', `import { DevelopState } from './adjustments';

export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  adjustments: Partial<DevelopState>;
  isBuiltIn: boolean;
}
`);

console.log('Types written.');
