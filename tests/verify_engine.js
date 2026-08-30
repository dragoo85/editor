const assert = require('assert');

// 1. Verify Monotone Cubic Spline (Fritsch-Carlson)
class MonotoneCubicSpline {
  constructor(points) {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const uniquePoints = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i].x !== sorted[i - 1].x) {
        uniquePoints.push(sorted[i]);
      }
    }
    const n = uniquePoints.length;
    this.xs = uniquePoints.map(p => p.x);
    this.ys = uniquePoints.map(p => p.y);

    const deltas = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const dx = this.xs[i + 1] - this.xs[i];
      deltas[i] = dx === 0 ? 0 : (this.ys[i + 1] - this.ys[i]) / dx;
    }

    this.ms = new Array(n);
    this.ms[0] = deltas[0];
    for (let i = 1; i < n - 1; i++) {
      this.ms[i] = (deltas[i - 1] + deltas[i]) * 0.5;
    }
    this.ms[n - 1] = deltas[n - 2];

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

  evaluate(x) {
    const n = this.xs.length;
    if (x <= this.xs[0]) return Math.max(0, Math.min(255, this.ys[0]));
    if (x >= this.xs[n - 1]) return Math.max(0, Math.min(255, this.ys[n - 1]));

    let low = 0;
    let high = n - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.xs[mid] <= x) low = mid + 1;
      else high = mid - 1;
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

  generateLUT() {
    const lut = new Uint8Array(256);
    for (let x = 0; x < 256; x++) lut[x] = Math.round(this.evaluate(x));
    return lut;
  }
}

// Test Spline
console.log('Testing Monotone Cubic Spline...');
const identitySpline = new MonotoneCubicSpline([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
assert.strictEqual(identitySpline.evaluate(0), 0);
assert.strictEqual(identitySpline.evaluate(255), 255);
assert.strictEqual(Math.round(identitySpline.evaluate(128)), 128);

const sCurveSpline = new MonotoneCubicSpline([
  { x: 0, y: 0 },
  { x: 64, y: 40 },
  { x: 192, y: 215 },
  { x: 255, y: 255 }
]);
const lut = sCurveSpline.generateLUT();
assert.strictEqual(lut.length, 256);
assert.strictEqual(lut[0], 0);
assert.strictEqual(lut[255], 255);
assert(lut[64] <= 45, 'Shadows compressed');
assert(lut[192] >= 210, 'Highlights expanded');
console.log('? Monotone Cubic Spline verified successfully.');

// 2. Test Kelvin Color Temp Conversion
function kelvinToRGB(kelvin) {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r = 0, g = 0, b = 0;
  if (temp <= 66) r = 255;
  else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }
  if (temp >= 66) b = 255;
  else if (temp <= 19) b = 0;
  else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }
  return [r, g, b];
}

console.log('Testing Color Temperature...');
const warm = kelvinToRGB(3200); // Tungsten
assert(warm[0] > warm[2], 'Warm temp has more red than blue');
const cool = kelvinToRGB(8000); // Shade
assert(cool[2] >= cool[0], 'Cool temp has more blue than red');
console.log('? Color Temperature math verified successfully.');

console.log('ALL AUTOMATED ENGINE TESTS PASSED!');
