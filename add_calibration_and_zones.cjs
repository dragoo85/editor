const fs = require('fs');
const path = require('path');

// 1. Update adjustments.ts with Calibration state
let adjCode = fs.readFileSync(path.resolve('src/types/adjustments.ts'), 'utf8');
if (!adjCode.includes('CalibrationAdjustments')) {
  adjCode = adjCode.replace(
    `export interface DevelopState {`,
    `export interface CalibrationAdjustments {
  shadowsTint: number;       // -100 to +100 (Green vs Magenta)
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

export interface DevelopState {`
  ).replace(
    `masks: MaskLayer[];`,
    `calibration: CalibrationAdjustments;
  masks: MaskLayer[];`
  ).replace(
    `masks: []`,
    `calibration: DEFAULT_CALIBRATION,
  masks: []`
  );
  fs.writeFileSync(path.resolve('src/types/adjustments.ts'), adjCode, 'utf8');
}

// 2. Update Shaders.ts to include Calibration in GPU fragment shader
let shaderCode = fs.readFileSync(path.resolve('src/engine/gl/Shaders.ts'), 'utf8');
if (!shaderCode.includes('u_calibRed')) {
  shaderCode = shaderCode.replace(
    `// Detail & Optics`,
    `// Calibration
uniform float u_calibShadowsTint;
uniform vec2 u_calibRed;
uniform vec2 u_calibGreen;
uniform vec2 u_calibBlue;

// Detail & Optics`
  ).replace(
    `// 16. LOCAL MASK ADJUSTMENTS`,
    `// 15.5 Camera Calibration (Shadows Tint, RGB Primaries)
  if (abs(u_calibShadowsTint) > 0.01 || length(u_calibRed) > 0.01 || length(u_calibGreen) > 0.01 || length(u_calibBlue) > 0.01) {
    if (abs(u_calibShadowsTint) > 0.01) {
      float shadowFactor = smoothstep(0.5, 0.0, getLuminance(color));
      color.g -= u_calibShadowsTint * 0.003 * shadowFactor;
      color.r += u_calibShadowsTint * 0.0015 * shadowFactor;
      color.b += u_calibShadowsTint * 0.0015 * shadowFactor;
    }
    if (abs(u_calibRed.x) > 0.01 || abs(u_calibRed.y) > 0.01) {
      float rWeight = smoothstep(0.1, 0.6, color.r - max(color.g, color.b));
      color.r = clamp(color.r * (1.0 + u_calibRed.y * 0.005), 0.0, 1.0);
      color.g += u_calibRed.x * 0.002 * rWeight;
    }
    if (abs(u_calibGreen.x) > 0.01 || abs(u_calibGreen.y) > 0.01) {
      float gWeight = smoothstep(0.1, 0.6, color.g - max(color.r, color.b));
      color.g = clamp(color.g * (1.0 + u_calibGreen.y * 0.005), 0.0, 1.0);
      color.b += u_calibGreen.x * 0.002 * gWeight;
    }
    if (abs(u_calibBlue.x) > 0.01 || abs(u_calibBlue.y) > 0.01) {
      float bWeight = smoothstep(0.1, 0.6, color.b - max(color.r, color.g));
      color.b = clamp(color.b * (1.0 + u_calibBlue.y * 0.005), 0.0, 1.0);
      color.r += u_calibBlue.x * 0.002 * bWeight;
    }
    color = clamp(color, 0.0, 1.0);
  }

  // 16. LOCAL MASK ADJUSTMENTS`
  );
  fs.writeFileSync(path.resolve('src/engine/gl/Shaders.ts'), shaderCode, 'utf8');
}

// 3. Update Pipeline.ts for calibration uniform caching and upload
let pipeCode = fs.readFileSync(path.resolve('src/engine/gl/Pipeline.ts'), 'utf8');
if (!pipeCode.includes('u_calibRed')) {
  pipeCode = pipeCode.replace(
    `'u_grainAmount', 'u_grainTime', 'u_distortion', 'u_caAmount',`,
    `'u_grainAmount', 'u_grainTime', 'u_distortion', 'u_caAmount',
      'u_calibShadowsTint', 'u_calibRed', 'u_calibGreen', 'u_calibBlue',`
  ).replace(
    `const opt = state.optics;`,
    `const cal = state.calibration || { shadowsTint: 0, redHue: 0, redSaturation: 0, greenHue: 0, greenSaturation: 0, blueHue: 0, blueSaturation: 0 };
    gl.uniform1f(this.uniformLocations['u_calibShadowsTint'], cal.shadowsTint);
    gl.uniform2f(this.uniformLocations['u_calibRed'], cal.redHue, cal.redSaturation);
    gl.uniform2f(this.uniformLocations['u_calibGreen'], cal.greenHue, cal.greenSaturation);
    gl.uniform2f(this.uniformLocations['u_calibBlue'], cal.blueHue, cal.blueSaturation);

    const opt = state.optics;`
  );
  fs.writeFileSync(path.resolve('src/engine/gl/Pipeline.ts'), pipeCode, 'utf8');
}

// 4. Update editStore.ts with updateCalibration action
let editCode = fs.readFileSync(path.resolve('src/state/editStore.ts'), 'utf8');
if (!editCode.includes('updateCalibration')) {
  editCode = editCode.replace(
    `updateGeometry: (updates: Partial<DevelopState['geometry']>, recordHistory?: boolean) => void;`,
    `updateGeometry: (updates: Partial<DevelopState['geometry']>, recordHistory?: boolean) => void;
  updateCalibration: (updates: Partial<DevelopState['calibration']>, recordHistory?: boolean) => void;`
  ).replace(
    `updateGeometry: (updates, recordHistory = false) => {`,
    `updateCalibration: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      calibration: { ...developState.calibration, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Calibration');
  },

  updateGeometry: (updates, recordHistory = false) => {`
  );
  fs.writeFileSync(path.resolve('src/state/editStore.ts'), editCode, 'utf8');
}

console.log('Camera Calibration and adjustments schemas updated.');
