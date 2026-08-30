const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.resolve('src/state/editStore.ts'), `import { create } from 'zustand';
import { DevelopState, DEFAULT_DEVELOP_STATE } from '../types/adjustments';
import {
  MaskGroup,
  MaskComponent,
  MaskAdjustments,
  MaskOverlayConfig,
  CombineMode,
  DEFAULT_MASK_ADJUSTMENTS,
  HealingPin,
  Point2D
} from '../types/masks';
import { Preset } from '../types/presets';

export interface HistoryStep {
  name: string;
  timestamp: number;
  state: DevelopState;
}

export interface NamedSnapshot {
  id: string;
  name: string;
  timestamp: number;
  state: DevelopState;
}

interface EditStore {
  developState: DevelopState;
  activeTool: 'select' | 'crop' | 'mask' | 'heal';
  activeMaskGroupId: string | null;
  activeComponentId: string | null;
  activePresetPreview: Partial<DevelopState> | null;
  isBeforeAfter: boolean;
  beforeAfterMode: 'split' | 'sideBySide';
  splitPosition: number;
  zoom: number;
  pan: Point2D;
  overlayConfig: MaskOverlayConfig;

  // Brush settings for active mask
  brushSettings: {
    size: number;
    feather: number;
    flow: number;
    density: number;
    autoMask: boolean;
    isEraser: boolean;
  };

  history: HistoryStep[];
  historyIndex: number;
  snapshots: NamedSnapshot[];

  setDevelopState: (state: DevelopState, recordHistory?: boolean, stepName?: string) => void;
  commitHistory: (stepName: string) => void;
  updateTone: (updates: Partial<DevelopState['tone']>, recordHistory?: boolean) => void;
  updateCurve: (updates: Partial<DevelopState['curve']>, recordHistory?: boolean) => void;
  updateHSL: (updates: Partial<DevelopState['hsl']>, recordHistory?: boolean) => void;
  updateColorGrading: (updates: Partial<DevelopState['colorGrading']>, recordHistory?: boolean) => void;
  updateDetail: (updates: Partial<DevelopState['detail']>, recordHistory?: boolean) => void;
  updateOptics: (updates: Partial<DevelopState['optics']>, recordHistory?: boolean) => void;
  updateGeometry: (updates: Partial<DevelopState['geometry']>, recordHistory?: boolean) => void;
  updateCalibration: (updates: Partial<DevelopState['calibration']>, recordHistory?: boolean) => void;

  // Hierarchical Masking Actions
  createMaskGroup: (initialComponent: MaskComponent, groupName?: string) => string;
  addComponentToGroup: (groupId: string, component: MaskComponent, combineMode?: CombineMode) => void;
  updateComponent: (groupId: string, componentId: string, updates: Partial<MaskComponent>, recordHistory?: boolean) => void;
  deleteComponent: (groupId: string, componentId: string) => void;
  invertComponent: (groupId: string, componentId: string) => void;
  setComponentCombineMode: (groupId: string, componentId: string, mode: CombineMode) => void;

  updateMaskGroup: (groupId: string, updates: Partial<MaskGroup>, recordHistory?: boolean) => void;
  updateMaskAdjustments: (groupId: string, updates: Partial<MaskAdjustments>, recordHistory?: boolean) => void;
  invertMaskGroup: (groupId: string) => void;
  duplicateMaskGroup: (groupId: string) => void;
  deleteMaskGroup: (groupId: string) => void;
  setActiveMaskGroupId: (id: string | null) => void;
  setActiveComponentId: (id: string | null) => void;
  setOverlayConfig: (updates: Partial<MaskOverlayConfig>) => void;
  setBrushSettings: (updates: Partial<EditStore['brushSettings']>) => void;

  // Healing Pins
  addHealingPin: (pin: HealingPin) => void;
  updateHealingPin: (id: string, updates: Partial<HealingPin>) => void;
  deleteHealingPin: (id: string) => void;

  setActiveTool: (tool: 'select' | 'crop' | 'mask' | 'heal') => void;
  setActivePresetPreview: (preview: Partial<DevelopState> | null) => void;
  applyPreset: (preset: Preset) => void;

  toggleBeforeAfter: () => void;
  setBeforeAfterMode: (mode: 'split' | 'sideBySide') => void;
  setSplitPosition: (pos: number) => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: Point2D) => void;
  resetView: () => void;

  undo: () => void;
  redo: () => void;
  jumpToHistory: (index: number) => void;
  createSnapshot: (name: string) => void;
  applySnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  resetAllAdjustments: () => void;
  resetTone: () => void;
  resetCurve: () => void;
  resetHSL: () => void;
  resetColorGrading: () => void;
}

export const useEditStore = create<EditStore>((set, get) => ({
  developState: DEFAULT_DEVELOP_STATE,
  activeTool: 'select',
  activeMaskGroupId: null,
  activeComponentId: null,
  activePresetPreview: null,
  isBeforeAfter: false,
  beforeAfterMode: 'split',
  splitPosition: 0.5,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  overlayConfig: {
    showOverlay: true,
    overlayMode: 'color',
    overlayColor: [0.95, 0.2, 0.2],
    overlayOpacity: 50
  },

  brushSettings: {
    size: 40,
    feather: 0.5,
    flow: 1.0,
    density: 1.0,
    autoMask: true,
    isEraser: false
  },

  history: [{ name: 'Import / Initial', timestamp: Date.now(), state: DEFAULT_DEVELOP_STATE }],
  historyIndex: 0,
  snapshots: [],

  setDevelopState: (newState, recordHistory = false, stepName = 'Adjustment') => {
    set((s) => {
      let newHistory = s.history;
      let newIndex = s.historyIndex;

      if (recordHistory) {
        newHistory = s.history.slice(0, s.historyIndex + 1);
        newHistory.push({ name: stepName, timestamp: Date.now(), state: newState });
        newIndex = newHistory.length - 1;
      }

      return { developState: newState, history: newHistory, historyIndex: newIndex };
    });
  },

  commitHistory: (stepName: string) => {
    const { developState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ name: stepName, timestamp: Date.now(), state: developState });
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  updateTone: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      tone: { ...developState.tone, ...updates }
    }, recordHistory, 'Tone Adjustment');
  },

  updateCurve: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      curve: { ...developState.curve, ...updates }
    }, recordHistory, 'Tone Curve');
  },

  updateHSL: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      hsl: { ...developState.hsl, ...updates }
    }, recordHistory, 'HSL Mixer');
  },

  updateColorGrading: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      colorGrading: { ...developState.colorGrading, ...updates }
    }, recordHistory, 'Color Grading');
  },

  updateDetail: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      detail: { ...developState.detail, ...updates }
    }, recordHistory, 'Detail / Optics');
  },

  updateOptics: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      optics: { ...developState.optics, ...updates }
    }, recordHistory, 'Optics');
  },

  updateGeometry: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      geometry: { ...developState.geometry, ...updates }
    }, recordHistory, 'Geometry / Crop');
  },

  updateCalibration: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      calibration: { ...developState.calibration, ...updates }
    }, recordHistory, 'Calibration');
  },

  // Hierarchical Masking
  createMaskGroup: (initialComponent, groupName) => {
    const { developState, setDevelopState } = get();
    const count = developState.masks.length + 1;
    const name = groupName || ('Mask ' + count);
    const newGroup: MaskGroup = {
      id: 'group_' + Date.now(),
      name,
      enabled: true,
      inverted: false,
      opacity: 100,
      components: [{ ...initialComponent, combineMode: 'add' }],
      adjustments: { ...DEFAULT_MASK_ADJUSTMENTS }
    };

    const newMasks = [...developState.masks, newGroup];
    setDevelopState({ ...developState, masks: newMasks }, true, 'Create Mask: ' + name);
    set({
      activeMaskGroupId: newGroup.id,
      activeComponentId: initialComponent.id,
      activeTool: 'mask'
    });
    return newGroup.id;
  },

  addComponentToGroup: (groupId, component, combineMode = 'add') => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: [...g.components, { ...component, combineMode }]
        };
      }
      return g;
    });

    setDevelopState({ ...developState, masks: newMasks }, true, 'Add to ' + (component.name || 'Mask'));
    set({ activeComponentId: component.id });
  },

  updateComponent: (groupId, componentId, updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: g.components.map((c) => (c.id === componentId ? { ...c, ...updates } : c))
        };
      }
      return g;
    });

    setDevelopState({ ...developState, masks: newMasks }, recordHistory, 'Update Mask Component');
  },

  deleteComponent: (groupId, componentId) => {
    const { developState, setDevelopState, activeComponentId } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: g.components.filter((c) => c.id !== componentId)
        };
      }
      return g;
    });

    setDevelopState({ ...developState, masks: newMasks }, true, 'Delete Mask Component');
    if (activeComponentId === componentId) set({ activeComponentId: null });
  },

  invertComponent: (groupId, componentId) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: g.components.map((c) => (c.id === componentId ? { ...c, inverted: !c.inverted } : c))
        };
      }
      return g;
    });
    setDevelopState({ ...developState, masks: newMasks }, true, 'Invert Mask Component');
  },

  setComponentCombineMode: (groupId, componentId, mode) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: g.components.map((c) => (c.id === componentId ? { ...c, combineMode: mode } : c))
        };
      }
      return g;
    });
    setDevelopState({ ...developState, masks: newMasks }, true, 'Set Combine Mode: ' + mode);
  },

  updateMaskGroup: (groupId, updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => (g.id === groupId ? { ...g, ...updates } : g));
    setDevelopState({ ...developState, masks: newMasks }, recordHistory, 'Update Mask Group');
  },

  updateMaskAdjustments: (groupId, updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          adjustments: { ...g.adjustments, ...updates }
        };
      }
      return g;
    });
    setDevelopState({ ...developState, masks: newMasks }, recordHistory, 'Mask Adjustment');
  },

  invertMaskGroup: (groupId) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => (g.id === groupId ? { ...g, inverted: !g.inverted } : g));
    setDevelopState({ ...developState, masks: newMasks }, true, 'Invert Mask');
  },

  duplicateMaskGroup: (groupId) => {
    const { developState, setDevelopState } = get();
    const group = developState.masks.find((g) => g.id === groupId);
    if (!group) return;

    const dupGroup: MaskGroup = {
      ...group,
      id: 'group_' + Date.now(),
      name: group.name + ' Copy',
      components: group.components.map((c) => ({ ...c, id: 'comp_' + Math.random().toString(36).slice(2, 9) }))
    };

    setDevelopState({ ...developState, masks: [...developState.masks, dupGroup] }, true, 'Duplicate Mask');
    set({ activeMaskGroupId: dupGroup.id });
  },

  deleteMaskGroup: (groupId) => {
    const { developState, setDevelopState, activeMaskGroupId } = get();
    const newMasks = developState.masks.filter((g) => g.id !== groupId);
    setDevelopState({ ...developState, masks: newMasks }, true, 'Delete Mask');
    if (activeMaskGroupId === groupId) {
      set({
        activeMaskGroupId: newMasks[0]?.id || null,
        activeComponentId: newMasks[0]?.components[0]?.id || null
      });
    }
  },

  setActiveMaskGroupId: (id) => set({ activeMaskGroupId: id }),
  setActiveComponentId: (id) => set({ activeComponentId: id }),
  setOverlayConfig: (updates) => set((s) => ({ overlayConfig: { ...s.overlayConfig, ...updates } })),
  setBrushSettings: (updates) => set((s) => ({ brushSettings: { ...s.brushSettings, ...updates } })),

  // Healing Pins
  addHealingPin: (pin) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      healingPins: [...developState.healingPins, pin]
    }, true, 'Spot Healing');
  },

  updateHealingPin: (id, updates) => {
    const { developState, setDevelopState } = get();
    const updated = developState.healingPins.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setDevelopState({ ...developState, healingPins: updated }, false);
  },

  deleteHealingPin: (id) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      healingPins: developState.healingPins.filter((p) => p.id !== id)
    }, true, 'Remove Heal Pin');
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActivePresetPreview: (preview) => set({ activePresetPreview: preview }),

  applyPreset: (preset) => {
    const { developState, setDevelopState } = get();
    setDevelopState({ ...developState, ...preset.developState }, true, 'Apply Preset: ' + preset.name);
  },

  toggleBeforeAfter: () => set((s) => ({ isBeforeAfter: !s.isBeforeAfter })),
  setBeforeAfterMode: (mode) => set({ beforeAfterMode: mode }),
  setSplitPosition: (pos) => set({ splitPosition: pos }),

  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      set({
        historyIndex: nextIndex,
        developState: history[nextIndex].state
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        historyIndex: nextIndex,
        developState: history[nextIndex].state
      });
    }
  },

  jumpToHistory: (index) => {
    const { history } = get();
    if (index >= 0 && index < history.length) {
      set({
        historyIndex: index,
        developState: history[index].state
      });
    }
  },

  createSnapshot: (name) => {
    const { developState, snapshots } = get();
    const newSnap: NamedSnapshot = {
      id: 'snap_' + Date.now(),
      name: name.trim() || ('Snapshot ' + (snapshots.length + 1)),
      timestamp: Date.now(),
      state: developState
    };
    set({ snapshots: [...snapshots, newSnap] });
  },

  applySnapshot: (id) => {
    const { snapshots, setDevelopState } = get();
    const snap = snapshots.find((s) => s.id === id);
    if (snap) {
      setDevelopState(snap.state, true, 'Apply Snapshot: ' + snap.name);
    }
  },

  deleteSnapshot: (id) => {
    const { snapshots } = get();
    set({ snapshots: snapshots.filter((s) => s.id !== id) });
  },

  resetAllAdjustments: () => {
    const { setDevelopState } = get();
    setDevelopState(DEFAULT_DEVELOP_STATE, true, 'Reset All Adjustments');
  },

  resetTone: () => {
    const { developState, setDevelopState } = get();
    setDevelopState({ ...developState, tone: DEFAULT_DEVELOP_STATE.tone }, true, 'Reset Tone');
  },

  resetCurve: () => {
    const { developState, setDevelopState } = get();
    setDevelopState({ ...developState, curve: DEFAULT_DEVELOP_STATE.curve }, true, 'Reset Curve');
  },

  resetHSL: () => {
    const { developState, setDevelopState } = get();
    setDevelopState({ ...developState, hsl: DEFAULT_DEVELOP_STATE.hsl }, true, 'Reset HSL');
  },

  resetColorGrading: () => {
    const { developState, setDevelopState } = get();
    setDevelopState({ ...developState, colorGrading: DEFAULT_DEVELOP_STATE.colorGrading }, true, 'Reset Color Grading');
  }
}));
`, 'utf8');

console.log('src/state/editStore.ts updated with full Hierarchical Masking state.');
