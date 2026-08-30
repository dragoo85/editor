import { VERTEX_SHADER_SRC, GLOBAL_FRAG_SRC, MASK_ADJUST_FRAG_SRC, BLIT_OVERLAY_FRAG_SRC } from './Shaders';
import { DevelopState, ColorGradingWheel } from '../../types/adjustments';
import { MaskGroup, MaskOverlayConfig, OverlayMode } from '../../types/masks';
import { HealOperation, HealEngine } from '../healing/HealEngine';
import { RemovalOperation, RemovalEngine } from '../removal/RemovalEngine';
import { MonotoneCubicSpline } from '../math/Spline';
import { kelvinToRGB, hsvToRgb } from '../math/ColorSpaces';
import { MaskRenderer } from './MaskRenderer';

export class RenderPipeline {
  private gl: WebGL2RenderingContext;
  private quadVao: WebGLVertexArrayObject;

  // Shader Programs
  private globalProg: WebGLProgram;
  private maskProg: WebGLProgram;
  private blitProg: WebGLProgram;

  // Textures
  private imageTexture: WebGLTexture;
  private lastImageSource: TexImageSource | null = null;
  private curveRgbTexture: WebGLTexture;
  private curveRedTexture: WebGLTexture;
  private curveGreenTexture: WebGLTexture;
  private curveBlueTexture: WebGLTexture;
  private blankMaskTexture: WebGLTexture;

  // GPU Mask Texture Cache: groupId -> { hash, texture }
  private maskTextureCache = new Map<string, { hash: string; texture: WebGLTexture }>();

  // Ping-Pong Framebuffers & Textures for Multi-Mask Compositing
  private fboA: WebGLFramebuffer;
  private fboB: WebGLFramebuffer;
  private fboTexA: WebGLTexture;
  private fboTexB: WebGLTexture;
  private fboWidth: number = 0;
  private fboHeight: number = 0;

  private maskRenderer: MaskRenderer;
  private imageSource: TexImageSource | null = null;
  private imgWidth: number = 1;
  private imgHeight: number = 1;

  // Uniform Caches
  private globalUniforms: Record<string, WebGLUniformLocation> = {};
  private maskUniforms: Record<string, WebGLUniformLocation> = {};
  private blitUniforms: Record<string, WebGLUniformLocation> = {};

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

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.getExtension('EXT_color_buffer_float');

    // Compile Programs
    this.globalProg = this.createProgram(VERTEX_SHADER_SRC, GLOBAL_FRAG_SRC);
    this.maskProg = this.createProgram(VERTEX_SHADER_SRC, MASK_ADJUST_FRAG_SRC);
    this.blitProg = this.createProgram(VERTEX_SHADER_SRC, BLIT_OVERLAY_FRAG_SRC);

    // Quad VAO
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

    // Enable attributes for all programs
    [this.globalProg, this.maskProg, this.blitProg].forEach((prog) => {
      const aPos = gl.getAttribLocation(prog, 'a_position');
      const aTex = gl.getAttribLocation(prog, 'a_texCoord');
      if (aPos >= 0) {
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      }
      if (aTex >= 0) {
        gl.enableVertexAttribArray(aTex);
        gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);
      }
    });

    // Create Textures
    this.imageTexture = this.create2DTexture();
    this.curveRgbTexture = this.create1DLUTTexture();
    this.curveRedTexture = this.create1DLUTTexture();
    this.curveGreenTexture = this.create1DLUTTexture();
    this.curveBlueTexture = this.create1DLUTTexture();
    this.blankMaskTexture = this.create2DTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.blankMaskTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    // Ping-Pong FBOs
    this.fboA = gl.createFramebuffer()!;
    this.fboB = gl.createFramebuffer()!;
    this.fboTexA = this.create2DTexture();
    this.fboTexB = this.create2DTexture();

    this.maskRenderer = new MaskRenderer(canvas.width || 800, canvas.height || 600);

    this.cacheUniforms();
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

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const vert = this.compileShader(this.gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(this.gl.FRAGMENT_SHADER, fragSrc);
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

  private ensureFBOs(width: number, height: number) {
    if (this.fboWidth === width && this.fboHeight === height && this.fboWidth > 0) return;
    const gl = this.gl;
    this.fboWidth = width;
    this.fboHeight = height;

    // Setup FBO A
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexA, 0);

    // Setup FBO B
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexB, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private cacheUniforms() {
    const gl = this.gl;

    // 1. Global uniforms
    const gNames = [
      'u_image', 'u_curveRgb', 'u_curveRed', 'u_curveGreen', 'u_curveBlue',
      'u_resolution', 'u_exposure', 'u_contrast', 'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
      'u_wbMultiplier', 'u_tint', 'u_vibrance', 'u_saturation', 'u_texture', 'u_clarity', 'u_dehaze',
      'u_cgShadows', 'u_cgMidtones', 'u_cgHighlights', 'u_cgBlending', 'u_cgBalance',
      'u_calibShadowsTint', 'u_calibRed', 'u_calibGreen', 'u_calibBlue',
      'u_sharpenAmount', 'u_sharpenRadius', 'u_vignetteAmount', 'u_vignetteMidpoint', 'u_vignetteFeather',
      'u_grainAmount', 'u_grainTime', 'u_distortion', 'u_caAmount'
    ];
    for (const n of gNames) {
      const loc = gl.getUniformLocation(this.globalProg, n);
      if (loc) this.globalUniforms[n] = loc;
    }
    for (let i = 0; i < 8; i++) {
      const key = 'u_hsl[' + i + ']';
      const loc = gl.getUniformLocation(this.globalProg, key);
      if (loc) this.globalUniforms[key] = loc;
    }

    // 2. Mask Adjust uniforms
    const mNames = [
      'u_source', 'u_mask', 'u_resolution',
      'u_maskExposure', 'u_maskContrast', 'u_maskHighlights', 'u_maskShadows', 'u_maskWhites', 'u_maskBlacks',
      'u_maskTemp', 'u_maskTint', 'u_maskVibrance', 'u_maskSaturation',
      'u_maskTextureVal', 'u_maskClarity', 'u_maskDehaze', 'u_maskSharpness'
    ];
    for (const n of mNames) {
      const loc = gl.getUniformLocation(this.maskProg, n);
      if (loc) this.maskUniforms[n] = loc;
    }

    // 3. Blit / Overlay uniforms
    const bNames = [
      'u_source', 'u_mask', 'u_resolution',
      'u_showOverlay', 'u_overlayMode', 'u_overlayColor', 'u_overlayOpacity'
    ];
    for (const n of bNames) {
      const loc = gl.getUniformLocation(this.blitProg, n);
      if (loc) this.blitUniforms[n] = loc;
    }
  }

  public setImageSource(source: TexImageSource, width: number, height: number) {
    if (!source) return;
    if (this.lastImageSource === source && this.imgWidth === width && this.imgHeight === height) {
      return; // 0 ms instant skip for unchanged image
    }

    this.lastImageSource = source;
    this.imageSource = source;
    this.imgWidth = Math.max(1, width);
    this.imgHeight = Math.max(1, height);

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
    this.maskRenderer.setSize(this.imgWidth, this.imgHeight);
    this.maskTextureCache.clear();
  }

  private getOrUploadMaskTexture(group: MaskGroup): WebGLTexture {
    const hash = `${group.id}_${group.enabled}_${group.inverted}_${group.opacity}_${this.imgWidth}x${this.imgHeight}_${group.components.length}_` +
      group.components.map(c => `${c.id}_${c.enabled}_${c.inverted}_${c.density}_${c.feather}_${c.combineMode}_${c.strokes?.length || 0}`).join('|');

    const cached = this.maskTextureCache.get(group.id);
    if (cached && cached.hash === hash) {
      return cached.texture;
    }

    const maskCanvas = this.maskRenderer.renderActiveMask(group, this.imageSource || undefined);
    let tex = cached?.texture;
    if (!tex) {
      tex = this.create2DTexture();
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, maskCanvas);
    this.maskTextureCache.set(group.id, { hash, texture: tex });

    return tex;
  }

  private updateLUT(tex: WebGLTexture, lut: Uint8Array) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D, 0, 0, 0, 256, 1,
      this.gl.RED, this.gl.UNSIGNED_BYTE, lut
    );
  }

  private computeColorGradeVector(wheel: ColorGradingWheel): [number, number, number] {
    if (wheel.saturation === 0 && wheel.luminance === 0) return [0, 0, 0];
    const [r, g, b] = hsvToRgb(wheel.hue, wheel.saturation, 100);
    const sat = wheel.saturation / 100;
    const tintR = (r - 0.5) * 2 * sat;
    const tintG = (g - 0.5) * 2 * sat;
    const tintB = (b - 0.5) * 2 * sat;
    const luma = (wheel.luminance / 100) * 0.3;
    return [tintR * 0.3 + luma, tintG * 0.3 + luma, tintB * 0.3 + luma];
  }

  private hasAdjustments(group: MaskGroup): boolean {
    const a = group.adjustments;
    if (!a) return false;
    return (
      Math.abs(a.exposure) > 0.001 ||
      Math.abs(a.contrast) > 0.001 ||
      Math.abs(a.highlights) > 0.001 ||
      Math.abs(a.shadows) > 0.001 ||
      Math.abs(a.whites) > 0.001 ||
      Math.abs(a.blacks) > 0.001 ||
      Math.abs(a.temperature) > 0.001 ||
      Math.abs(a.tint) > 0.001 ||
      Math.abs(a.vibrance) > 0.001 ||
      Math.abs(a.saturation) > 0.001 ||
      Math.abs(a.texture) > 0.001 ||
      Math.abs(a.clarity) > 0.001 ||
      Math.abs(a.dehaze) > 0.001 ||
      Math.abs(a.sharpness) > 0.001
    );
  }

  /**
   * Sub-Millisecond Rendering Pipeline
   * Composites Global Adjustments -> Masked Adjustments -> Blit with Overlay to Canvas.
   */
  public render(
    state: DevelopState,
    canvasWidth: number,
    canvasHeight: number,
    activeMaskGroupId: string | null = null,
    overlayConfig: MaskOverlayConfig = {
      showOverlay: false,
      overlayMode: 'color',
      overlayColor: [0.95, 0.2, 0.2],
      overlayOpacity: 50
    },
    healOperations: HealOperation[] = [],
    removalOperations: RemovalOperation[] = []
  ) {
    const gl = this.gl;
    const cw = Math.max(1, canvasWidth);
    const ch = Math.max(1, canvasHeight);

    const enabledMasks = (state.masks || []).filter(m => m.enabled && m.components.length > 0);
    const hasMaskAdjustments = enabledMasks.some(m => this.hasAdjustments(m));
    const activeGroup = (state.masks || []).find(m => m.id === activeMaskGroupId) || null;
    const isShowingOverlay = overlayConfig.showOverlay && activeGroup && activeGroup.enabled && activeGroup.components.length > 0;

    gl.bindVertexArray(this.quadVao);

    // =========================================================================
    // PASS 1: GLOBAL DEVELOP ADJUSTMENTS
    // =========================================================================
    const renderTarget = (hasMaskAdjustments || isShowingOverlay) ? this.fboA : null;
    if (renderTarget) {
      this.ensureFBOs(cw, ch);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, cw, ch);
    gl.useProgram(this.globalProg);

    // Spline LUTs
    const rgbSpline = new MonotoneCubicSpline(state.curve.rgb);
    const redSpline = new MonotoneCubicSpline(state.curve.red);
    const greenSpline = new MonotoneCubicSpline(state.curve.green);
    const blueSpline = new MonotoneCubicSpline(state.curve.blue);

    this.updateLUT(this.curveRgbTexture, rgbSpline.generateLUT());
    this.updateLUT(this.curveRedTexture, redSpline.generateLUT());
    this.updateLUT(this.curveGreenTexture, greenSpline.generateLUT());
    this.updateLUT(this.curveBlueTexture, blueSpline.generateLUT());

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.globalUniforms['u_image'], 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveRgbTexture);
    gl.uniform1i(this.globalUniforms['u_curveRgb'], 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.curveRedTexture);
    gl.uniform1i(this.globalUniforms['u_curveRed'], 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.curveGreenTexture);
    gl.uniform1i(this.globalUniforms['u_curveGreen'], 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.curveBlueTexture);
    gl.uniform1i(this.globalUniforms['u_curveBlue'], 4);

    gl.uniform2f(this.globalUniforms['u_resolution'], cw, ch);

    const tone = state.tone;
    gl.uniform1f(this.globalUniforms['u_exposure'], tone.exposure);
    gl.uniform1f(this.globalUniforms['u_contrast'], tone.contrast);
    gl.uniform1f(this.globalUniforms['u_highlights'], tone.highlights);
    gl.uniform1f(this.globalUniforms['u_shadows'], tone.shadows);
    gl.uniform1f(this.globalUniforms['u_whites'], tone.whites);
    gl.uniform1f(this.globalUniforms['u_blacks'], tone.blacks);

    const [wbR, wbG, wbB] = kelvinToRGB(tone.temperature);
    gl.uniform3f(this.globalUniforms['u_wbMultiplier'], wbR, wbG, wbB);
    gl.uniform1f(this.globalUniforms['u_tint'], tone.tint);
    gl.uniform1f(this.globalUniforms['u_vibrance'], tone.vibrance);
    gl.uniform1f(this.globalUniforms['u_saturation'], tone.saturation);
    gl.uniform1f(this.globalUniforms['u_texture'], tone.texture);
    gl.uniform1f(this.globalUniforms['u_clarity'], tone.clarity);
    gl.uniform1f(this.globalUniforms['u_dehaze'], tone.dehaze);

    const hslBands = [
      state.hsl.red, state.hsl.orange, state.hsl.yellow, state.hsl.green,
      state.hsl.aqua, state.hsl.blue, state.hsl.purple, state.hsl.magenta
    ];
    for (let i = 0; i < 8; i++) {
      const key = 'u_hsl[' + i + ']';
      const loc = this.globalUniforms[key];
      if (loc) gl.uniform3f(loc, hslBands[i].hue, hslBands[i].saturation, hslBands[i].luminance);
    }

    const cg = state.colorGrading;
    const cgShadows = this.computeColorGradeVector(cg.shadows);
    const cgMidtones = this.computeColorGradeVector(cg.midtones);
    const cgHighlights = this.computeColorGradeVector(cg.highlights);
    gl.uniform3f(this.globalUniforms['u_cgShadows'], cgShadows[0], cgShadows[1], cgShadows[2]);
    gl.uniform3f(this.globalUniforms['u_cgMidtones'], cgMidtones[0], cgMidtones[1], cgMidtones[2]);
    gl.uniform3f(this.globalUniforms['u_cgHighlights'], cgHighlights[0], cgHighlights[1], cgHighlights[2]);
    gl.uniform1f(this.globalUniforms['u_cgBlending'], cg.blending * 0.01);
    gl.uniform1f(this.globalUniforms['u_cgBalance'], cg.balance * 0.01);

    const cal = state.calibration || { shadowsTint: 0, redHue: 0, redSaturation: 0, greenHue: 0, greenSaturation: 0, blueHue: 0, blueSaturation: 0 };
    gl.uniform1f(this.globalUniforms['u_calibShadowsTint'], cal.shadowsTint);
    gl.uniform2f(this.globalUniforms['u_calibRed'], cal.redHue, cal.redSaturation);
    gl.uniform2f(this.globalUniforms['u_calibGreen'], cal.greenHue, cal.greenSaturation);
    gl.uniform2f(this.globalUniforms['u_calibBlue'], cal.blueHue, cal.blueSaturation);

    const det = state.detail;
    gl.uniform1f(this.globalUniforms['u_sharpenAmount'], det.sharpenAmount);
    gl.uniform1f(this.globalUniforms['u_sharpenRadius'], det.sharpenRadius);
    gl.uniform1f(this.globalUniforms['u_vignetteAmount'], det.vignetteAmount);
    gl.uniform1f(this.globalUniforms['u_vignetteMidpoint'], det.vignetteMidpoint);
    gl.uniform1f(this.globalUniforms['u_vignetteFeather'], det.vignetteFeather);
    gl.uniform1f(this.globalUniforms['u_grainAmount'], det.grainAmount);
    gl.uniform1f(this.globalUniforms['u_grainTime'], Math.random());

    const opt = state.optics;
    gl.uniform1f(this.globalUniforms['u_distortion'], opt.distortion);
    gl.uniform1f(this.globalUniforms['u_caAmount'], opt.chromaticAberration);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!renderTarget) return;

    // =========================================================================
    // PASS 2..N: SEQUENTIALLY APPLY EACH ENABLED MASK'S LOCAL ADJUSTMENTS
    // =========================================================================
    let currentSourceTex = this.fboTexA;
    let currentDestFbo = this.fboB;
    let currentDestTex = this.fboTexB;

    for (const maskGroup of enabledMasks) {
      if (!this.hasAdjustments(maskGroup)) continue;

      const maskTex = this.getOrUploadMaskTexture(maskGroup);

      gl.bindFramebuffer(gl.FRAMEBUFFER, currentDestFbo);
      gl.viewport(0, 0, cw, ch);
      gl.useProgram(this.maskProg);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentSourceTex);
      gl.uniform1i(this.maskUniforms['u_source'], 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.uniform1i(this.maskUniforms['u_mask'], 1);

      gl.uniform2f(this.maskUniforms['u_resolution'], cw, ch);

      const ma = maskGroup.adjustments;
      gl.uniform1f(this.maskUniforms['u_maskExposure'], ma.exposure);
      gl.uniform1f(this.maskUniforms['u_maskContrast'], ma.contrast);
      gl.uniform1f(this.maskUniforms['u_maskHighlights'], ma.highlights);
      gl.uniform1f(this.maskUniforms['u_maskShadows'], ma.shadows);
      gl.uniform1f(this.maskUniforms['u_maskWhites'], ma.whites);
      gl.uniform1f(this.maskUniforms['u_maskBlacks'], ma.blacks);
      gl.uniform1f(this.maskUniforms['u_maskTemp'], ma.temperature);
      gl.uniform1f(this.maskUniforms['u_maskTint'], ma.tint);
      gl.uniform1f(this.maskUniforms['u_maskVibrance'], ma.vibrance);
      gl.uniform1f(this.maskUniforms['u_maskSaturation'], ma.saturation);
      gl.uniform1f(this.maskUniforms['u_maskTextureVal'], ma.texture);
      gl.uniform1f(this.maskUniforms['u_maskClarity'], ma.clarity);
      gl.uniform1f(this.maskUniforms['u_maskDehaze'], ma.dehaze);
      gl.uniform1f(this.maskUniforms['u_maskSharpness'], ma.sharpness);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const tempTex = currentSourceTex;
      currentSourceTex = currentDestTex;
      currentDestTex = tempTex;

      currentDestFbo = (currentDestFbo === this.fboA) ? this.fboB : this.fboA;
    }

    // =========================================================================
    // PASS FINAL: BLIT TO CANVAS WITH NON-DESTRUCTIVE ACTIVE OVERLAY
    // =========================================================================
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cw, ch);
    gl.useProgram(this.blitProg);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentSourceTex);
    gl.uniform1i(this.blitUniforms['u_source'], 0);

    const activeMaskTex = (isShowingOverlay && activeGroup)
      ? this.getOrUploadMaskTexture(activeGroup)
      : this.blankMaskTexture;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, activeMaskTex);
    gl.uniform1i(this.blitUniforms['u_mask'], 1);

    gl.uniform2f(this.blitUniforms['u_resolution'], cw, ch);
    gl.uniform1i(this.blitUniforms['u_showOverlay'], isShowingOverlay ? 1 : 0);

    const modeMap: Record<OverlayMode, number> = {
      color: 0,
      grayscale: 1,
      white_on_black: 2,
      black_on_white: 3,
      boundary: 4,
      uncertainty: 5
    };
    gl.uniform1i(this.blitUniforms['u_overlayMode'], modeMap[overlayConfig.overlayMode] ?? 0);
    gl.uniform3f(
      this.blitUniforms['u_overlayColor'],
      overlayConfig.overlayColor[0],
      overlayConfig.overlayColor[1],
      overlayConfig.overlayColor[2]
    );
    gl.uniform1f(this.blitUniforms['u_overlayOpacity'], overlayConfig.overlayOpacity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
