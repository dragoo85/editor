const fs = require('fs');
const path = require('path');

function save(relPath, content) {
  const full = path.resolve(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Saved:', relPath);
}

// 1. CatalogDB.ts
save('src/engine/catalog/CatalogDB.ts', `import { PhotoRecord, Collection } from '../../types/image';

const STORAGE_KEY_PHOTOS = 'lumina_catalog_photos';
const STORAGE_KEY_COLLECTIONS = 'lumina_catalog_collections';

export class CatalogDB {
  private photos: Map<string, PhotoRecord> = new Map();
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const photosJson = localStorage.getItem(STORAGE_KEY_PHOTOS);
      if (photosJson) {
        const arr: PhotoRecord[] = JSON.parse(photosJson);
        for (const p of arr) this.photos.set(p.id, p);
      }

      const collJson = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
      if (collJson) {
        const arr: Collection[] = JSON.parse(collJson);
        for (const c of arr) this.collections.set(c.id, c);
      } else {
        this.addCollection({ id: 'favorites', name: 'Favorites', createdAt: Date.now() });
        this.addCollection({ id: 'picks', name: 'Flagged (Picks)', createdAt: Date.now() });
      }
    } catch (e) {
      console.error('Failed to load Catalog from storage:', e);
    }
  }

  private persist() {
    try {
      const photosArr = Array.from(this.photos.values());
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photosArr));
      const collArr = Array.from(this.collections.values());
      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(collArr));
    } catch (e) {
      console.warn('Storage persist limit exceeded:', e);
    }
  }

  public getAllPhotos(): PhotoRecord[] {
    return Array.from(this.photos.values());
  }

  public getPhotoById(id: string): PhotoRecord | undefined {
    return this.photos.get(id);
  }

  public addPhotos(records: PhotoRecord[]) {
    for (const r of records) {
      this.photos.set(r.id, r);
    }
    this.persist();
  }

  public updatePhoto(id: string, updates: Partial<PhotoRecord>) {
    const existing = this.photos.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.photos.set(id, updated);
      this.persist();
      return updated;
    }
    return undefined;
  }

  public deletePhotos(ids: string[]) {
    for (const id of ids) {
      this.photos.delete(id);
    }
    this.persist();
  }

  public getAllCollections(): Collection[] {
    return Array.from(this.collections.values());
  }

  public addCollection(collection: Collection) {
    this.collections.set(collection.id, collection);
    this.persist();
  }

  public deleteCollection(id: string) {
    this.collections.delete(id);
    this.persist();
  }
}
`);

// 2. catalogStore.ts
save('src/state/catalogStore.ts', `import { create } from 'zustand';
import { PhotoRecord, Collection, FlagType, ColorLabel } from '../types/image';
import { CatalogDB } from '../engine/catalog/CatalogDB';

export interface FilterState {
  searchQuery: string;
  minRating: number;
  flagFilter: 'all' | FlagType;
  colorFilter: 'all' | ColorLabel;
  cameraFilter: string;
  lensFilter: string;
  sortBy: 'date' | 'name' | 'rating' | 'flag';
  sortOrder: 'asc' | 'desc';
}

interface CatalogStore {
  photos: PhotoRecord[];
  selectedPhotoIds: string[];
  activePhotoId: string | null;
  collections: Collection[];
  activeCollectionId: string | null;
  filter: FilterState;
  activeView: 'library' | 'develop';
  db: CatalogDB;

  setActiveView: (view: 'library' | 'develop') => void;
  importPhotos: (newPhotos: PhotoRecord[]) => void;
  setSelectedPhotos: (ids: string[]) => void;
  toggleSelectPhoto: (id: string, isMulti: boolean) => void;
  setActivePhoto: (id: string | null) => void;
  selectNextPhoto: (direction: 1 | -1) => void;
  updatePhotoRating: (id: string, rating: number) => void;
  updatePhotoFlag: (id: string, flag: FlagType) => void;
  updatePhotoColorLabel: (id: string, color: ColorLabel) => void;
  updatePhotoMetadata: (id: string, metadata: any) => void;
  updatePhotoEditState: (id: string, editState: any) => void;
  deleteSelectedPhotos: () => void;
  setFilter: (updates: Partial<FilterState>) => void;
  setActiveCollection: (id: string | null) => void;
  createCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
}

const catalogDB = new CatalogDB();

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  photos: catalogDB.getAllPhotos(),
  selectedPhotoIds: [],
  activePhotoId: null,
  collections: catalogDB.getAllCollections(),
  activeCollectionId: null,
  activeView: 'library',
  db: catalogDB,

  filter: {
    searchQuery: '',
    minRating: 0,
    flagFilter: 'all',
    colorFilter: 'all',
    cameraFilter: 'all',
    lensFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  },

  setActiveView: (view) => set({ activeView: view }),

  importPhotos: (newPhotos) => {
    catalogDB.addPhotos(newPhotos);
    const all = catalogDB.getAllPhotos();
    set({
      photos: all,
      activePhotoId: newPhotos.length > 0 ? newPhotos[0].id : get().activePhotoId,
      selectedPhotoIds: newPhotos.length > 0 ? [newPhotos[0].id] : []
    });
  },

  setSelectedPhotos: (ids) => set({ selectedPhotoIds: ids }),

  toggleSelectPhoto: (id, isMulti) => {
    const { selectedPhotoIds } = get();
    if (!isMulti) {
      set({ selectedPhotoIds: [id], activePhotoId: id });
    } else {
      if (selectedPhotoIds.includes(id)) {
        set({ selectedPhotoIds: selectedPhotoIds.filter(x => x !== id) });
      } else {
        set({ selectedPhotoIds: [...selectedPhotoIds, id], activePhotoId: id });
      }
    }
  },

  setActivePhoto: (id) => set({
    activePhotoId: id,
    selectedPhotoIds: id ? [id] : []
  }),

  selectNextPhoto: (direction) => {
    const { photos, activePhotoId } = get();
    if (photos.length === 0) return;
    const currentIndex = photos.findIndex(p => p.id === activePhotoId);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= photos.length) nextIndex = photos.length - 1;
    const nextPhoto = photos[nextIndex];
    if (nextPhoto) {
      set({ activePhotoId: nextPhoto.id, selectedPhotoIds: [nextPhoto.id] });
    }
  },

  updatePhotoRating: (id, rating) => {
    const updated = catalogDB.updatePhoto(id, { rating });
    if (updated) {
      set({ photos: catalogDB.getAllPhotos() });
    }
  },

  updatePhotoFlag: (id, flag) => {
    const updated = catalogDB.updatePhoto(id, { flag });
    if (updated) {
      set({ photos: catalogDB.getAllPhotos() });
    }
  },

  updatePhotoColorLabel: (id, colorLabel) => {
    const updated = catalogDB.updatePhoto(id, { colorLabel });
    if (updated) {
      set({ photos: catalogDB.getAllPhotos() });
    }
  },

  updatePhotoMetadata: (id, exif) => {
    const photo = catalogDB.getPhotoById(id);
    if (photo) {
      const mergedExif = { ...photo.exif, ...exif };
      catalogDB.updatePhoto(id, { exif: mergedExif });
      set({ photos: catalogDB.getAllPhotos() });
    }
  },

  updatePhotoEditState: (id, editState) => {
    catalogDB.updatePhoto(id, { editState });
    set({ photos: catalogDB.getAllPhotos() });
  },

  deleteSelectedPhotos: () => {
    const { selectedPhotoIds } = get();
    catalogDB.deletePhotos(selectedPhotoIds);
    const remaining = catalogDB.getAllPhotos();
    set({
      photos: remaining,
      selectedPhotoIds: [],
      activePhotoId: remaining.length > 0 ? remaining[0].id : null
    });
  },

  setFilter: (updates) => set((state) => ({ filter: { ...state.filter, ...updates } })),

  setActiveCollection: (id) => set({ activeCollectionId: id }),

  createCollection: (name) => {
    const col: Collection = {
      id: 'col_' + Date.now(),
      name,
      createdAt: Date.now(),
      photoIds: []
    };
    catalogDB.addCollection(col);
    set({ collections: catalogDB.getAllCollections() });
  },

  deleteCollection: (id) => {
    catalogDB.deleteCollection(id);
    set({
      collections: catalogDB.getAllCollections(),
      activeCollectionId: get().activeCollectionId === id ? null : get().activeCollectionId
    });
  }
}));
`);

// 3. editStore.ts
save('src/state/editStore.ts', `import { create } from 'zustand';
import { DevelopState, DEFAULT_DEVELOP_STATE, DEFAULT_TONE, DEFAULT_CURVE, DEFAULT_HSL, DEFAULT_COLOR_GRADING, DEFAULT_DETAIL, DEFAULT_OPTICS, DEFAULT_GEOMETRY } from '../types/adjustments';
import { MaskLayer, HealingPin } from '../types/masks';

export type ActiveTool = 'select' | 'crop' | 'mask' | 'heal';
export type BeforeAfterMode = 'split' | 'sideBySide' | 'toggle';

export interface HistoryStep {
  name: string;
  timestamp: number;
  state: DevelopState;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  state: DevelopState;
}

interface EditStore {
  developState: DevelopState;
  activeTool: ActiveTool;
  activeMaskId: string | null;
  activePresetPreview: Partial<DevelopState> | null;
  isBeforeAfter: boolean;
  beforeAfterMode: BeforeAfterMode;
  splitPosition: number;
  zoom: number;
  pan: { x: number; y: number };
  showMaskOverlay: boolean;
  maskOverlayColor: [number, number, number];

  history: HistoryStep[];
  historyIndex: number;
  snapshots: Snapshot[];

  setDevelopState: (state: DevelopState, recordHistory?: boolean, stepName?: string) => void;
  updateTone: (updates: Partial<DevelopState['tone']>, stepName?: string) => void;
  updateCurve: (updates: Partial<DevelopState['curve']>, stepName?: string) => void;
  updateHSL: (updates: Partial<DevelopState['hsl']>, stepName?: string) => void;
  updateColorGrading: (updates: Partial<DevelopState['colorGrading']>, stepName?: string) => void;
  updateDetail: (updates: Partial<DevelopState['detail']>, stepName?: string) => void;
  updateOptics: (updates: Partial<DevelopState['optics']>, stepName?: string) => void;
  updateGeometry: (updates: Partial<DevelopState['geometry']>, stepName?: string) => void;
  
  addMask: (mask: MaskLayer) => void;
  updateMask: (id: string, updates: Partial<MaskLayer>) => void;
  deleteMask: (id: string) => void;
  setActiveMaskId: (id: string | null) => void;

  addHealingPin: (pin: HealingPin) => void;
  updateHealingPin: (id: string, updates: Partial<HealingPin>) => void;
  deleteHealingPin: (id: string) => void;

  undo: () => void;
  redo: () => void;
  revertToHistoryStep: (index: number) => void;
  createSnapshot: (name: string) => void;
  applySnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;

  resetAll: () => void;
  resetTone: () => void;
  resetCurve: () => void;
  resetHSL: () => void;
  resetColorGrading: () => void;
  resetDetail: () => void;
  resetOptics: () => void;
  resetGeometry: () => void;

  setActiveTool: (tool: ActiveTool) => void;
  setPresetPreview: (preview: Partial<DevelopState> | null) => void;
  toggleBeforeAfter: () => void;
  setBeforeAfterMode: (mode: BeforeAfterMode) => void;
  setSplitPosition: (pos: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setShowMaskOverlay: (show: boolean) => void;
}

export const useEditStore = create<EditStore>((set, get) => ({
  developState: DEFAULT_DEVELOP_STATE,
  activeTool: 'select',
  activeMaskId: null,
  activePresetPreview: null,
  isBeforeAfter: false,
  beforeAfterMode: 'split',
  splitPosition: 0.5,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  showMaskOverlay: true,
  maskOverlayColor: [0.95, 0.2, 0.2],

  history: [{ name: 'Import / Initial', timestamp: Date.now(), state: DEFAULT_DEVELOP_STATE }],
  historyIndex: 0,
  snapshots: [],

  setDevelopState: (newState, recordHistory = true, stepName = 'Adjustment') => {
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

  updateTone: (updates, stepName = 'Tone Adjustment') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      tone: { ...developState.tone, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateCurve: (updates, stepName = 'Tone Curve') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      curve: { ...developState.curve, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateHSL: (updates, stepName = 'HSL Mixer') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      hsl: { ...developState.hsl, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateColorGrading: (updates, stepName = 'Color Grading') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      colorGrading: { ...developState.colorGrading, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateDetail: (updates, stepName = 'Detail / Optics') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      detail: { ...developState.detail, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateOptics: (updates, stepName = 'Optics') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      optics: { ...developState.optics, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  updateGeometry: (updates, stepName = 'Geometry / Crop') => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      geometry: { ...developState.geometry, ...updates }
    };
    setDevelopState(newState, true, stepName);
  },

  addMask: (mask) => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      masks: [...developState.masks, mask]
    };
    setDevelopState(newState, true, 'Add Mask: ' + mask.name);
    set({ activeMaskId: mask.id, activeTool: 'mask' });
  },

  updateMask: (id, updates) => {
    const { developState, setDevelopState } = get();
    const newMasks = developState.masks.map(m => m.id === id ? { ...m, ...updates } : m);
    setDevelopState({ ...developState, masks: newMasks }, true, 'Update Mask');
  },

  deleteMask: (id) => {
    const { developState, setDevelopState, activeMaskId } = get();
    const newMasks = developState.masks.filter(m => m.id !== id);
    setDevelopState({ ...developState, masks: newMasks }, true, 'Delete Mask');
    if (activeMaskId === id) set({ activeMaskId: null });
  },

  setActiveMaskId: (id) => set({ activeMaskId: id }),

  addHealingPin: (pin) => {
    const { developState, setDevelopState } = get();
    const newState: DevelopState = {
      ...developState,
      healingPins: [...developState.healingPins, pin]
    };
    setDevelopState(newState, true, 'Add ' + (pin.type === 'heal' ? 'Heal' : 'Clone') + ' Spot');
  },

  updateHealingPin: (id, updates) => {
    const { developState, setDevelopState } = get();
    const newPins = developState.healingPins.map(p => p.id === id ? { ...p, ...updates } : p);
    setDevelopState({ ...developState, healingPins: newPins }, true, 'Update Spot');
  },

  deleteHealingPin: (id) => {
    const { developState, setDevelopState } = get();
    const newPins = developState.healingPins.filter(p => p.id !== id);
    setDevelopState({ ...developState, healingPins: newPins }, true, 'Delete Spot');
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      set({
        historyIndex: prevIndex,
        developState: history[prevIndex].state
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        historyIndex: nextIndex,
        developState: history[nextIndex].state
      });
    }
  },

  revertToHistoryStep: (index) => {
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
    const snap: Snapshot = {
      id: 'snap_' + Date.now(),
      name,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(developState))
    };
    set({ snapshots: [...snapshots, snap] });
  },

  applySnapshot: (id) => {
    const { snapshots, setDevelopState } = get();
    const snap = snapshots.find(s => s.id === id);
    if (snap) {
      setDevelopState(JSON.parse(JSON.stringify(snap.state)), true, 'Apply Snapshot: ' + snap.name);
    }
  },

  deleteSnapshot: (id) => {
    set(s => ({ snapshots: s.snapshots.filter(x => x.id !== id) }));
  },

  resetAll: () => get().setDevelopState(DEFAULT_DEVELOP_STATE, true, 'Reset All Adjustments'),
  resetTone: () => get().updateTone(DEFAULT_TONE, 'Reset Tone'),
  resetCurve: () => get().updateCurve(DEFAULT_CURVE, 'Reset Curve'),
  resetHSL: () => get().updateHSL(DEFAULT_HSL, 'Reset HSL'),
  resetColorGrading: () => get().updateColorGrading(DEFAULT_COLOR_GRADING, 'Reset Color Grading'),
  resetDetail: () => get().updateDetail(DEFAULT_DETAIL, 'Reset Detail'),
  resetOptics: () => get().updateOptics(DEFAULT_OPTICS, 'Reset Optics'),
  resetGeometry: () => get().updateGeometry(DEFAULT_GEOMETRY, 'Reset Geometry'),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setPresetPreview: (preview) => set({ activePresetPreview: preview }),
  toggleBeforeAfter: () => set(s => ({ isBeforeAfter: !s.isBeforeAfter })),
  setBeforeAfterMode: (mode) => set({ beforeAfterMode: mode }),
  setSplitPosition: (pos) => set({ splitPosition: Math.max(0, Math.min(1, pos)) }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setShowMaskOverlay: (show) => set({ showMaskOverlay: show })
}));
`);

console.log('Catalog & State Stores generated.');
