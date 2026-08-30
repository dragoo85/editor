/**
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
