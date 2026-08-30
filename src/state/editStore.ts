import { create } from 'zustand';
import {
  DevelopState,
  DEFAULT_DEVELOP_STATE,
  HistoryStep,
  NamedSnapshot
} from '../types/adjustments';
import {
  MaskGroup,
  MaskComponent,
  MaskOverlayConfig,
  HealingPin,
  DEFAULT_MASK_ADJUSTMENTS
} from '../types/masks';
import { HealOperation } from '../engine/healing/HealEngine';
import { RemovalOperation } from '../engine/removal/RemovalEngine';

export interface EditStore {
  developState: DevelopState;
  activeTool: 'select' | 'crop' | 'heal' | 'removal' | 'mask';
  setActiveTool: (tool: 'select' | 'crop' | 'heal' | 'removal' | 'mask') => void;

  // Single Source of Truth for Mask Selection
  activeMaskGroupId: string | null;
  activeComponentId: string | null;
  setActiveMaskGroupId: (id: string | null) => void;
  setActiveComponentId: (id: string | null) => void;

  // Non-Destructive Heal & Removal Operation Stacks
  healOperations: HealOperation[];
  removalOperations: RemovalOperation[];
  addHealOperation: (op: HealOperation) => void;
  updateHealOperation: (id: string, updates: Partial<HealOperation>, recordHistory?: boolean) => void;
  deleteHealOperation: (id: string) => void;
  addRemovalOperation: (op: RemovalOperation) => void;
  updateRemovalOperation: (id: string, updates: Partial<RemovalOperation>, recordHistory?: boolean) => void;
  deleteRemovalOperation: (id: string) => void;

  // Preset preview overlay
  activePresetPreview: Partial<DevelopState> | null;
  setActivePresetPreview: (preset: Partial<DevelopState> | null) => void;

  // Comparison & Viewport
  isBeforeAfter: boolean;
  setIsBeforeAfter: (enabled: boolean) => void;
  beforeAfterMode: 'split' | 'sideBySide' | 'toggle';
  setBeforeAfterMode: (mode: 'split' | 'sideBySide' | 'toggle') => void;
  splitPosition: number;
  setSplitPosition: (pos: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;

  // Mask Overlay config
  overlayConfig: MaskOverlayConfig;
  setOverlayConfig: (updates: Partial<MaskOverlayConfig>) => void;

  // Brush settings
  brushSettings: {
    size: number;
    feather: number;
    flow: number;
    density: number;
    autoMask: boolean;
    isEraser: boolean;
  };
  setBrushSettings: (updates: Partial<EditStore['brushSettings']>) => void;

  // History & Snapshots
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
  updateCalibration: (updates: Partial<DevelopState['calibration']>, recordHistory?: boolean) => void;
  updateGeometry: (updates: Partial<DevelopState['geometry']>, recordHistory?: boolean) => void;

  // Hierarchical Masking Operations
  createMaskGroup: (initialComponent: MaskComponent, groupName?: string) => string;
  addComponentToGroup: (groupId: string, component: MaskComponent) => void;
  updateComponent: (groupId: string, componentId: string, updates: Partial<MaskComponent>, recordHistory?: boolean) => void;
  deleteComponent: (groupId: string, componentId: string) => void;
  invertComponent: (groupId: string, componentId: string) => void;
  setComponentCombineMode: (groupId: string, componentId: string, mode: 'add' | 'subtract' | 'intersect') => void;
  updateMaskGroup: (groupId: string, updates: Partial<MaskGroup>, recordHistory?: boolean) => void;
  updateMaskAdjustments: (groupId: string, updates: Partial<MaskGroup['adjustments']>, recordHistory?: boolean) => void;
  invertMaskGroup: (groupId: string) => void;
  duplicateMaskGroup: (groupId: string) => void;
  deleteMaskGroup: (groupId: string) => void;

  // Healing operations (Legacy compatibility)
  addHealingPin: (pin: HealingPin) => void;
  updateHealingPin: (id: string, updates: Partial<HealingPin>) => void;
  deleteHealingPin: (id: string) => void;

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
  healOperations: [],
  removalOperations: [],
  activePresetPreview: null,
  isBeforeAfter: false,
  beforeAfterMode: 'split',
  splitPosition: 0.5,
  zoom: 1.0,
  pan: { x: 0, y: 0 },

  overlayConfig: {
    showOverlay: false,
    overlayMode: 'color',
    overlayColor: [0.95, 0.2, 0.2],
    overlayOpacity: 50
  },

  brushSettings: {
    size: 50,
    feather: 50,
    flow: 100,
    density: 100,
    autoMask: true,
    isEraser: false
  },

  history: [
    {
      id: 'init_step',
      name: 'Initial State',
      timestamp: Date.now(),
      state: DEFAULT_DEVELOP_STATE
    }
  ],
  historyIndex: 0,
  snapshots: [],

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveMaskGroupId: (id) => set({ activeMaskGroupId: id }),
  setActiveComponentId: (id) => set({ activeComponentId: id }),
  setActivePresetPreview: (preset) => set({ activePresetPreview: preset }),
  setIsBeforeAfter: (enabled) => set({ isBeforeAfter: enabled }),
  setBeforeAfterMode: (mode) => set({ beforeAfterMode: mode }),
  setSplitPosition: (pos) => set({ splitPosition: pos }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setOverlayConfig: (updates) =>
    set((state) => ({ overlayConfig: { ...state.overlayConfig, ...updates } })),
  setBrushSettings: (updates) =>
    set((state) => ({ brushSettings: { ...state.brushSettings, ...updates } })),

  setDevelopState: (newState, recordHistory = false, stepName = 'Adjustment') => {
    const { history, historyIndex } = get();
    if (recordHistory) {
      const truncatedHistory = history.slice(0, historyIndex + 1);
      const newStep: HistoryStep = {
        id: 'hist_' + Math.random().toString(36).slice(2, 9),
        name: stepName,
        timestamp: Date.now(),
        state: newState
      };
      set({
        developState: newState,
        history: [...truncatedHistory, newStep],
        historyIndex: truncatedHistory.length
      });
    } else {
      set({ developState: newState });
    }
  },

  commitHistory: (stepName) => {
    const { developState, history, historyIndex } = get();
    const truncated = history.slice(0, historyIndex + 1);
    const newStep: HistoryStep = {
      id: 'hist_' + Math.random().toString(36).slice(2, 9),
      name: stepName,
      timestamp: Date.now(),
      state: developState
    };
    set({
      history: [...truncated, newStep],
      historyIndex: truncated.length
    });
  },

  // Heal Operations
  addHealOperation: (op) => {
    const { healOperations } = get();
    set({ healOperations: [...healOperations, op] });
  },
  updateHealOperation: (id, updates) => {
    const { healOperations } = get();
    set({
      healOperations: healOperations.map((h) => (h.id === id ? { ...h, ...updates } : h))
    });
  },
  deleteHealOperation: (id) => {
    const { healOperations } = get();
    set({ healOperations: healOperations.filter((h) => h.id !== id) });
  },

  // Removal Operations
  addRemovalOperation: (op) => {
    const { removalOperations } = get();
    set({ removalOperations: [...removalOperations, op] });
  },
  updateRemovalOperation: (id, updates) => {
    const { removalOperations } = get();
    set({
      removalOperations: removalOperations.map((r) => (r.id === id ? { ...r, ...updates } : r))
    });
  },
  deleteRemovalOperation: (id) => {
    const { removalOperations } = get();
    set({ removalOperations: removalOperations.filter((r) => r.id !== id) });
  },

  updateTone: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      tone: { ...developState.tone, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Tone Adjustment');
  },

  updateCurve: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      curve: { ...developState.curve, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Tone Curve');
  },

  updateHSL: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      hsl: { ...developState.hsl, ...updates }
    };
    setDevelopState(newState, recordHistory, 'HSL Adjustment');
  },

  updateColorGrading: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      colorGrading: { ...developState.colorGrading, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Color Grading');
  },

  updateDetail: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      detail: { ...developState.detail, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Detail Adjustment');
  },

  updateOptics: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      optics: { ...developState.optics, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Optics Adjustment');
  },

  updateCalibration: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      calibration: { ...developState.calibration, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Calibration');
  },

  updateGeometry: (updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newState = {
      ...developState,
      geometry: { ...developState.geometry, ...updates }
    };
    setDevelopState(newState, recordHistory, 'Crop & Geometry');
  },

  // Hierarchical Masking
  createMaskGroup: (initialComponent, groupName) => {
    const { developState, setDevelopState } = get();
    const typeLabel = (initialComponent.type || 'mask').toLowerCase();
    const count = developState.masks.length + 1;
    const name = groupName || (`Mask ${count} (${typeLabel})`);
    const id = `mask-${typeLabel}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const newGroup: MaskGroup = {
      id,
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

  addComponentToGroup: (groupId, component) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          components: [...g.components, component]
        };
      }
      return g;
    });
    setDevelopState({ ...developState, masks: newMasks }, true, 'Add Component to Mask');
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
    const { developState, setDevelopState } = get();
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
    setDevelopState({ ...developState, masks: newMasks }, true, 'Change Mask Combine Mode');
  },

  updateMaskGroup: (groupId, updates, recordHistory = false) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map((g) => (g.id === groupId ? { ...g, ...updates } : g));
    setDevelopState({ ...developState, masks: newMasks }, recordHistory, 'Update Mask');
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

    const dupId = `mask-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const dupGroup: MaskGroup = {
      ...group,
      id: dupId,
      name: group.name + ' Copy',
      components: group.components.map((c) => ({
        ...c,
        id: 'comp_' + Math.random().toString(36).slice(2, 9)
      })),
      adjustments: { ...group.adjustments }
    };

    setDevelopState({ ...developState, masks: [...developState.masks, dupGroup] }, true, 'Duplicate Mask');
    set({
      activeMaskGroupId: dupGroup.id,
      activeComponentId: dupGroup.components[0]?.id || null
    });
  },

  deleteMaskGroup: (groupId) => {
    const { developState, setDevelopState, activeMaskGroupId } = get();
    const newMasks = developState.masks.filter((g) => g.id !== groupId);
    setDevelopState({ ...developState, masks: newMasks }, true, 'Delete Mask');
    if (activeMaskGroupId === groupId) {
      set({
        activeMaskGroupId: newMasks.length > 0 ? newMasks[0].id : null,
        activeComponentId: newMasks.length > 0 ? (newMasks[0].components[0]?.id || null) : null
      });
    }
  },

  // Legacy Healing Pin support
  addHealingPin: (pin) => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, healing: [...developState.healing, pin] },
      true,
      'Add Healing Point'
    );
  },

  updateHealingPin: (id, updates) => {
    const { developState, setDevelopState } = get();
    setDevelopState({
      ...developState,
      healing: developState.healing.map((p) => (p.id === id ? { ...p, ...updates } : p))
    });
  },

  deleteHealingPin: (id) => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, healing: developState.healing.filter((p) => p.id !== id) },
      true,
      'Delete Healing Point'
    );
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      set({
        developState: history[prevIndex].state,
        historyIndex: prevIndex
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        developState: history[nextIndex].state,
        historyIndex: nextIndex
      });
    }
  },

  jumpToHistory: (index) => {
    const { history } = get();
    if (index >= 0 && index < history.length) {
      set({
        developState: history[index].state,
        historyIndex: index
      });
    }
  },

  createSnapshot: (name) => {
    const { developState, snapshots } = get();
    const newSnapshot: NamedSnapshot = {
      id: 'snap_' + Math.random().toString(36).slice(2, 9),
      name,
      timestamp: Date.now(),
      state: developState
    };
    set({ snapshots: [...snapshots, newSnapshot] });
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
    get().setDevelopState(DEFAULT_DEVELOP_STATE, true, 'Reset All Adjustments');
  },

  resetTone: () => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, tone: DEFAULT_DEVELOP_STATE.tone },
      true,
      'Reset Tone'
    );
  },

  resetCurve: () => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, curve: DEFAULT_DEVELOP_STATE.curve },
      true,
      'Reset Tone Curve'
    );
  },

  resetHSL: () => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, hsl: DEFAULT_DEVELOP_STATE.hsl },
      true,
      'Reset HSL'
    );
  },

  resetColorGrading: () => {
    const { developState, setDevelopState } = get();
    setDevelopState(
      { ...developState, colorGrading: DEFAULT_DEVELOP_STATE.colorGrading },
      true,
      'Reset Color Grading'
    );
  }
}));
