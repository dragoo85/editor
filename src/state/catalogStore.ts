import { create } from 'zustand';
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
const initialPhotos = catalogDB.getAllPhotos();

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  photos: initialPhotos,
  selectedPhotoIds: initialPhotos.length > 0 ? [initialPhotos[0].id] : [],
  activePhotoId: initialPhotos.length > 0 ? initialPhotos[0].id : null,
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
