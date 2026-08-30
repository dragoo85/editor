/**
 * WebGL2 Shaders for Multi-Pass Non-Destructive Photo Editing and Masking
 */

export const VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * PASS 1: Global Adjustments Shader
 * Renders White Balance, Tone, Curves, HSL, Color Grading, Calibration, Detail, Vignette, Grain
 */
export const GLOBAL_FRAG_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_curveRgb;
uniform sampler2D u_curveRed;
uniform sampler2D u_curveGreen;
uniform sampler2D u_curveBlue;

uniform vec2 u_resolution;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform vec3 u_wbMultiplier;
uniform float u_tint;
uniform float u_vibrance;
uniform float u_saturation;
uniform float u_texture;
uniform float u_clarity;
uniform float u_dehaze;

uniform vec3 u_hsl[8];
uniform vec3 u_cgShadows;
uniform vec3 u_cgMidtones;
uniform vec3 u_cgHighlights;
uniform float u_cgBlending;
uniform float u_cgBalance;

uniform float u_calibShadowsTint;
uniform vec2 u_calibRed;
uniform vec2 u_calibGreen;
uniform vec2 u_calibBlue;

uniform float u_sharpenAmount;
uniform float u_sharpenRadius;
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteFeather;
uniform float u_grainAmount;
uniform float u_grainTime;
uniform float u_distortion;
uniform float u_caAmount;

float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec2 lutCoord(float val) {
  return vec2((clamp(val, 0.0, 1.0) * 255.0 + 0.5) / 256.0, 0.5);
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

void main() {
  vec2 uv = v_texCoord;

  // Lens Distortion
  if (abs(u_distortion) > 0.001) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    uv = 0.5 + cc * (1.0 + u_distortion * 0.05 * dist);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // Base Image Sample with CA Fringe Offset
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

  // White Balance & Tint
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

  // Exposure
  if (abs(u_exposure) > 0.001) {
    color *= pow(2.0, u_exposure);
  }

  // Dehaze
  if (abs(u_dehaze) > 0.01) {
    float d = u_dehaze * 0.01;
    color = clamp((color - d * 0.15) / max(vec3(0.01), 1.0 - d * 0.15), 0.0, 1.0);
  }

  // Highlights, Shadows, Whites, Blacks
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

  // Contrast
  if (abs(u_contrast) > 0.01) {
    float c = (u_contrast / 100.0) + 1.0;
    color = clamp((color - 0.5) * c + 0.5, 0.0, 1.0);
  }

  // Clarity & Texture
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

  // Spline Tone Curves
  color.r = texture(u_curveRed, lutCoord(color.r)).r;
  color.g = texture(u_curveGreen, lutCoord(color.g)).r;
  color.b = texture(u_curveBlue, lutCoord(color.b)).r;

  color.r = texture(u_curveRgb, lutCoord(color.r)).r;
  color.g = texture(u_curveRgb, lutCoord(color.g)).r;
  color.b = texture(u_curveRgb, lutCoord(color.b)).r;

  // HSL Mixer
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

  // Vibrance & Saturation
  if (abs(u_vibrance) > 0.01 || abs(u_saturation) > 0.01) {
    float curLuma = getLuminance(color);
    vec3 gray = vec3(curLuma);
    if (abs(u_saturation) > 0.01) {
      color = mix(gray, color, 1.0 + (u_saturation * 0.01));
    }
    if (abs(u_vibrance) > 0.01) {
      float sat = rgb2hsv(color).y;
      color = mix(gray, color, 1.0 + (u_vibrance * 0.01 * (1.0 - sat)));
    }
    color = clamp(color, 0.0, 1.0);
  }

  // Color Grading
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

  // Calibration
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
      float bWeight = smoothstep(0.1, 0.6, color.b - max(color.r, color.b));
      color.b = clamp(color.b * (1.0 + u_calibBlue.y * 0.005), 0.0, 1.0);
      color.r += u_calibBlue.x * 0.002 * bWeight;
    }
    color = clamp(color, 0.0, 1.0);
  }

  // Vignette & Grain
  if (abs(u_vignetteAmount) > 0.01) {
    vec2 coord = (uv - 0.5) * 2.0;
    float dist = length(coord);
    float midpoint = u_vignetteMidpoint * 0.01;
    float feather = max(0.01, u_vignetteFeather * 0.01);
    float vignette = smoothstep(midpoint, midpoint + feather, dist);
    color *= 1.0 + (u_vignetteAmount * 0.01 * vignette);
    color = clamp(color, 0.0, 1.0);
  }

  if (u_grainAmount > 0.01) {
    float noise = (rand(uv * u_resolution) - 0.5) * 2.0;
    color += noise * (u_grainAmount * 0.003);
    color = clamp(color, 0.0, 1.0);
  }

  fragColor = vec4(color, 1.0);
}
`;

/**
 * PASS 2: Localized Mask Adjustment Shader
 * Takes source image FBO + mask alpha texture and blends localized edits
 */
export const MASK_ADJUST_FRAG_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_source;
uniform sampler2D u_mask;
uniform vec2 u_resolution;

uniform float u_maskExposure;
uniform float u_maskContrast;
uniform float u_maskHighlights;
uniform float u_maskShadows;
uniform float u_maskWhites;
uniform float u_maskBlacks;
uniform float u_maskTemp;
uniform float u_maskTint;
uniform float u_maskVibrance;
uniform float u_maskSaturation;
uniform float u_maskTextureVal;
uniform float u_maskClarity;
uniform float u_maskDehaze;
uniform float u_maskSharpness;

float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;
  vec3 color = texture(u_source, uv).rgb;
  float maskAlpha = texture(u_mask, uv).r;

  if (maskAlpha > 0.0001) {
    // 1. Local Exposure
    if (abs(u_maskExposure) > 0.001) {
      color = mix(color, color * pow(2.0, u_maskExposure), maskAlpha);
    }

    // 2. Local Contrast
    if (abs(u_maskContrast) > 0.001) {
      float mc = (u_maskContrast / 100.0) + 1.0;
      vec3 contColor = clamp((color - 0.5) * mc + 0.5, 0.0, 1.0);
      color = mix(color, contColor, maskAlpha);
    }

    // 3. Local Temperature & Tint
    if (abs(u_maskTemp) > 0.001 || abs(u_maskTint) > 0.001) {
      vec3 wbShift = color;
      wbShift.r += u_maskTemp * 0.003 + u_maskTint * 0.0015;
      wbShift.b -= u_maskTemp * 0.003;
      wbShift.g -= u_maskTint * 0.003;
      color = mix(color, clamp(wbShift, 0.0, 1.0), maskAlpha);
    }

    // 4. Local Highlights, Shadows, Whites, Blacks
    if (abs(u_maskHighlights) > 0.001 || abs(u_maskShadows) > 0.001 || abs(u_maskWhites) > 0.001 || abs(u_maskBlacks) > 0.001) {
      float mLuma = getLuminance(color);
      float mShadWeight = smoothstep(0.5, 0.0, mLuma);
      float mHiWeight = smoothstep(0.5, 1.0, mLuma);
      float mWhiteWeight = smoothstep(0.75, 1.0, mLuma);
      float mBlackWeight = smoothstep(0.25, 0.0, mLuma);

      vec3 toneShift = color;
      toneShift += color * (u_maskShadows * 0.008 * mShadWeight);
      toneShift += (1.0 - color) * (u_maskHighlights * 0.008 * mHiWeight);
      toneShift += color * (u_maskWhites * 0.005 * mWhiteWeight);
      toneShift += color * (u_maskBlacks * 0.005 * mBlackWeight);
      color = mix(color, clamp(toneShift, 0.0, 1.0), maskAlpha);
    }

    // 5. Local Clarity, Texture & Sharpness
    if (abs(u_maskClarity) > 0.001 || abs(u_maskTextureVal) > 0.001 || abs(u_maskSharpness) > 0.001) {
      vec2 p = (1.5 / u_resolution);
      vec3 sharpPix = color * 5.0 - (
        texture(u_source, uv + vec2(0.0, p.y)).rgb +
        texture(u_source, uv - vec2(0.0, p.y)).rgb +
        texture(u_source, uv + vec2(p.x, 0.0)).rgb +
        texture(u_source, uv - vec2(p.x, 0.0)).rgb
      );
      float microDetail = (u_maskClarity + u_maskTextureVal * 0.8 + u_maskSharpness) * 0.006;
      vec3 sharpColor = mix(color, sharpPix, microDetail);
      color = mix(color, clamp(sharpColor, 0.0, 1.0), maskAlpha);
    }

    // 6. Local Saturation & Vibrance
    if (abs(u_maskSaturation) > 0.001 || abs(u_maskVibrance) > 0.001) {
      float curLuma = getLuminance(color);
      vec3 satColor = mix(vec3(curLuma), color, 1.0 + (u_maskSaturation + u_maskVibrance * 0.8) * 0.01);
      color = mix(color, clamp(satColor, 0.0, 1.0), maskAlpha);
    }

    // 7. Local Dehaze
    if (abs(u_maskDehaze) > 0.001) {
      float md = u_maskDehaze * 0.01;
      vec3 dehazeColor = clamp((color - md * 0.15) / max(vec3(0.01), 1.0 - md * 0.15), 0.0, 1.0);
      color = mix(color, dehazeColor, maskAlpha);
    }
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/**
 * PASS 3: Blit & Overlay Visualization Shader
 */
export const BLIT_OVERLAY_FRAG_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_source;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform bool u_showOverlay;
uniform int u_overlayMode;
uniform vec3 u_overlayColor;
uniform float u_overlayOpacity;

float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;
  vec3 color = texture(u_source, uv).rgb;
  float maskAlpha = texture(u_mask, uv).r;

  if (u_showOverlay && maskAlpha > 0.001) {
    float alphaWeight = maskAlpha * (u_overlayOpacity * 0.01);

    if (u_overlayMode == 0) {
      // Color Overlay (Ruby / Red / Custom)
      color = mix(color, u_overlayColor, alphaWeight * 0.65);
    } else if (u_overlayMode == 1) {
      // Grayscale
      float g = getLuminance(color);
      color = mix(vec3(g), color, 1.0 - alphaWeight);
    } else if (u_overlayMode == 2) {
      // White on Black
      color = vec3(maskAlpha);
    } else if (u_overlayMode == 3) {
      // Black on White
      color = vec3(1.0 - maskAlpha);
    } else if (u_overlayMode == 4) {
      // Neon Outline
      vec2 p = 1.5 / u_resolution;
      float aR = texture(u_mask, uv + vec2(p.x, 0.0)).r;
      float aL = texture(u_mask, uv - vec2(p.x, 0.0)).r;
      float aU = texture(u_mask, uv + vec2(0.0, p.y)).r;
      float aD = texture(u_mask, uv - vec2(0.0, p.y)).r;
      float edge = length(vec2(aR - aL, aU - aD));
      if (edge > 0.15) {
        color = mix(color, vec3(0.0, 1.0, 0.9), smoothstep(0.15, 0.6, edge));
      }
    } else if (u_overlayMode == 5) {
      // Uncertainty Heatmap
      float uVal = max(0.0, 1.0 - 2.0 * abs(maskAlpha - 0.5));
      if (uVal > 0.1) {
        vec3 heat = vec3(uVal, (1.0 - uVal * 0.5) * 0.8, (1.0 - uVal));
        color = mix(color, heat, uVal * 0.7);
      }
    }
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
