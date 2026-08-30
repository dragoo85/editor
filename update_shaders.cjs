const fs = require('fs');
const path = require('path');

const shaderPath = path.resolve('src/engine/gl/Shaders.ts');
const pipelinePath = path.resolve('src/engine/gl/Pipeline.ts');

const shaderContent = `export const VERTEX_SHADER_SRC = \`#version 300 es
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

// HSL Adjustments (8 bands)
uniform vec3 u_hsl[8];

// Color Grading
uniform vec3 u_cgShadows;
uniform vec3 u_cgMidtones;
uniform vec3 u_cgHighlights;
uniform float u_cgBlending;
uniform float u_cgBalance;

// Detail & Optics
uniform float u_sharpenAmount;
uniform float u_sharpenRadius;
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteFeather;
uniform float u_grainAmount;
uniform float u_grainTime;
uniform float u_distortion;
uniform float u_caAmount;

// Mask Overlay Toggle
uniform int u_showMaskOverlay;
uniform vec3 u_maskOverlayColor;

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

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + u_grainTime) * 43758.5453);
}

vec2 distortCoords(vec2 uv, float k) {
  vec2 coord = (uv - 0.5) * 2.0;
  float r2 = dot(coord, coord);
  vec2 distorted = coord * (1.0 + k * r2);
  return distorted * 0.5 + 0.5;
}

vec2 lutCoord(float val) {
  return vec2((clamp(val, 0.0, 1.0) * 255.0 + 0.5) / 256.0, 0.5);
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

  // 2. Base Sample with CA Fringe Offset
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
  if (abs(u_wbMultiplier.r - 1.0) > 0.001 || abs(u_wbMultiplier.g - 1.0) > 0.001 || abs(u_wbMultiplier.b - 1.0) > 0.001) {
    color *= u_wbMultiplier;
  }
  if (abs(u_tint) > 0.01) {
    float tintVal = u_tint * 0.003;
    color.g -= tintVal;
    color.r += tintVal * 0.5;
    color.b += tintVal * 0.5;
  }
  color = clamp(color, 0.0, 1.0);

  // 4. Exposure (Accurate Photographic EV scale)
  if (abs(u_exposure) > 0.001) {
    color *= pow(2.0, u_exposure);
  }

  // 5. Dehaze
  if (abs(u_dehaze) > 0.01) {
    float d = u_dehaze * 0.01;
    color = clamp((color - d * 0.15) / max(vec3(0.01), 1.0 - d * 0.15), 0.0, 1.0);
  }

  // 6. Highlights, Shadows, Whites, Blacks
  float luma = getLuminance(color);
  if (abs(u_shadows) > 0.01) {
    float shadowWeight = smoothstep(0.5, 0.0, luma);
    color += color * (u_shadows * 0.006 * shadowWeight);
  }
  if (abs(u_highlights) > 0.01) {
    float highlightWeight = smoothstep(0.5, 1.0, luma);
    color += (1.0 - color) * (u_highlights * 0.006 * highlightWeight);
  }
  if (abs(u_whites) > 0.01) {
    float whiteWeight = smoothstep(0.75, 1.0, luma);
    color += color * (u_whites * 0.004 * whiteWeight);
  }
  if (abs(u_blacks) > 0.01) {
    float blackWeight = smoothstep(0.25, 0.0, luma);
    color += color * (u_blacks * 0.004 * blackWeight);
  }
  color = clamp(color, 0.0, 1.0);

  // 7. Contrast
  if (abs(u_contrast) > 0.01) {
    float c = (u_contrast / 100.0) + 1.0;
    color = clamp((color - 0.5) * c + 0.5, 0.0, 1.0);
  }

  // 8. Clarity & Texture
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
    color += highPass * (u_clarity * 0.008 * midWeight + u_texture * 0.006);
    color = clamp(color, 0.0, 1.0);
  }

  // 9. Spline Tone Curves
  color.r = texture(u_curveRed, lutCoord(color.r)).r;
  color.g = texture(u_curveGreen, lutCoord(color.g)).r;
  color.b = texture(u_curveBlue, lutCoord(color.b)).r;

  color.r = texture(u_curveRgb, lutCoord(color.r)).r;
  color.g = texture(u_curveRgb, lutCoord(color.g)).r;
  color.b = texture(u_curveRgb, lutCoord(color.b)).r;

  // 10. HSL 8-Band Mixer
  vec3 hsv = rgb2hsv(color);
  float hueDeg = hsv.x * 360.0;
  
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

  if (abs(hslDelta.x) > 0.001 || abs(hslDelta.y) > 0.001 || abs(hslDelta.z) > 0.001) {
    hsv.x = fract((hsv.x * 360.0 + hslDelta.x) / 360.0);
    hsv.y = clamp(hsv.y * (1.0 + hslDelta.y * 0.01), 0.0, 1.0);
    hsv.z = clamp(hsv.z * (1.0 + hslDelta.z * 0.01), 0.0, 1.0);
    color = hsv2rgb(hsv);
  }

  // 11. Vibrance & Saturation
  if (abs(u_vibrance) > 0.01 || abs(u_saturation) > 0.01) {
    float curLuma = getLuminance(color);
    vec3 gray = vec3(curLuma);
    
    if (abs(u_saturation) > 0.01) {
      float satMult = 1.0 + (u_saturation * 0.01);
      color = mix(gray, color, satMult);
    }
    if (abs(u_vibrance) > 0.01) {
      float sat = rgb2hsv(color).y;
      float vibMult = 1.0 + (u_vibrance * 0.01 * (1.0 - sat));
      color = mix(gray, color, vibMult);
    }
    color = clamp(color, 0.0, 1.0);
  }

  // 12. 3-Way Color Grading
  if (length(u_cgShadows) > 0.001 || length(u_cgMidtones) > 0.001 || length(u_cgHighlights) > 0.001) {
    float gradeLuma = getLuminance(color);
    float shadowMask = smoothstep(0.5 + u_cgBalance * 0.2, 0.0, gradeLuma);
    float highlightMask = smoothstep(0.5 + u_cgBalance * 0.2, 1.0, gradeLuma);
    float midtoneMask = clamp(1.0 - shadowMask - highlightMask, 0.0, 1.0);

    color += u_cgShadows * shadowMask * u_cgBlending;
    color += u_cgMidtones * midtoneMask * u_cgBlending;
    color += u_cgHighlights * highlightMask * u_cgBlending;
    color = clamp(color, 0.0, 1.0);
  }

  // 13. Sharpening
  if (u_sharpenAmount > 0.01) {
    vec2 p = (u_sharpenRadius / u_resolution);
    vec3 cN = texture(u_image, uv + vec2(0.0, p.y)).rgb;
    vec3 cS = texture(u_image, uv - vec2(0.0, p.y)).rgb;
    vec3 cE = texture(u_image, uv + vec2(p.x, 0.0)).rgb;
    vec3 cW = texture(u_image, uv - vec2(p.x, 0.0)).rgb;
    vec3 sharp = color * 5.0 - (cN + cS + cE + cW);
    color = mix(color, sharp, u_sharpenAmount * 0.004);
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

  // 16. Mask layer & Rubylith overlay
  vec4 maskVal = texture(u_maskTexture, uv);
  if (u_showMaskOverlay == 1 && maskVal.r > 0.01) {
    color = mix(color, u_maskOverlayColor, maskVal.r * 0.45);
  }

  outColor = vec4(color, 1.0);
}
\`;
`;

fs.writeFileSync(shaderPath, shaderContent.trimStart(), 'utf8');

const pipelineContent = `import { VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC } from './Shaders';
import { DevelopState, ColorGradingWheel } from '../../types/adjustments';
import { MonotoneCubicSpline } from '../math/Spline';
import { kelvinToRGB, hsvToRgb } from '../math/ColorSpaces';
import { MaskRenderer } from './MaskRenderer';

export class RenderPipeline {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private quadVao: WebGLVertexArrayObject;
  private imageTexture: WebGLTexture;
  private curveRgbTexture: WebGLTexture;
  private curveRedTexture: WebGLTexture;
  private curveGreenTexture: WebGLTexture;
  private curveBlueTexture: WebGLTexture;
  private maskTexture: WebGLTexture;
  private maskRenderer: MaskRenderer;

  private uniformLocations: Record<string, WebGLUniformLocation> = {};

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this environment.');
    }
    this.gl = gl;

    gl.getExtension('EXT_color_buffer_float');

    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    this.program = this.createProgram(vertShader, fragShader);

    this.quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    const positions = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
      -1,  1,  0, 0,
       1, -1,  1, 1,
       1,  1,  1, 0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    const aTex = gl.getAttribLocation(this.program, 'a_texCoord');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    this.imageTexture = this.create2DTexture();
    this.curveRgbTexture = this.create1DLUTTexture();
    this.curveRedTexture = this.create1DLUTTexture();
    this.curveGreenTexture = this.create1DLUTTexture();
    this.curveBlueTexture = this.create1DLUTTexture();
    this.maskTexture = this.create2DTexture();

    this.maskRenderer = new MaskRenderer(canvas.width, canvas.height);

    this.cacheUniformLocations();
  }

  private compileShader(type: number, src: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('Shader compilation error: ' + info);
    }
    return shader;
  }

  private createProgram(vert: WebGLShader, frag: WebGLShader): WebGLProgram {
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vert);
    this.gl.attachShader(prog, frag);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(prog);
      this.gl.deleteProgram(prog);
      throw new Error('Program linking error: ' + info);
    }
    return prog;
  }

  private create2DTexture(): WebGLTexture {
    const tex = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    return tex;
  }

  private create1DLUTTexture(): WebGLTexture {
    const tex = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    const identity = new Uint8Array(256);
    for (let i = 0; i < 256; i++) identity[i] = i;
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.R8, 256, 1, 0,
      this.gl.RED, this.gl.UNSIGNED_BYTE, identity
    );
    return tex;
  }

  private cacheUniformLocations() {
    const names = [
      'u_image', 'u_curveRgb', 'u_curveRed', 'u_curveGreen', 'u_curveBlue', 'u_maskTexture',
      'u_resolution', 'u_exposure', 'u_contrast', 'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
      'u_wbMultiplier', 'u_tint', 'u_vibrance', 'u_saturation', 'u_texture', 'u_clarity', 'u_dehaze',
      'u_cgShadows', 'u_cgMidtones', 'u_cgHighlights', 'u_cgBlending', 'u_cgBalance',
      'u_sharpenAmount', 'u_sharpenRadius', 'u_vignetteAmount', 'u_vignetteMidpoint', 'u_vignetteFeather',
      'u_grainAmount', 'u_grainTime', 'u_distortion', 'u_caAmount', 'u_showMaskOverlay', 'u_maskOverlayColor'
    ];

    for (const name of names) {
      const loc = this.gl.getUniformLocation(this.program, name);
      if (loc) this.uniformLocations[name] = loc;
    }

    for (let i = 0; i < 8; i++) {
      const key = 'u_hsl[' + i + ']';
      const loc = this.gl.getUniformLocation(this.program, key);
      if (loc) this.uniformLocations[key] = loc;
    }
  }

  public setImageSource(source: TexImageSource, width: number, height: number) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
    this.maskRenderer.setSize(width, height);
  }

  private updateLUT(tex: WebGLTexture, lut: Uint8Array) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.R8, 256, 1, 0,
      this.gl.RED, this.gl.UNSIGNED_BYTE, lut
    );
  }

  private computeColorGradeVector(wheel: ColorGradingWheel): [number, number, number] {
    if (wheel.saturation === 0 && wheel.luminance === 0) {
      return [0, 0, 0];
    }
    const [r, g, b] = hsvToRgb(wheel.hue, wheel.saturation, 100);
    const sat = wheel.saturation / 100;
    const tintR = (r - 0.5) * 2 * sat;
    const tintG = (g - 0.5) * 2 * sat;
    const tintB = (b - 0.5) * 2 * sat;
    const luma = (wheel.luminance / 100) * 0.3;
    return [tintR * 0.3 + luma, tintG * 0.3 + luma, tintB * 0.3 + luma];
  }

  public render(
    state: DevelopState,
    canvasWidth: number,
    canvasHeight: number,
    showMaskOverlay = false,
    maskOverlayColor: [number, number, number] = [0.9, 0.2, 0.2]
  ) {
    const gl = this.gl;
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0.05, 0.05, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVao);

    // 1. Upload Spline Curve LUTs
    const rgbSpline = new MonotoneCubicSpline(state.curve.rgb);
    const redSpline = new MonotoneCubicSpline(state.curve.red);
    const greenSpline = new MonotoneCubicSpline(state.curve.green);
    const blueSpline = new MonotoneCubicSpline(state.curve.blue);

    this.updateLUT(this.curveRgbTexture, rgbSpline.generateLUT());
    this.updateLUT(this.curveRedTexture, redSpline.generateLUT());
    this.updateLUT(this.curveGreenTexture, greenSpline.generateLUT());
    this.updateLUT(this.curveBlueTexture, blueSpline.generateLUT());

    // 2. Render Masks to Mask Texture
    if (state.masks.length > 0) {
      this.maskRenderer.renderMasks(state.masks);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        this.maskRenderer.getCanvas()
      );
    }

    // 3. Bind Textures to Units
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.uniformLocations['u_image'], 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveRgbTexture);
    gl.uniform1i(this.uniformLocations['u_curveRgb'], 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.curveRedTexture);
    gl.uniform1i(this.uniformLocations['u_curveRed'], 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.curveGreenTexture);
    gl.uniform1i(this.uniformLocations['u_curveGreen'], 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.curveBlueTexture);
    gl.uniform1i(this.uniformLocations['u_curveBlue'], 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.uniform1i(this.uniformLocations['u_maskTexture'], 5);

    // 4. Uniforms
    gl.uniform2f(this.uniformLocations['u_resolution'], canvasWidth, canvasHeight);

    const tone = state.tone;
    gl.uniform1f(this.uniformLocations['u_exposure'], tone.exposure);
    gl.uniform1f(this.uniformLocations['u_contrast'], tone.contrast);
    gl.uniform1f(this.uniformLocations['u_highlights'], tone.highlights);
    gl.uniform1f(this.uniformLocations['u_shadows'], tone.shadows);
    gl.uniform1f(this.uniformLocations['u_whites'], tone.whites);
    gl.uniform1f(this.uniformLocations['u_blacks'], tone.blacks);

    const [wbR, wbG, wbB] = kelvinToRGB(tone.temperature);
    gl.uniform3f(this.uniformLocations['u_wbMultiplier'], wbR, wbG, wbB);
    gl.uniform1f(this.uniformLocations['u_tint'], tone.tint);
    gl.uniform1f(this.uniformLocations['u_vibrance'], tone.vibrance);
    gl.uniform1f(this.uniformLocations['u_saturation'], tone.saturation);
    gl.uniform1f(this.uniformLocations['u_texture'], tone.texture);
    gl.uniform1f(this.uniformLocations['u_clarity'], tone.clarity);
    gl.uniform1f(this.uniformLocations['u_dehaze'], tone.dehaze);

    const hslBands = [
      state.hsl.red, state.hsl.orange, state.hsl.yellow, state.hsl.green,
      state.hsl.aqua, state.hsl.blue, state.hsl.purple, state.hsl.magenta
    ];
    for (let i = 0; i < 8; i++) {
      const key = 'u_hsl[' + i + ']';
      const loc = this.uniformLocations[key];
      if (loc) {
        gl.uniform3f(loc, hslBands[i].hue, hslBands[i].saturation, hslBands[i].luminance);
      }
    }

    const cg = state.colorGrading;
    const cgShadows = this.computeColorGradeVector(cg.shadows);
    const cgMidtones = this.computeColorGradeVector(cg.midtones);
    const cgHighlights = this.computeColorGradeVector(cg.highlights);

    gl.uniform3f(this.uniformLocations['u_cgShadows'], cgShadows[0], cgShadows[1], cgShadows[2]);
    gl.uniform3f(this.uniformLocations['u_cgMidtones'], cgMidtones[0], cgMidtones[1], cgMidtones[2]);
    gl.uniform3f(this.uniformLocations['u_cgHighlights'], cgHighlights[0], cgHighlights[1], cgHighlights[2]);
    gl.uniform1f(this.uniformLocations['u_cgBlending'], cg.blending * 0.01);
    gl.uniform1f(this.uniformLocations['u_cgBalance'], cg.balance * 0.01);

    const det = state.detail;
    gl.uniform1f(this.uniformLocations['u_sharpenAmount'], det.sharpenAmount);
    gl.uniform1f(this.uniformLocations['u_sharpenRadius'], det.sharpenRadius);
    gl.uniform1f(this.uniformLocations['u_vignetteAmount'], det.vignetteAmount);
    gl.uniform1f(this.uniformLocations['u_vignetteMidpoint'], det.vignetteMidpoint);
    gl.uniform1f(this.uniformLocations['u_vignetteFeather'], det.vignetteFeather);
    gl.uniform1f(this.uniformLocations['u_grainAmount'], det.grainAmount);
    gl.uniform1f(this.uniformLocations['u_grainTime'], Math.random());

    const opt = state.optics;
    gl.uniform1f(this.uniformLocations['u_distortion'], opt.distortion);
    gl.uniform1f(this.uniformLocations['u_caAmount'], opt.chromaticAberration);

    gl.uniform1i(this.uniformLocations['u_showMaskOverlay'], showMaskOverlay ? 1 : 0);
    gl.uniform3f(this.uniformLocations['u_maskOverlayColor'], maskOverlayColor[0], maskOverlayColor[1], maskOverlayColor[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
`;

fs.writeFileSync(pipelinePath, pipelineContent.trimStart(), 'utf8');

console.log('Shaders & Pipeline updated with accurate exposure and zero-bias grading.');
