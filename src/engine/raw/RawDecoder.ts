import { ExifParser } from '../metadata/ExifParser';
import { PhotoRecord } from '../../types/image';

export interface DecodedImageResult {
  imageBitmap?: ImageBitmap;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  exif: any;
}

export class RawDecoder {
  private static supportedRawExtensions = new Set([
    'dng', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'pef', 'srw'
  ]);

  public static isRaw(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.supportedRawExtensions.has(ext);
  }

  /**
   * Decodes file buffer (RAW or Standard JPEG/PNG/WebP/TIFF).
   * For RAW files, extracts embedded full-resolution or preview JPEG stream quickly.
   */
  public static async decode(file: File | Blob, filename: string): Promise<DecodedImageResult> {
    const buffer = await file.arrayBuffer();
    const exif = await ExifParser.parse(buffer);
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    let previewBlob: Blob = file;

    if (this.isRaw(filename)) {
      // Find embedded JPEG preview inside RAW / DNG container
      const extractedBlob = this.extractEmbeddedPreview(new Uint8Array(buffer));
      if (extractedBlob) {
        previewBlob = extractedBlob;
      }
    }

    // Convert preview blob to persistent Data URL so it never dies on refresh
    const previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(previewBlob);
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image preview'));
      img.src = previewUrl;
      if (img.complete && img.naturalWidth > 0) resolve();
    });

    const width = exif.width || img.naturalWidth || 1920;
    const height = exif.height || img.naturalHeight || 1080;

    // Generate high-speed thumbnail
    const thumbCanvas = document.createElement('canvas');
    const maxThumbDim = 320;
    const scale = Math.min(1, maxThumbDim / Math.max(img.naturalWidth || 1200, img.naturalHeight || 800));
    thumbCanvas.width = Math.max(1, Math.round((img.naturalWidth || 1200) * scale));
    thumbCanvas.height = Math.max(1, Math.round((img.naturalHeight || 800) * scale));
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

    let imageBitmap: ImageBitmap | undefined;
    try {
      imageBitmap = await createImageBitmap(previewBlob);
    } catch {
      // fallback
    }

    return {
      imageBitmap,
      thumbnailUrl,
      previewUrl,
      width,
      height,
      exif
    };
  }

  /**
   * Scans TIFF / Exif tags or raw byte stream for SOI/EOI JPEG markers
   */
  private static extractEmbeddedPreview(bytes: Uint8Array): Blob | null {
    let bestStart = -1;
    let bestEnd = -1;
    let maxLen = 0;

    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        const start = i;
        for (let j = start + 1000; j < Math.min(bytes.length - 1, start + 25000000); j++) {
          if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
            const len = j + 2 - start;
            if (len > maxLen) {
              maxLen = len;
              bestStart = start;
              bestEnd = j + 2;
            }
            i = j;
            break;
          }
        }
      }
    }

    if (bestStart !== -1 && maxLen > 10000) {
      const jpegBytes = bytes.subarray(bestStart, bestEnd);
      return new Blob([jpegBytes], { type: 'image/jpeg' });
    }

    return null;
  }
}
