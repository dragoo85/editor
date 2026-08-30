import React, { useState, useEffect } from 'react';
import { useEditStore } from '../../state/editStore';
import { useCatalogStore } from '../../state/catalogStore';
import {
  MaskComponentType,
  MaskComponent,
  CombineMode,
  OverlayMode,
  DEFAULT_MASK_ADJUSTMENTS
} from '../../types/masks';
import { SmartSegmentation } from '../../engine/ai/SmartSegmentation';
import { PhotoMaskAIExtreme } from '../../engine/ai/PhotoMaskAIExtreme';
import { GeminiVisionService } from '../../engine/ai/GeminiVisionService';
import { Slider } from '../common/Slider';
import {
  Layers, Plus, Minus, Sparkles, User, Sun, CloudSun, Box,
  Paintbrush, Maximize2, Circle, Eye, EyeOff, Trash2, Copy,
  Smile, Scissors, Shirt, Wind, Palette, X, Key, CheckCircle, AlertTriangle, Cpu, RefreshCw, Zap, ShieldCheck, Check
} from 'lucide-react';

import { AccuracyMode } from '../../engine/ai/MaskModelRouter';

export const MaskingPanel: React.FC = () => {
  const {
    developState,
    activeMaskGroupId,
    activeComponentId,
    overlayConfig,
    brushSettings,
    createMaskGroup,
    addComponentToGroup,
    updateComponent,
    deleteComponent,
    invertComponent,
    setComponentCombineMode,
    updateMaskGroup,
    updateMaskAdjustments,
    invertMaskGroup,
    duplicateMaskGroup,
    deleteMaskGroup,
    setActiveMaskGroupId,
    setActiveComponentId,
    setOverlayConfig,
    setBrushSettings,
    setActiveTool
  } = useEditStore();

  const { photos, activePhotoId } = useCatalogStore();
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [addSubTargetGroupId, setAddSubTargetGroupId] = useState<{ id: string; mode: CombineMode } | null>(null);
  const [activeTab, setActiveTab] = useState<'light' | 'color' | 'effects' | 'refine'>('light');
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>('extreme_accuracy');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');

  useEffect(() => {
    setGeminiApiKeyInput(GeminiVisionService.getApiKey() || '');
  }, []);

  const masks = developState.masks;
  // Strict activeGroup resolution: null if activeMaskGroupId is null or not found
  const activeGroup = activeMaskGroupId ? (masks.find((g) => g.id === activeMaskGroupId) || null) : null;
  const activeComponent = activeGroup?.components.find((c) => c.id === activeComponentId) || activeGroup?.components[0] || null;
  const adj = activeGroup ? activeGroup.adjustments : DEFAULT_MASK_ADJUSTMENTS;

  const handleSaveGeminiKey = () => {
    GeminiVisionService.setApiKey(geminiApiKeyInput);
    setIsGeminiModalOpen(false);
  };

  const handleCreateComponentData = async (type: MaskComponentType): Promise<MaskComponent> => {
    const id = 'comp_' + Math.random().toString(36).slice(2, 9);
    let name = type.replace('_', ' ').toUpperCase();
    const compData: Partial<MaskComponent> = {
      id,
      name,
      type,
      combineMode: 'add',
      enabled: true,
      inverted: false,
      density: 100,
      feather: 50
    };

    if (['subject', 'sky', 'background', 'person', 'facial_skin', 'body_skin', 'eyes', 'lips', 'hair', 'clothes'].includes(type)) {
      if (activePhoto) {
        setIsProcessingAI(true);
        setProcessingStatus(`PhotoMask AI Extreme: Initializing 7-pass pipeline...`);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => resolve(null);
          img.src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
        });

        const w = img.naturalWidth || 1200;
        const h = img.naturalHeight || 800;
        const cacheKey = `${activePhoto.id}_${type}_${w}x${h}_${accuracyMode}`;

        let maskCanvas: HTMLCanvasElement;
        let uncertaintyCanvas: HTMLCanvasElement | undefined;
        let confidence = 0.98;
        let boundaryAccuracy = 0.98;
        let modelAgreement = 0.99;
        let detectedSubjects: any = undefined;

        const onProgress = (msg: string, pct: number) => {
          setProcessingStatus(msg);
          setProgressPercent(pct);
        };

        if (type === 'sky') {
          const res = await PhotoMaskAIExtreme.segmentSky(img, w, h, cacheKey, accuracyMode, onProgress);
          maskCanvas = res.maskCanvas;
          uncertaintyCanvas = res.uncertaintyCanvas;
          confidence = res.confidence;
          boundaryAccuracy = res.boundaryAccuracy;
          modelAgreement = res.modelAgreement;
          name = 'AI Sky';
        } else if (type === 'background') {
          const res = await PhotoMaskAIExtreme.segmentBackground(img, w, h, cacheKey, accuracyMode, onProgress);
          maskCanvas = res.maskCanvas;
          uncertaintyCanvas = res.uncertaintyCanvas;
          confidence = res.confidence;
          boundaryAccuracy = res.boundaryAccuracy;
          modelAgreement = res.modelAgreement;
          detectedSubjects = res.detectedSubjects;
          name = 'AI Background';
        } else if (type === 'subject') {
          const res = await PhotoMaskAIExtreme.segmentSubject(img, w, h, cacheKey, accuracyMode, null, onProgress);
          maskCanvas = res.maskCanvas;
          uncertaintyCanvas = res.uncertaintyCanvas;
          confidence = res.confidence;
          boundaryAccuracy = res.boundaryAccuracy;
          modelAgreement = res.modelAgreement;
          detectedSubjects = res.detectedSubjects;
          name = 'AI Subject';
        } else {
          setProcessingStatus(`Segmenting anatomical ${type}...`);
          setProgressPercent(50);
          const res = SmartSegmentation.segmentPortraitFeature(img, w, h, type as any, cacheKey);
          maskCanvas = res.maskCanvas;
          confidence = res.confidence;

          const names: Record<string, string> = {
            facial_skin: 'AI Face Skin',
            body_skin: 'AI Body Skin',
            eyes: 'AI Eyes & Iris',
            lips: 'AI Lips',
            hair: 'AI Hair',
            clothes: 'AI Clothes',
            person: 'AI Person'
          };
          name = names[type] || 'AI Portrait';
        }

        compData.name = name;
        compData.aiSelection = {
          category: type,
          maskCanvas,
          uncertaintyCanvas,
          confidence,
          boundaryAccuracy,
          qualityMode: accuracyMode === 'fast' ? 'fast' : 'high_quality',
          detectedSubjects,
          model: 'PhotoMask AI Extreme (7-Pass Adaptive Architecture)'
        };

        setIsProcessingAI(false);
        setProcessingStatus('');
        setProgressPercent(0);
      }
    } else if (type === 'brush') {
      compData.name = 'Brush';
      compData.strokes = [];
    } else if (type === 'linear_gradient') {
      compData.name = 'Linear Gradient';
      compData.linearGradient = {
        start: { x: 0.5, y: 0.2 },
        end: { x: 0.5, y: 0.8 },
        feather: 0.5
      };
    } else if (type === 'radial_gradient') {
      compData.name = 'Radial Gradient';
      compData.radialGradient = {
        center: { x: 0.5, y: 0.5 },
        rx: 0.25,
        ry: 0.25,
        angle: 0,
        feather: 0.5
      };
    } else if (type === 'color_range') {
      compData.name = 'Color Range';
      compData.colorRange = {
        targetColor: { r: 128, g: 128, b: 128 },
        tolerance: 30,
        smoothness: 50
      };
    } else if (type === 'luma_range') {
      compData.name = 'Luminance Range';
      compData.lumaRange = {
        minLuma: 20,
        maxLuma: 80,
        featherMin: 15,
        featherMax: 15
      };
    }

    return compData as MaskComponent;
  };

  const handleCreateNewMask = async (type: MaskComponentType) => {
    setIsNewMenuOpen(false);
    const comp = await handleCreateComponentData(type);
    createMaskGroup(comp);
  };

  const handleAddSubComponent = async (type: MaskComponentType) => {
    if (!addSubTargetGroupId) return;
    const comp = await handleCreateComponentData(type);
    comp.combineMode = addSubTargetGroupId.mode;
    addComponentToGroup(addSubTargetGroupId.id, comp);
    setAddSubTargetGroupId(null);
  };

  const handleAIRefine = async () => {
    if (!activeGroup || !activePhoto) return;
    const aiComp = activeGroup.components.find((c) => c.aiSelection);
    if (!aiComp || !aiComp.aiSelection) return;

    const brushComps = activeGroup.components.filter((c) => c.type === 'brush' && c.strokes && c.strokes.length > 0);
    const promptPoints: { x: number; y: number; positive: boolean }[] = [];

    brushComps.forEach((b) => {
      b.strokes?.forEach((s) => {
        s.points.forEach((p) => {
          promptPoints.push({ x: p.x, y: p.y, positive: !s.isEraser });
        });
      });
    });

    if (promptPoints.length === 0) return;

    setIsProcessingAI(true);
    setProcessingStatus('PhotoMask AI: Refining boundaries with prompt guidance...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      img.onload = () => resolve(null);
      img.src = activePhoto.previewUrl || activePhoto.thumbnailUrl;
    });

    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 800;

    const res = await PhotoMaskAIExtreme.refineWithPrompts(
      img,
      w,
      h,
      aiComp.aiSelection.maskCanvas!,
      promptPoints,
      (msg, pct) => {
        setProcessingStatus(msg);
        setProgressPercent(pct);
      }
    );

    updateComponent(
      activeGroup.id,
      aiComp.id,
      {
        aiSelection: {
          ...aiComp.aiSelection,
          maskCanvas: res.maskCanvas,
          confidence: res.confidence,
          boundaryAccuracy: res.boundaryAccuracy,
          prompts: promptPoints
        }
      },
      true
    );

    setIsProcessingAI(false);
    setProcessingStatus('');
    setProgressPercent(0);
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 select-none text-xs border-l border-dark-800">
      {/* 1. Panel Header & Mode Switcher */}
      <div className="p-3 border-b border-dark-800 bg-dark-850 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-blue" />
            <span className="font-bold text-white text-xs uppercase tracking-wide">Masking Workspace</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsGeminiModalOpen(true)}
              className={'p-1.5 rounded transition-colors ' + (
                GeminiVisionService.isConfigured()
                  ? 'text-emerald-400 hover:bg-emerald-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              )}
              title={GeminiVisionService.isConfigured() ? 'Gemini AI Vision Connected' : 'Configure Gemini AI Key'}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setActiveMaskGroupId(null);
                setActiveTool('select');
              }}
              className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-800"
              title="Close Masking & Return to Global"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Accuracy Mode Selector */}
        <div className="flex items-center gap-1 bg-dark-950 p-1 rounded border border-dark-800 text-[10px]">
          <span className="text-dark-400 font-mono px-1">Engine:</span>
          {(['fast', 'balanced', 'quality', 'extreme_accuracy'] as AccuracyMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setAccuracyMode(mode)}
              className={'flex-1 py-1 px-1.5 rounded font-semibold text-center transition-all ' + (
                accuracyMode === mode
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-850'
              )}
              title={mode === 'extreme_accuracy' ? '7-pass progressive deep adaptive segmentation' : mode}
            >
              {mode === 'extreme_accuracy' ? 'Extreme (7-Pass)' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Progress & Status Indicator */}
      {isProcessingAI && (
        <div className="px-3 py-2 bg-dark-850 border-b border-dark-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-accent-blue font-mono">
            <span className="truncate">{processingStatus}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-accent-blue via-emerald-400 to-sky-300 h-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Create Mask Button Bar */}
      <div className="p-3 border-b border-dark-800 flex items-center gap-2">
        <button
          onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-accent-blue hover:bg-accent-blue/90 text-white rounded font-semibold text-xs shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Mask
        </button>
      </div>

      {/* 3. New Mask Popout Menu */}
      {isNewMenuOpen && (
        <div className="p-3 bg-dark-850 border-b border-dark-800 grid grid-cols-2 gap-1.5 shadow-xl animate-fadeIn">
          <button
            onClick={() => handleCreateNewMask('subject')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <Box className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Select Subject</div>
              <div className="text-[9px] text-dark-400">AI Deep Matting</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('sky')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <CloudSun className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Select Sky</div>
              <div className="text-[9px] text-dark-400">Canopy & Horizon</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('background')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Select Background</div>
              <div className="text-[9px] text-dark-400">Depth-aware</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('person')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <User className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Select People</div>
              <div className="text-[9px] text-dark-400">Skin & Clothing</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('brush')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <Paintbrush className="w-4 h-4 text-pink-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Brush (K)</div>
              <div className="text-[9px] text-dark-400">Edge-aware auto</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('linear_gradient')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Linear Gradient</div>
              <div className="text-[9px] text-dark-400">Smooth falloff</div>
            </div>
          </button>

          <button
            onClick={() => handleCreateNewMask('radial_gradient')}
            className="flex items-center gap-2 p-2 rounded bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white border border-dark-700 transition-colors"
          >
            <Circle className="w-4 h-4 text-rose-400" />
            <div className="text-left">
              <div className="font-semibold text-[11px]">Radial Gradient</div>
              <div className="text-[9px] text-dark-400">Circular vignette</div>
            </div>
          </button>
        </div>
      )}

      {/* 4. Mask Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {masks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-dark-500 gap-2 py-8">
            <Layers className="w-8 h-8 opacity-40" />
            <p className="text-xs">No masks created yet.</p>
            <p className="text-[10px] text-dark-600">Click "Create New Mask" above to begin.</p>
          </div>
        ) : (
          masks.map((group) => {
            const isGroupActive = group.id === activeMaskGroupId;
            const aiComp = group.components.find((c) => c.aiSelection);

            return (
              <div
                key={group.id}
                onClick={() => {
                  setActiveMaskGroupId(group.id);
                  if (group.components.length > 0) {
                    setActiveComponentId(group.components[0].id);
                  }
                }}
                className={'rounded-md border transition-all cursor-pointer ' + (
                  isGroupActive
                    ? 'border-accent-blue bg-dark-850 shadow-md ring-1 ring-accent-blue/60'
                    : 'border-dark-800 bg-dark-900/60 hover:border-dark-700'
                )}
              >
                {/* Group Title Row */}
                <div className="flex items-center justify-between p-2.5 border-b border-dark-800/80">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMaskGroup(group.id, { enabled: !group.enabled });
                      }}
                      className="text-dark-400 hover:text-white"
                      title={group.enabled ? 'Disable Mask' : 'Enable Mask'}
                    >
                      {group.enabled ? <Eye className="w-3.5 h-3.5 text-accent-blue" /> : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
                    </button>
                    <span className="font-semibold text-white truncate text-xs">{group.name}</span>
                    {isGroupActive ? (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-sky-300 font-bold uppercase tracking-wider">
                        <Check className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-dark-800 text-dark-500 font-mono">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddSubTargetGroupId({ id: group.id, mode: 'add' });
                      }}
                      className="p-1 text-dark-400 hover:text-emerald-400 rounded hover:bg-dark-750"
                      title="Add to Mask (+)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddSubTargetGroupId({ id: group.id, mode: 'subtract' });
                      }}
                      className="p-1 text-dark-400 hover:text-rose-400 rounded hover:bg-dark-750"
                      title="Subtract from Mask (-)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        invertMaskGroup(group.id);
                      }}
                      className={'px-1.5 py-0.5 rounded text-[10px] font-mono ' + (group.inverted ? 'bg-accent-blue text-white' : 'bg-dark-800 text-dark-400 hover:text-white')}
                      title="Invert entire mask"
                    >
                      Invert
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMaskGroup(group.id);
                      }}
                      className="p-1 text-dark-500 hover:text-white rounded hover:bg-dark-750"
                      title="Duplicate Mask"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMaskGroup(group.id);
                      }}
                      className="p-1 text-dark-500 hover:text-rose-400 rounded hover:bg-dark-750"
                      title="Delete Mask"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-Components List */}
                <div className="p-2 flex flex-col gap-1.5 bg-dark-950/40">
                  {group.components.map((comp) => {
                    const isCompActive = isGroupActive && comp.id === activeComponentId;
                    return (
                      <div
                        key={comp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMaskGroupId(group.id);
                          setActiveComponentId(comp.id);
                        }}
                        className={'flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors ' + (
                          isCompActive
                            ? 'bg-dark-750 text-white font-medium'
                            : 'text-dark-300 hover:bg-dark-800'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-dark-500 uppercase">
                            {comp.combineMode === 'add' ? '+' : comp.combineMode === 'subtract' ? '−' : '∩'}
                          </span>
                          <span className="truncate">{comp.name}</span>
                        </div>

                        {comp.aiSelection && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {Math.round((comp.aiSelection.confidence || 0.9) * 100)}%
                            </span>
                            {comp.aiSelection.boundaryAccuracy && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-blue/20 text-sky-300" title="Edge boundary sharpness">
                                Edge: {Math.round(comp.aiSelection.boundaryAccuracy * 100)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* AI Refine Button Row (when active) */}
                {isGroupActive && aiComp && (
                  <div className="p-2 border-t border-dark-800/60 flex items-center justify-between bg-dark-900/50">
                    <span className="text-[10px] text-dark-400 font-mono">
                      {aiComp.aiSelection?.model || 'PhotoMask AI Extreme'}
                    </span>
                    <button
                      onClick={handleAIRefine}
                      className="flex items-center gap-1 px-2 py-1 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded text-[10px] font-semibold transition-colors"
                      title="Refine AI boundaries using your painted brush strokes"
                    >
                      <RefreshCw className="w-3 h-3" />
                      AI Refine
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Mask Inspection & Overlay Configuration Toolbar */}
      <div className="p-3 border-t border-dark-800 bg-dark-900/90 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-dark-300">Overlay Visualization</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-dark-300">
            <input
              type="checkbox"
              checked={overlayConfig.showOverlay}
              onChange={(e) => setOverlayConfig({ showOverlay: e.target.checked })}
              className="rounded bg-dark-800 border-dark-700 text-accent-blue focus:ring-0"
            />
            Show Overlay (O)
          </label>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {[
            { id: 'color', label: 'Color (Red)' },
            { id: 'grayscale', label: 'Grayscale' },
            { id: 'white_on_black', label: 'White / Black' },
            { id: 'black_on_white', label: 'Black / White' },
            { id: 'boundary', label: 'Neon Outline' },
            { id: 'uncertainty', label: 'Uncertainty' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setOverlayConfig({ overlayMode: mode.id as OverlayMode, showOverlay: true })}
              className={'py-1 px-1.5 rounded border text-center font-medium transition-colors ' + (
                overlayConfig.overlayMode === mode.id && overlayConfig.showOverlay
                  ? 'bg-accent-blue/20 border-accent-blue text-white'
                  : 'bg-dark-850 border-dark-750 text-dark-400 hover:text-white'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Local Mask Adjustments Tabbed Panel */}
      {activeGroup ? (
        <div className="border-t border-dark-800 bg-dark-900 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-dark-850/90 border-b border-dark-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white truncate">
                EDITING: {activeGroup.name.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateMaskAdjustments(activeGroup.id, {
                  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
                  temperature: 0, tint: 0, saturation: 0, vibrance: 0,
                  texture: 0, clarity: 0, dehaze: 0, sharpness: 0, noiseReduction: 0, defringe: 0,
                  edgeFeather: 0, shiftEdge: 0, smoothness: 0
                }, true)}
                className="text-[10px] text-dark-400 hover:text-accent-blue font-medium transition-colors"
                title="Reset ONLY this mask's adjustments to 0"
              >
                Reset
              </button>
              <button
                onClick={() => setActiveMaskGroupId(null)}
                className="text-[10px] text-dark-500 hover:text-white font-medium transition-colors"
                title="Deselect this mask"
              >
                Deselect
              </button>
            </div>
          </div>

          <div className="flex items-center border-b border-dark-800 text-[11px]">
            {[
              { id: 'light', label: 'Light' },
              { id: 'color', label: 'Color' },
              { id: 'effects', label: 'Effects' },
              { id: 'refine', label: 'Refine' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={'flex-1 py-2 font-medium border-b-2 transition-colors ' + (
                  activeTab === tab.id
                    ? 'border-accent-blue text-white bg-dark-850/50'
                    : 'border-transparent text-dark-400 hover:text-dark-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3 flex flex-col gap-3 max-h-52 overflow-y-auto">
            {activeTab === 'light' && (
              <>
                <Slider label="Exposure" value={adj.exposure} min={-5} max={5} step={0.01} unit=" EV" onChange={(v) => updateMaskAdjustments(activeGroup.id, { exposure: v }, true)} />
                <Slider label="Contrast" value={adj.contrast} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { contrast: v }, true)} />
                <Slider label="Highlights" value={adj.highlights} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { highlights: v }, true)} />
                <Slider label="Shadows" value={adj.shadows} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { shadows: v }, true)} />
                <Slider label="Whites" value={adj.whites} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { whites: v }, true)} />
                <Slider label="Blacks" value={adj.blacks} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { blacks: v }, true)} />
              </>
            )}

            {activeTab === 'color' && (
              <>
                <Slider label="Temperature" value={adj.temperature} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { temperature: v }, true)} />
                <Slider label="Tint" value={adj.tint} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { tint: v }, true)} />
                <Slider label="Saturation" value={adj.saturation} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { saturation: v }, true)} />
                <Slider label="Vibrance" value={adj.vibrance} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { vibrance: v }, true)} />
              </>
            )}

            {activeTab === 'effects' && (
              <>
                <Slider label="Texture" value={adj.texture} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { texture: v }, true)} />
                <Slider label="Clarity" value={adj.clarity} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { clarity: v }, true)} />
                <Slider label="Dehaze" value={adj.dehaze} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { dehaze: v }, true)} />
                <Slider label="Sharpness" value={adj.sharpness} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { sharpness: v }, true)} />
              </>
            )}

            {activeTab === 'refine' && (
              <>
                <Slider label="Edge Feather" value={adj.edgeFeather} min={0} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { edgeFeather: v }, true)} />
                <Slider label="Shift Edge" value={adj.shiftEdge} min={-100} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { shiftEdge: v }, true)} />
                <Slider label="Smoothness" value={adj.smoothness} min={0} max={100} step={1} onChange={(v) => updateMaskAdjustments(activeGroup.id, { smoothness: v }, true)} />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-dark-800 bg-dark-950 flex flex-col items-center justify-center text-center text-dark-500 gap-1.5">
          <p className="text-xs font-semibold text-dark-400">No Mask Currently Selected</p>
          <p className="text-[10px] text-dark-600">Click any mask in the list above to activate its adjustments.</p>
        </div>
      )}
    </div>
  );
};
