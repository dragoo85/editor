const fs = require('fs');
const path = require('path');
const full = path.resolve('src/engine/catalog/CatalogDB.ts');

const content = `import { PhotoRecord, Collection } from '../../types/image';

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
      } else {
        // Generate Starter Photographic Assets for instant professional out-of-the-box experience
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
          iso: 100,
          dateTimeOriginal: '2026-08-05 11:30:45',
          title: 'Curvilinear Glass & Steel Facade',
          caption: 'Contemporary architectural perspective and symmetry.',
          creator: 'Lumina Studio Pro',
          copyright: 'Creative Commons 0'
        }
      },
      {
        id: 'sample_coast_sunset',
        filename: 'PACIFIC_COAST_077.NEF',
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
        width: 2400,
        height: 1600,
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
        exif: s.exif as any
      };
      this.photos.set(record.id, record);
    }
  }

  private createSyntheticScene(type: string): { dataUrl: string; thumbUrl: string } {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', thumbUrl: '' };

    const { width, height } = canvas;

    if (type === 'mountain') {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.6);
      sky.addColorStop(0, '#1e3a8a');
      sky.addColorStop(0.5, '#3b82f6');
      sky.addColorStop(0.85, '#f59e0b');
      sky.addColorStop(1, '#ea580c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height * 0.6);

      // Sun
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(width * 0.65, height * 0.45, 55, 0, Math.PI * 2);
      ctx.fill();

      // Distant Mountains
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      ctx.lineTo(width * 0.2, height * 0.25);
      ctx.lineTo(width * 0.45, height * 0.45);
      ctx.lineTo(width * 0.7, height * 0.2);
      ctx.lineTo(width, height * 0.55);
      ctx.lineTo(width, height * 0.6);
      ctx.closePath();
      ctx.fill();

      // Foreground Mountain Ridge
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      ctx.lineTo(width * 0.35, height * 0.38);
      ctx.lineTo(width * 0.6, height * 0.55);
      ctx.lineTo(width * 0.85, height * 0.35);
      ctx.lineTo(width, height * 0.6);
      ctx.closePath();
      ctx.fill();

      // Lake Water Reflection
      const water = ctx.createLinearGradient(0, height * 0.6, 0, height);
      water.addColorStop(0, '#0c4a6e');
      water.addColorStop(0.5, '#0369a1');
      water.addColorStop(1, '#082f49');
      ctx.fillStyle = water;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);
    } else if (type === 'portrait') {
      // Warm studio background gradient
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 80, width * 0.5, height * 0.5, width * 0.6);
      bg.addColorStop(0, '#78350f');
      bg.addColorStop(0.5, '#451a03');
      bg.addColorStop(1, '#1c1917');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Soft silhouette
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.85, width * 0.25, height * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.4, width * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'architecture') {
      // Modern architectural geometric lines
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < width; i += 80) {
        ctx.strokeStyle = i % 160 === 0 ? '#38bdf8' : '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(width - i * 0.5, height);
        ctx.stroke();
      }
    } else {
      // Coastline sunset
      const sunset = ctx.createLinearGradient(0, 0, 0, height);
      sunset.addColorStop(0, '#581c87');
      sunset.addColorStop(0.3, '#c026d3');
      sunset.addColorStop(0.6, '#f97316');
      sunset.addColorStop(0.8, '#0284c7');
      sunset.addColorStop(1, '#0f172a');
      ctx.fillStyle = sunset;
      ctx.fillRect(0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Create thumbnail
    const thumb = document.createElement('canvas');
    thumb.width = 300;
    thumb.height = 200;
    const tctx = thumb.getContext('2d');
    tctx?.drawImage(canvas, 0, 0, 300, 200);
    const thumbUrl = thumb.toDataURL('image/jpeg', 0.8);

    return { dataUrl, thumbUrl };
  }

  private persist() {
    try {
      const photosArr = Array.from(this.photos.values());
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photosArr));
      const collArr = Array.from(this.collections.values());
      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(collArr));
    } catch (e) {
      console.warn('Storage limit:', e);
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
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved updated CatalogDB.ts with starter assets.');
