const fs = require('fs');
const path = require('path');

function save(filePath, content) {
  const full = path.resolve(filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Created:', filePath);
}

// ==========================================
// 1. Math / Spline.ts
// ==========================================
save('src/engine/math/Spline.ts', `import { CurvePoint } from '../../types/adjustments';

/**
 * Monotone Cubic Spline (Fritsch-Carlson) interpolation.
 * Guarantees that the interpolated curve does not overshoot or oscillate unnaturally.
 */
export class MonotoneCubicSpline {
  private xs: number[];
  private ys: number[];
  private ms: number[];

  constructor(points: CurvePoint[]) {
    // Sort points by X coordinate
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    // Deduplicate adjacent points with identical X
    const uniquePoints: CurvePoint[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i].x !== sorted[i - 1].x) {
        uniquePoints.push(sorted[i]);
      }
    }

    if (uniquePoints.length === 0) {
      this.xs = [0, 255];
      this.ys = [0, 255];
      this.ms = [1, 1];
      return;
    }

    if (uniquePoints.length === 1) {
      this.xs = [0, 255];
      this.ys = [uniquePoints[0].y, uniquePoints[0].y];
      this.ms = [0, 0];
      return;
    }

    const n = uniquePoints.length;
    this.xs = uniquePoints.map(p => p.x);
    this.ys = uniquePoints.map(p => p.y);

    // Compute slopes of secant lines between successive points
    const deltas: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const dx = this.xs[i + 1] - this.xs[i];
      deltas[i] = dx === 0 ? 0 : (this.ys[i + 1] - this.ys[i]) / dx;
    }

    // Initialize tangents as average of secants
    this.ms = new Array(n);
    this.ms[0] = deltas[0];
    for (let i = 1; i < n - 1; i++) {
      this.ms[i] = (deltas[i - 1] + deltas[i]) * 0.5;
    }
    this.ms[n - 1] = deltas[n - 2];

    // Fritsch-Carlson adjustments to ensure monotonicity
    for (let i = 0; i < n - 1; i++) {
      if (deltas[i] === 0) {
        this.ms[i] = 0;
        this.ms[i + 1] = 0;
      } else {
        const alpha = this.ms[i] / deltas[i];
        const beta = this.ms[i + 1] / deltas[i];
        const dist = alpha * alpha + beta * beta;
        if (dist > 9) {
          const tau = 3 / Math.sqrt(dist);
          this.ms[i] = tau * alpha * deltas[i];
          this.ms[i + 1] = tau * beta * deltas[i];
        }
      }
    }
  }

  public evaluate(x: number): number {
    const n = this.xs.length;
    if (x <= this.xs[0]) return Math.max(0, Math.min(255, this.ys[0]));
    if (x >= this.xs[n - 1]) return Math.max(0, Math.min(255, this.ys[n - 1]));

    // Binary search for interval
    let low = 0;
    let high = n - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.xs[mid] <= x) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const i = Math.max(0, high);
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

  /**
   * Generates a 256-element uint8 lookup table for fast shader / CPU mapping.
   */
  public generateLUT(): Uint8Array {
    const lut = new Uint8Array(256);
    for (let x = 0; x < 256; x++) {
      lut[x] = Math.round(this.evaluate(x));
    }
    return lut;
  }
}
`);

// ==========================================
// 2. Math / ColorSpaces.ts
// ==========================================
save('src/engine/math/ColorSpaces.ts', `/**
 * Converts Kelvin color temperature (1000K - 12000K) to RGB balance multipliers.
 * Tanner Helland / Mitchell Charity Planckian locus algorithm.
 */
export function kelvinToRGB(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r = 0;
  let g = 0;
  let b = 0;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  // Normalize so standard daylight (~5500K) is (1, 1, 1)
  const [d55R, d55G, d55B] = kelvinToRGBRaw(5500);
  return [r / d55R, g / d55G, b / d55B];
}

function kelvinToRGBRaw(kelvin: number): [number, number, number] {
  const temp = kelvin / 100;
  let r = temp <= 66 ? 255 : 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  let g = temp <= 66 ? 99.4708025861 * Math.log(temp) - 161.1195681661 : 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  let b = temp >= 66 ? 255 : temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  return [Math.max(1, r), Math.max(1, g), Math.max(1, b)];
}

/**
 * Converts HSV to RGB (H: 0..360, S: 0..100, V: 0..100) -> [0..1, 0..1, 0..1]
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; }
  else if (hp >= 2 && hp < 3) { g1 = c; b1 = x; }
  else if (hp >= 3 && hp < 4) { g1 = x; b1 = c; }
  else if (hp >= 4 && hp < 5) { r1 = x; b1 = c; }
  else if (hp >= 5 && hp < 6) { r1 = c; b1 = x; }

  const m = normV - c;
  return [r1 + m, g1 + m, b1 + m];
}

/**
 * Converts RGB [0..1, 0..1, 0..1] to HSV (H: 0..360, S: 0..100, V: 0..100)
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return [h, s, v];
}
`);

// ==========================================
// 3. Metadata / ExifParser.ts
// ==========================================
save('src/engine/metadata/ExifParser.ts', `import ExifReader from 'exifreader';
import { ExifMetadata } from '../../types/image';

export class ExifParser {
  public static async parse(buffer: ArrayBuffer | Uint8Array): Promise<ExifMetadata> {
    try {
      const tags = await ExifReader.load(buffer, { expanded: true });
      const exif: ExifMetadata = {};

      if (tags.exif) {
        const e = tags.exif;
        if (e.Make?.description) exif.make = e.Make.description;
        if (e.Model?.description) exif.model = e.Model.description;
        if (e.LensModel?.description) exif.lens = e.LensModel.description;
        if (e.FocalLength?.description) exif.focalLength = e.FocalLength.description;
        if (e.FNumber?.description) exif.fNumber = e.FNumber.description;
        if (e.ExposureTime?.description) exif.exposureTime = e.ExposureTime.description;
        if (e.ISOSpeedRatings?.value) {
          const isoVal = Array.isArray(e.ISOSpeedRatings.value) ? e.ISOSpeedRatings.value[0] : e.ISOSpeedRatings.value;
          exif.iso = Number(isoVal) || undefined;
        }
        if (e.ExposureBiasValue?.description) exif.exposureBias = e.ExposureBiasValue.description;
        if (e.WhiteBalance?.description) exif.whiteBalance = e.WhiteBalance.description;
        if (e.MeteringMode?.description) exif.meteringMode = e.MeteringMode.description;
        if (e.DateTimeOriginal?.description) exif.dateTimeOriginal = e.DateTimeOriginal.description;
        if (e.PixelXDimension?.value) exif.width = Number(e.PixelXDimension.value);
        if (e.PixelYDimension?.value) exif.height = Number(e.PixelYDimension.value);
        if (e.Orientation?.value) exif.orientation = Number(e.Orientation.value);
      }

      if (tags.gps) {
        if (typeof tags.gps.Latitude === 'number') exif.latitude = tags.gps.Latitude;
        if (typeof tags.gps.Longitude === 'number') exif.longitude = tags.gps.Longitude;
      }

      if (tags.iptc) {
        const i = tags.iptc;
        if (i['Object Name']?.description) exif.title = i['Object Name'].description;
        if (i.Caption?.description) exif.caption = i.Caption.description;
        if (i['Copyright Notice']?.description) exif.copyright = i['Copyright Notice'].description;
        if (i['By-line']?.description) exif.creator = i['By-line'].description;
        if (i.Keywords) {
          if (Array.isArray(i.Keywords)) {
            exif.keywords = i.Keywords.map((k: any) => k.description || String(k));
          } else if (i.Keywords.description) {
            exif.keywords = [i.Keywords.description];
          }
        }
      }

      return exif;
    } catch (err) {
      console.warn('EXIF parsing fallback:', err);
      return {};
    }
  }
}
`);

// ==========================================
// 4. RAW & Image Decoder / RawDecoder.ts
// ==========================================
save('src/engine/raw/RawDecoder.ts', `import { ExifParser } from '../metadata/ExifParser';
import { PhotoRecord } from '../../types/image';

export interface DecodedImageResult {
  imageBitmap?: ImageBitmap;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  exif: any;
}

export class RawDecoder {
  private static supportedRawExtensions = new Set([
    'dng', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'pef', 'srw'
  ]);

  public static isRaw(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.supportedRawExtensions.has(ext);
  }

  /**
   * Decodes file buffer (RAW or Standard JPEG/PNG/WebP/TIFF).
   * For RAW files, extracts embedded full-resolution or preview JPEG stream quickly.
   */
  public static async decode(file: File | Blob, filename: string): Promise<DecodedImageResult> {
    const buffer = await file.arrayBuffer();
    const exif = await ExifParser.parse(buffer);
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    let previewBlob: Blob = file;

    if (this.isRaw(filename)) {
      // Find embedded JPEG preview inside RAW / DNG container
      const extractedBlob = this.extractEmbeddedPreview(new Uint8Array(buffer));
      if (extractedBlob) {
        previewBlob = extractedBlob;
      }
    }

    const previewUrl = URL.createObjectURL(previewBlob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image preview'));
      img.src = previewUrl;
    });

    const width = exif.width || img.naturalWidth || 1920;
    const height = exif.height || img.naturalHeight || 1080;

    // Generate high-speed thumbnail
    const thumbCanvas = document.createElement('canvas');
    const maxThumbDim = 320;
    const scale = Math.min(1, maxThumbDim / Math.max(img.naturalWidth, img.naturalHeight));
    thumbCanvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    thumbCanvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

    let imageBitmap: ImageBitmap | undefined;
    try {
      imageBitmap = await createImageBitmap(previewBlob);
    } catch {
      // fallback
    }

    return {
      imageBitmap,
      thumbnailUrl,
      previewUrl,
      width,
      height,
      exif
    };
  }

  /**
   * Scans TIFF / Exif tags or raw byte stream for SOI/EOI JPEG markers
   */
  private static extractEmbeddedPreview(bytes: Uint8Array): Blob | null {
    // Search for largest embedded JPEG block (0xFF 0xD8 to 0xFF 0xD9)
    let bestStart = -1;
    let bestEnd = -1;
    let maxLen = 0;

    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        const start = i;
        // Search forward for EOI (0xFF 0xD9)
        for (let j = start + 1000; j < Math.min(bytes.length - 1, start + 25000000); j++) {
          if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
            const len = j + 2 - start;
            if (len > maxLen) {
              maxLen = len;
              bestStart = start;
              bestEnd = j + 2;
            }
            i = j;
            break;
          }
        }
      }
    }

    if (bestStart !== -1 && maxLen > 10000) {
      const jpegBytes = bytes.subarray(bestStart, bestEnd);
      return new Blob([jpegBytes], { type: 'image/jpeg' });
    }

    return null;
  }
}
`);

// ==========================================
// 5. GL / Shaders.ts
// ==========================================
save('src/engine/gl/Shaders.ts', `export const VERTEX_SHADER_SRC = \`#version 300 es
in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
\`;

export const FRAGMENT_SHADER_SRC = \`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_image;
uniform sampler2D u_curveRgb;
uniform sampler2D u_curveRed;
uniform sampler2D u_curveGreen;
uniform sampler2D u_curveBlue;
uniform sampler2D u_maskTexture;

// Image dimensions
uniform vec2 u_resolution;

// Tone adjustments
uniform float u_exposure;        // -5.0 to +5.0 EV
uniform float u_contrast;        // -100 to +100
uniform float u_highlights;      // -100 to +100
uniform float u_shadows;         // -100 to +100
uniform float u_whites;          // -100 to +100
uniform float u_blacks;          // -100 to +100
uniform vec3  u_wbMultiplier;    // White balance multipliers (R, G, B)
uniform float u_tint;            // -100 to +100
uniform float u_vibrance;        // -100 to +100
uniform float u_saturation;      // -100 to +100
uniform float u_texture;         // -100 to +100
uniform float u_clarity;         // -100 to +100
uniform float u_dehaze;          // -100 to +100

// HSL Adjustments (8 bands: Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
// Each band has vec3(hueShift, satScale, lumaScale)
uniform vec3 u_hsl[8];

// Color Grading (Shadows, Midtones, Highlights)
uniform vec3 u_cgShadows;    // rgb color tint + luma
uniform vec3 u_cgMidtones;   // rgb color tint + luma
uniform vec3 u_cgHighlights; // rgb color tint + luma
uniform float u_cgBlending;  // 0 to 1
uniform float u_cgBalance;   // -1 to +1

// Detail & Effects
uniform float u_sharpenAmount;   // 0 to 150
uniform float u_sharpenRadius;   // 0.5 to 3.0
uniform float u_vignetteAmount;  // -100 to +100
uniform float u_vignetteMidpoint;// 0 to 100
uniform float u_vignetteFeather; // 0 to 100
uniform float u_grainAmount;     // 0 to 100
uniform float u_grainTime;       // noise seed
uniform float u_distortion;      // -100 to +100
uniform float u_caAmount;        // 0 to 100

// Mask Overlay Toggle
uniform int u_showMaskOverlay;
uniform vec3 u_maskOverlayColor;

// Utilities
float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Pseudo-random generator for film grain
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + u_grainTime) * 43758.5453);
}

// Lens distortion coordinates
vec2 distortCoords(vec2 uv, float k) {
  vec2 coord = (uv - 0.5) * 2.0;
  float r2 = dot(coord, coord);
  vec2 distorted = coord * (1.0 + k * r2);
  return distorted * 0.5 + 0.5;
}

void main() {
  vec2 uv = v_texCoord;

  // 1. Lens Distortion
  if (abs(u_distortion) > 0.001) {
    float k = u_distortion * -0.003;
    uv = distortCoords(uv, k);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      outColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // 2. Sample Base Image with Chromatic Aberration fringe offset
  vec3 color;
  if (u_caAmount > 0.01) {
    vec2 dir = (uv - 0.5);
    float offset = u_caAmount * 0.002;
    float r = texture(u_image, uv + dir * offset).r;
    float g = texture(u_image, uv).g;
    float b = texture(u_image, uv - dir * offset).b;
    color = vec3(r, g, b);
  } else {
    color = texture(u_image, uv).rgb;
  }

  // 3. White Balance & Tint
  color *= u_wbMultiplier;
  if (abs(u_tint) > 0.01) {
    // Tint shifts Green vs Magenta
    float tintVal = u_tint * 0.005;
    color.g -= tintVal;
    color.r += tintVal * 0.5;
    color.b += tintVal * 0.5;
  }
  color = clamp(color, 0.0, 1.0);

  // 4. Exposure (EV scale = pow(2, EV))
  color *= pow(2.0, u_exposure);

  // 5. Dehaze
  if (abs(u_dehaze) > 0.01) {
    float d = u_dehaze * 0.01;
    color = clamp((color - d * 0.2) / max(vec3(0.01), 1.0 - d * 0.2), 0.0, 1.0);
  }

  // 6. Highlights, Shadows, Whites, Blacks
  float luma = getLuminance(color);
  
  // Shadows & Highlights selective curves
  if (abs(u_shadows) > 0.01) {
    float shadowWeight = smoothstep(0.6, 0.0, luma);
    color += color * (u_shadows * 0.008 * shadowWeight);
  }
  if (abs(u_highlights) > 0.01) {
    float highlightWeight = smoothstep(0.4, 1.0, luma);
    color += (1.0 - color) * (u_highlights * 0.008 * highlightWeight);
  }
  if (abs(u_whites) > 0.01) {
    float whiteWeight = smoothstep(0.7, 1.0, luma);
    color += color * (u_whites * 0.005 * whiteWeight);
  }
  if (abs(u_blacks) > 0.01) {
    float blackWeight = smoothstep(0.3, 0.0, luma);
    color += (color - 0.0) * (u_blacks * 0.005 * blackWeight);
  }
  color = clamp(color, 0.0, 1.0);

  // 7. Contrast
  if (abs(u_contrast) > 0.01) {
    float c = (u_contrast / 100.0) + 1.0;
    color = clamp((color - 0.5) * c + 0.5, 0.0, 1.0);
  }

  // 8. Clarity & Midtone Texture (Local contrast approximation)
  if (abs(u_clarity) > 0.01 || abs(u_texture) > 0.01) {
    vec2 pixel = 1.0 / u_resolution;
    vec3 blurred = (
      texture(u_image, uv + vec2(-pixel.x, 0.0)).rgb +
      texture(u_image, uv + vec2(pixel.x, 0.0)).rgb +
      texture(u_image, uv + vec2(0.0, -pixel.y)).rgb +
      texture(u_image, uv + vec2(0.0, pixel.y)).rgb
    ) * 0.25;
    vec3 highPass = color - blurred;
    float midWeight = 1.0 - abs(luma - 0.5) * 2.0;
    color += highPass * (u_clarity * 0.01 * midWeight + u_texture * 0.008);
    color = clamp(color, 0.0, 1.0);
  }

  // 9. Spline Tone Curves (Per-channel and composite)
  color.r = texture(u_curveRed, vec2(color.r, 0.5)).r;
  color.g = texture(u_curveGreen, vec2(color.g, 0.5)).r;
  color.b = texture(u_curveBlue, vec2(color.b, 0.5)).r;

  color.r = texture(u_curveRgb, vec2(color.r, 0.5)).r;
  color.g = texture(u_curveRgb, vec2(color.g, 0.5)).r;
  color.b = texture(u_curveRgb, vec2(color.b, 0.5)).r;

  // 10. HSL 8-Band Color Mixer
  vec3 hsv = rgb2hsv(color);
  float hueDeg = hsv.x * 360.0;
  
  // Bands: 0:Red(0/360), 1:Orange(30), 2:Yellow(60), 3:Green(120), 4:Aqua(180), 5:Blue(240), 6:Purple(280), 7:Magenta(320)
  float bandCenters[8] = float[8](0.0, 30.0, 60.0, 120.0, 180.0, 240.0, 280.0, 320.0);
  float bandWidths[8] = float[8](40.0, 35.0, 45.0, 60.0, 60.0, 60.0, 45.0, 45.0);

  vec3 hslDelta = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float diff = abs(hueDeg - bandCenters[i]);
    if (diff > 180.0) diff = 360.0 - diff;
    float weight = clamp(1.0 - (diff / bandWidths[i]), 0.0, 1.0);
    weight = smoothstep(0.0, 1.0, weight);
    hslDelta += u_hsl[i] * weight;
  }

  hsv.x = fract((hsv.x * 360.0 + hslDelta.x) / 360.0);
  hsv.y = clamp(hsv.y * (1.0 + hslDelta.y * 0.01), 0.0, 1.0);
  hsv.z = clamp(hsv.z * (1.0 + hslDelta.z * 0.01), 0.0, 1.0);
  color = hsv2rgb(hsv);

  // 11. Vibrance & Global Saturation
  if (abs(u_vibrance) > 0.01 || abs(u_saturation) > 0.01) {
    float curLuma = getLuminance(color);
    vec3 gray = vec3(curLuma);
    
    // Saturation
    float satMult = 1.0 + (u_saturation * 0.01);
    color = mix(gray, color, satMult);

    // Vibrance (protects skin tones and already saturated colors)
    float sat = rgb2hsv(color).y;
    float vibMult = 1.0 + (u_vibrance * 0.01 * (1.0 - sat));
    color = mix(gray, color, vibMult);
    color = clamp(color, 0.0, 1.0);
  }

  // 12. 3-Way Color Grading (Shadows, Midtones, Highlights)
  float gradeLuma = getLuminance(color);
  float shadowMask = smoothstep(0.5 + u_cgBalance * 0.2, 0.0, gradeLuma);
  float highlightMask = smoothstep(0.5 + u_cgBalance * 0.2, 1.0, gradeLuma);
  float midtoneMask = clamp(1.0 - shadowMask - highlightMask, 0.0, 1.0);

  color += u_cgShadows * shadowMask * u_cgBlending;
  color += u_cgMidtones * midtoneMask * u_cgBlending;
  color += u_cgHighlights * highlightMask * u_cgBlending;
  color = clamp(color, 0.0, 1.0);

  // 13. Sharpening (High-pass convolution)
  if (u_sharpenAmount > 0.01) {
    vec2 p = (u_sharpenRadius / u_resolution);
    vec3 cN = texture(u_image, uv + vec2(0.0, p.y)).rgb;
    vec3 cS = texture(u_image, uv - vec2(0.0, p.y)).rgb;
    vec3 cE = texture(u_image, uv + vec2(p.x, 0.0)).rgb;
    vec3 cW = texture(u_image, uv - vec2(p.x, 0.0)).rgb;
    vec3 sharp = color * 5.0 - (cN + cS + cE + cW);
    color = mix(color, sharp, u_sharpenAmount * 0.005);
    color = clamp(color, 0.0, 1.0);
  }

  // 14. Vignette
  if (abs(u_vignetteAmount) > 0.01) {
    vec2 coord = (uv - 0.5) * 2.0;
    float dist = length(coord);
    float midpoint = u_vignetteMidpoint * 0.01;
    float feather = max(0.01, u_vignetteFeather * 0.01);
    float vignette = smoothstep(midpoint, midpoint + feather, dist);
    float vigFactor = 1.0 + (u_vignetteAmount * 0.01 * vignette);
    color *= vigFactor;
    color = clamp(color, 0.0, 1.0);
  }

  // 15. Film Grain
  if (u_grainAmount > 0.01) {
    float noise = (rand(uv * u_resolution) - 0.5) * 2.0;
    color += noise * (u_grainAmount * 0.003);
    color = clamp(color, 0.0, 1.0);
  }

  // 16. Mask layer & Rubylith overlay visualization
  vec4 maskVal = texture(u_maskTexture, uv);
  if (u_showMaskOverlay == 1 && maskVal.r > 0.01) {
    color = mix(color, u_maskOverlayColor, maskVal.r * 0.5);
  }

  outColor = vec4(color, 1.0);
}
\`;
`);

console.log('Math, Metadata, RAW and Shaders written successfully.');
