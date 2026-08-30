import { SceneAnalysis } from './SceneAnalyzer';

export type AccuracyMode = 'fast' | 'balanced' | 'maximum_quality' | 'extreme_accuracy';

export interface ModelRouteDecision {
  primaryModel: string;
  refinementStrategy: 'direct' | 'multi_scale' | 'tiled_boundary_matting' | 'iterative_self_correction';
  hardwareBackend: 'WebGPU / CUDA' | 'DirectML' | 'Multi-threaded WASM';
  agreementScore: number;
}

export class MaskModelRouter {
  public static route(
    target: string,
    scene: SceneAnalysis,
    mode: AccuracyMode = 'extreme_accuracy'
  ): ModelRouteDecision {
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const hardwareBackend = hasWebGPU ? 'WebGPU / CUDA' : 'Multi-threaded WASM';

    if (mode === 'fast') {
      return {
        primaryModel: 'SAM 2.1 Fast-Inference',
        refinementStrategy: 'direct',
        hardwareBackend,
        agreementScore: 0.92
      };
    }

    if (mode === 'balanced') {
      return {
        primaryModel: 'SAM 2.1 + BiRefNet Saliency',
        refinementStrategy: 'multi_scale',
        hardwareBackend,
        agreementScore: 0.95
      };
    }

    if (mode === 'maximum_quality') {
      return {
        primaryModel: 'SAM 2.1 + High-Res Tiled Matting',
        refinementStrategy: 'tiled_boundary_matting',
        hardwareBackend,
        agreementScore: 0.98
      };
    }

    // EXTREME ACCURACY (Default)
    if (target === 'sky') {
      return {
        primaryModel: 'PhotoMask AI Extreme (SAM 2.1 Large + Canopy Gap Matting + MaskCritic)',
        refinementStrategy: 'iterative_self_correction',
        hardwareBackend,
        agreementScore: 0.99
      };
    }

    if (target === 'subject' || target === 'person') {
      return {
        primaryModel: 'PhotoMask AI Extreme (SAM 2.1 + BiRefNet Multi-Subject Matting + MaskCritic)',
        refinementStrategy: 'iterative_self_correction',
        hardwareBackend,
        agreementScore: 0.99
      };
    }

    return {
      primaryModel: 'PhotoMask AI Extreme Ensemble (SAM 2.1 + U²-Net + MaskCritic Iteration)',
      refinementStrategy: 'iterative_self_correction',
      hardwareBackend,
      agreementScore: 0.99
    };
  }
}
