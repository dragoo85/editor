const fs = require('fs');
const path = require('path');
const full = path.resolve('src/engine/gl/Pipeline.ts');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import { VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC } from './Shaders';
import { DevelopState } from '../../types/adjustments';
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
    const [cgSR, cgSG, cgSB] = hsvToRgb(cg.shadows.hue, cg.shadows.saturation, 100);
    const [cgMR, cgMG, cgMB] = hsvToRgb(cg.midtones.hue, cg.midtones.saturation, 100);
    const [cgHR, cgHG, cgHB] = hsvToRgb(cg.highlights.hue, cg.highlights.saturation, 100);

    gl.uniform3f(this.uniformLocations['u_cgShadows'], (cgSR - 0.5) * 2, (cgSG - 0.5) * 2, (cgSB - 0.5) * 2);
    gl.uniform3f(this.uniformLocations['u_cgMidtones'], (cgMR - 0.5) * 2, (cgMG - 0.5) * 2, (cgMB - 0.5) * 2);
    gl.uniform3f(this.uniformLocations['u_cgHighlights'], (cgHR - 0.5) * 2, (cgHG - 0.5) * 2, (cgHB - 0.5) * 2);
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

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved Pipeline.ts');
