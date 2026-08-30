const fs = require('fs');
const path = require('path');
const full = path.resolve('src/engine/presets/PresetLibrary.ts');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import { Preset } from '../../types/presets';
import { DEFAULT_DEVELOP_STATE } from '../../types/adjustments';

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'preset_golden_hour',
    name: 'Golden Hour Glow',
    category: 'Color & Mood',
    description: 'Warm sunset lighting with glowing highlights and soft amber warmth.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        temperature: 6800,
        tint: 8,
        exposure: 0.15,
        contrast: 12,
        highlights: -20,
        shadows: 25,
        whites: 10,
        blacks: -5,
        vibrance: 25,
        saturation: 5,
        clarity: 10
      },
      colorGrading: {
        ...DEFAULT_DEVELOP_STATE.colorGrading,
        highlights: { hue: 42, saturation: 40, luminance: 5 },
        shadows: { hue: 215, saturation: 15, luminance: -5 },
        midtones: { hue: 35, saturation: 20, luminance: 0 },
        blending: 60,
        balance: 10
      },
      detail: {
        ...DEFAULT_DEVELOP_STATE.detail,
        vignetteAmount: -18,
        vignetteFeather: 60
      }
    }
  },
  {
    id: 'preset_nordic_mood',
    name: 'Nordic Moody',
    category: 'Cinematic',
    description: 'Cool atmospheric tones, muted greens, lifted darks, and crisp Scandinavian mood.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        temperature: 4600,
        tint: -5,
        contrast: 15,
        highlights: -35,
        shadows: 20,
        blacks: 15,
        texture: 15,
        clarity: 20,
        dehaze: 10,
        vibrance: -10,
        saturation: -15
      },
      curve: {
        ...DEFAULT_DEVELOP_STATE.curve,
        rgb: [{ x: 0, y: 25 }, { x: 70, y: 60 }, { x: 190, y: 195 }, { x: 255, y: 245 }]
      },
      hsl: {
        ...DEFAULT_DEVELOP_STATE.hsl,
        green: { hue: 20, saturation: -40, luminance: -10 },
        yellow: { hue: -10, saturation: -30, luminance: -5 },
        blue: { hue: -5, saturation: -20, luminance: -15 }
      }
    }
  },
  {
    id: 'preset_vintage_film',
    name: 'Vintage Film 1970s',
    category: 'Analog & Retro',
    description: 'Warm analog fade, authentic matte blacks, subtle color shifts, and film grain.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        temperature: 5900,
        tint: 12,
        contrast: -10,
        highlights: -25,
        shadows: 30,
        whites: -15,
        blacks: 25,
        vibrance: 15
      },
      curve: {
        ...DEFAULT_DEVELOP_STATE.curve,
        rgb: [{ x: 0, y: 35 }, { x: 80, y: 75 }, { x: 180, y: 180 }, { x: 255, y: 235 }],
        red: [{ x: 0, y: 10 }, { x: 128, y: 130 }, { x: 255, y: 255 }],
        blue: [{ x: 0, y: 25 }, { x: 128, y: 120 }, { x: 255, y: 240 }]
      },
      detail: {
        ...DEFAULT_DEVELOP_STATE.detail,
        grainAmount: 35,
        grainSize: 30,
        vignetteAmount: -20,
        vignetteFeather: 70
      }
    }
  },
  {
    id: 'preset_teal_orange',
    name: 'Teal & Orange Blockbuster',
    category: 'Cinematic',
    description: 'Hollywood cinema color separation with deep teal shadows and punchy warm skin tones.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        contrast: 25,
        highlights: -15,
        shadows: 15,
        whites: 10,
        blacks: -15,
        clarity: 15,
        dehaze: 10,
        vibrance: 20
      },
      colorGrading: {
        ...DEFAULT_DEVELOP_STATE.colorGrading,
        shadows: { hue: 195, saturation: 55, luminance: -10 },
        highlights: { hue: 35, saturation: 50, luminance: 10 },
        midtones: { hue: 25, saturation: 20, luminance: 0 },
        blending: 70,
        balance: -10
      },
      hsl: {
        ...DEFAULT_DEVELOP_STATE.hsl,
        orange: { hue: -5, saturation: 25, luminance: 10 },
        aqua: { hue: 10, saturation: 40, luminance: -5 },
        blue: { hue: -15, saturation: 45, luminance: -10 }
      }
    }
  },
  {
    id: 'preset_bw_high_contrast',
    name: 'Monochrome Dramatic',
    category: 'Black & White',
    description: 'Striking black and white conversion with rich deep blacks, brilliant highlights, and sharp texture.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        saturation: -100,
        contrast: 35,
        highlights: 15,
        shadows: -20,
        whites: 25,
        blacks: -30,
        texture: 25,
        clarity: 30,
        dehaze: 15
      },
      curve: {
        ...DEFAULT_DEVELOP_STATE.curve,
        rgb: [{ x: 0, y: 0 }, { x: 60, y: 40 }, { x: 195, y: 220 }, { x: 255, y: 255 }]
      },
      detail: {
        ...DEFAULT_DEVELOP_STATE.detail,
        sharpenAmount: 50,
        grainAmount: 20,
        vignetteAmount: -25
      }
    }
  },
  {
    id: 'preset_crisp_architecture',
    name: 'Crisp Architectural',
    category: 'Urban & Geometry',
    description: 'Clean neutral white balance, extreme edge clarity, dehazed skies, and balanced contrast.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        contrast: 15,
        highlights: -30,
        shadows: 30,
        whites: 15,
        blacks: -10,
        texture: 30,
        clarity: 25,
        dehaze: 20,
        vibrance: 10
      },
      optics: {
        ...DEFAULT_DEVELOP_STATE.optics,
        chromaticAberration: 30,
        vignettingCorrection: 40
      },
      detail: {
        ...DEFAULT_DEVELOP_STATE.detail,
        sharpenAmount: 60,
        sharpenDetail: 40
      }
    }
  },
  {
    id: 'preset_vibrant_landscape',
    name: 'Vibrant Landscape',
    category: 'Nature',
    description: 'Deep blue skies, rich verdant greens, clear distant horizons, and punchy dynamic range.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        temperature: 5300,
        contrast: 18,
        highlights: -40,
        shadows: 35,
        whites: 20,
        blacks: -10,
        texture: 20,
        clarity: 15,
        dehaze: 25,
        vibrance: 35,
        saturation: 10
      },
      hsl: {
        ...DEFAULT_DEVELOP_STATE.hsl,
        blue: { hue: -5, saturation: 30, luminance: -15 },
        aqua: { hue: -10, saturation: 25, luminance: -10 },
        green: { hue: 15, saturation: 25, luminance: 5 },
        yellow: { hue: 5, saturation: 20, luminance: 10 }
      }
    }
  },
  {
    id: 'preset_clean_portrait',
    name: 'Clean Studio Portrait',
    category: 'Portrait',
    description: 'Luminous skin tones, gentle highlight roll-off, soft midtone contrast, and flattering depth.',
    isBuiltIn: true,
    adjustments: {
      tone: {
        ...DEFAULT_DEVELOP_STATE.tone,
        temperature: 5600,
        tint: 5,
        contrast: -5,
        highlights: -15,
        shadows: 20,
        whites: 10,
        blacks: -5,
        texture: -10,
        clarity: -5,
        vibrance: 15,
        saturation: -5
      },
      hsl: {
        ...DEFAULT_DEVELOP_STATE.hsl,
        orange: { hue: 0, saturation: -5, luminance: 15 },
        red: { hue: 5, saturation: -5, luminance: 10 }
      },
      detail: {
        ...DEFAULT_DEVELOP_STATE.detail,
        sharpenAmount: 35,
        noiseReductionLuma: 15,
        noiseReductionColor: 35
      }
    }
  }
];

export class PresetManager {
  private static CUSTOM_STORAGE_KEY = 'lumina_custom_presets';

  public static getCustomPresets(): Preset[] {
    try {
      const json = localStorage.getItem(this.CUSTOM_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  public static getAllPresets(): Preset[] {
    return [...BUILTIN_PRESETS, ...this.getCustomPresets()];
  }

  public static saveCustomPreset(preset: Preset): void {
    const current = this.getCustomPresets();
    const filtered = current.filter(p => p.id !== preset.id);
    filtered.push(preset);
    localStorage.setItem(this.CUSTOM_STORAGE_KEY, JSON.stringify(filtered));
  }

  public static deleteCustomPreset(id: string): void {
    const current = this.getCustomPresets();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(this.CUSTOM_STORAGE_KEY, JSON.stringify(filtered));
  }

  public static exportPresetAsJSON(preset: Preset): string {
    return JSON.stringify(preset, null, 2);
  }

  public static importPresetFromJSON(jsonStr: string): Preset {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.name || !parsed.adjustments) {
      throw new Error('Invalid preset JSON structure');
    }
    const preset: Preset = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: parsed.name,
      category: parsed.category || 'User Presets',
      description: parsed.description || 'Imported preset',
      adjustments: parsed.adjustments,
      isBuiltIn: false
    };
    this.saveCustomPreset(preset);
    return preset;
  }
}
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved PresetLibrary.ts');
