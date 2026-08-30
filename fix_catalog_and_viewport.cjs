const fs = require('fs');
const path = require('path');

// 1. Rewrite CatalogDB.ts with ultra-reliable scene generation and validation
fs.writeFileSync(path.resolve('src/engine/catalog/CatalogDB.ts'), `import { PhotoRecord, Collection } from '../../types/image';

const STORAGE_KEY_PHOTOS = 'lumina_catalog_photos_v2';
const STORAGE_KEY_COLLECTIONS = 'lumina_catalog_collections_v2';

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
        for (const p of arr) {
          // If preview is missing or empty, regenerate
          if (!p.previewUrl || p.previewUrl.length < 50) {
            const { dataUrl, thumbUrl } = this.createSyntheticScene(p.scene || 'mountain');
            p.previewUrl = dataUrl;
            p.thumbnailUrl = thumbUrl;
          }
          this.photos.set(p.id, p);
        }
      }

      if (this.photos.size === 0) {
        this.generateStarterSamples();
      }

      const collJson = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
      if (collJson) {
        const arr: Collection[] = JSON.parse(collJson);
        for (const c of arr) this.collections.set(c.id, c);
      } else {
        this.addCollection({ id: 'favorites', name: 'Favorites', createdAt: Date.now() });
        this.addCollection({ id: 'picks', name: 'Flagged (Picks)', createdAt: Date.now() });
        this.addCollection({ id: 'landscapes', name: 'Landscapes & Nature', createdAt: Date.now() });
        this.addCollection({ id: 'portraits', name: 'Studio & Portraits', createdAt: Date.now() });
      }
    } catch (e) {
      console.error('Failed to load Catalog from storage:', e);
      this.generateStarterSamples();
    }
  }

  private generateStarterSamples() {
    const samples = [
      {
        id: 'sample_mountain_raw',
        filename: 'LUMINA_RAW_0142.DNG',
        extension: 'dng',
        scene: 'mountain',
        rating: 5,
        flag: 'pick',
        colorLabel: 'blue',
        exif: {
          make: 'Sony',
          model: 'ILCE-7RM5',
          lens: 'FE 24-70mm F2.8 GM II',
          focalLength: '35 mm',
          fNumber: 'f/8.0',
          exposureTime: '1/125',
          iso: 100,
          dateTimeOriginal: '2026-06-14 06:42:18',
          title: 'Alpine Sunrise over Glacial Valley',
          caption: 'Early morning golden light striking alpine peak and reflections.',
          creator: 'Lumina Studio Pro',
          copyright: 'Creative Commons 0'
        }
      },
      {
        id: 'sample_portrait_studio',
        filename: 'PORTRAIT_SESSION_089.CR2',
        extension: 'cr2',
        scene: 'portrait',
        rating: 4,
        flag: 'pick',
        colorLabel: 'yellow',
        exif: {
          make: 'Canon',
          model: 'EOS R5',
          lens: 'RF 85mm F1.2 L USM',
          focalLength: '85 mm',
          fNumber: 'f/1.4',
          exposureTime: '1/250',
          iso: 160,
          dateTimeOriginal: '2026-07-20 14:15:32',
          title: 'Natural Light Studio Portrait',
          caption: 'Window-lit close-up portrait with soft falloff.',
          creator: 'Lumina Studio Pro',
          copyright: 'Creative Commons 0'
        }
      },
      {
        id: 'sample_architecture_urban',
        filename: 'URBAN_GEOMETRY_031.ARW',
        extension: 'arw',
        scene: 'architecture',
        rating: 4,
        flag: 'none',
        colorLabel: 'green',
        exif: {
          make: 'Fujifilm',
          model: 'GFX 100S',
          lens: 'GF 23mm F4 R LM WR',
          focalLength: '23 mm',
          fNumber: 'f/11.0',
          exposureTime: '1/60',
          iso: 200,
          dateTimeOriginal: '2026-08-01 11:30:45',
          title: 'Minimalist Modern Skyline',
          caption: 'High-contrast steel and glass skyscraper reflections.',
          creator: 'Lumina Studio Pro',
          copyright: 'Creative Commons 0'
        }
      },
      {
        id: 'sample_coastline_sunset',
        filename: 'PACIFIC_COAST_076.NEF',
        extension: 'nef',
        scene: 'coast',
        rating: 5,
        flag: 'pick',
        colorLabel: 'red',
        exif: {
          make: 'Nikon',
          model: 'Z 8',
          lens: 'NIKKOR Z 14-24mm f/2.8 S',
          focalLength: '18 mm',
          fNumber: 'f/16.0',
          exposureTime: '2.5',
          iso: 64,
          dateTimeOriginal: '2026-08-12 19:54:10',
          title: 'Golden Hour Long Exposure Coastline',
          caption: 'Silky waves crashing onto sea stack rocks during sunset.',
          creator: 'Lumina Studio Pro',
          copyright: 'Creative Commons 0'
        }
      }
    ];

    for (const s of samples) {
      const { dataUrl, thumbUrl } = this.createSyntheticScene(s.scene);
      const record: PhotoRecord = {
        id: s.id,
        path: s.filename,
        filename: s.filename,
        extension: s.extension,
        width: 1200,
        height: 800,
        sizeBytes: 34500000,
        dateModified: Date.now() - Math.random() * 10000000,
        dateTaken: Date.now() - Math.random() * 10000000,
        rating: s.rating,
        flag: s.flag as any,
        colorLabel: s.colorLabel as any,
        collections: ['favorites'],
        isFavorite: true,
        thumbnailUrl: thumbUrl,
        previewUrl: dataUrl,
        scene: s.scene,
        exif: s.exif as any
      };
      this.photos.set(record.id, record);
    }
    this.persist();
  }

  private createSyntheticScene(type: string): { dataUrl: string; thumbUrl: string } {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', thumbUrl: '' };

    const { width, height } = canvas;

    if (type === 'mountain') {
      // Alpine Sunrise
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.65);
      sky.addColorStop(0, '#1e3a8a');
      sky.addColorStop(0.4, '#3b82f6');
      sky.addColorStop(0.75, '#fb923c');
      sky.addColorStop(1, '#f43f5e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height * 0.65);

      // Glowing Sun
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(width * 0.68, height * 0.45, 45, 0, Math.PI * 2);
      ctx.fill();

      // Back Mountains
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.65);
      ctx.lineTo(width * 0.2, height * 0.28);
      ctx.lineTo(width * 0.45, height * 0.5);
      ctx.lineTo(width * 0.72, height * 0.22);
      ctx.lineTo(width, height * 0.6);
      ctx.lineTo(width, height * 0.65);
      ctx.closePath();
      ctx.fill();

      // Front Mountain Ridge
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.65);
      ctx.lineTo(width * 0.35, height * 0.42);
      ctx.lineTo(width * 0.6, height * 0.58);
      ctx.lineTo(width * 0.88, height * 0.38);
      ctx.lineTo(width, height * 0.65);
      ctx.closePath();
      ctx.fill();

      // Lake Water Reflection
      const water = ctx.createLinearGradient(0, height * 0.65, 0, height);
      water.addColorStop(0, '#0c4a6e');
      water.addColorStop(0.5, '#0284c7');
      water.addColorStop(1, '#082f49');
      ctx.fillStyle = water;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);
    } else if (type === 'portrait') {
      // Warm studio portrait background
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 50, width * 0.5, height * 0.5, width * 0.55);
      bg.addColorStop(0, '#854d0e');
      bg.addColorStop(0.5, '#451a03');
      bg.addColorStop(1, '#1c1917');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Portrait Torso
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.88, width * 0.28, height * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head Silhouette
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.42, width * 0.13, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'architecture') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < width; i += 60) {
        ctx.strokeStyle = i % 120 === 0 ? '#38bdf8' : '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(width - i * 0.4, height);
        ctx.stroke();
      }
    } else {
      // Sunset Coastline
      const sunset = ctx.createLinearGradient(0, 0, 0, height);
      sunset.addColorStop(0, '#4c1d95');
      sunset.addColorStop(0.35, '#c026d3');
      sunset.addColorStop(0.65, '#ea580c');
      sunset.addColorStop(0.85, '#0284c7');
      sunset.addColorStop(1, '#020617');
      ctx.fillStyle = sunset;
      ctx.fillRect(0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Create thumbnail
    const thumb = document.createElement('canvas');
    thumb.width = 240;
    thumb.height = 160;
    const tctx = thumb.getContext('2d');
    tctx?.drawImage(canvas, 0, 0, 240, 160);
    const thumbUrl = thumb.toDataURL('image/jpeg', 0.75);

    return { dataUrl, thumbUrl };
  }

  private persist() {
    try {
      const photosArr = Array.from(this.photos.values());
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photosArr));
      const collArr = Array.from(this.collections.values());
      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(collArr));
    } catch (e) {
      console.warn('Storage limit reached:', e);
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
`, 'utf8');

console.log('CatalogDB.ts updated with optimized HD scenes and storage resilience.');
