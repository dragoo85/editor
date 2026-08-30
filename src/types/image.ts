export type FlagType = 'none' | 'pick' | 'reject';
export type ColorLabel = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';

export interface ExifMetadata {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: string;
  fNumber?: string;
  exposureTime?: string;
  iso?: number;
  exposureBias?: string;
  whiteBalance?: string;
  meteringMode?: string;
  dateTimeOriginal?: string;
  width?: number;
  height?: number;
  orientation?: number;
  latitude?: number;
  longitude?: number;
  title?: string;
  caption?: string;
  copyright?: string;
  creator?: string;
  keywords?: string[];
}

export interface PhotoRecord {
  id: string;
  path: string;
  filename: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
  dateModified: number;
  dateTaken?: number;
  rating: number; // 0 to 5
  flag: FlagType;
  colorLabel: ColorLabel;
  collections: string[];
  isFavorite: boolean;
  thumbnailUrl: string;
  previewUrl: string;
  exif: ExifMetadata;
  editState?: any;
}

export interface Collection {
  id: string;
  name: string;
  isSmart?: boolean;
  photoIds?: string[];
  createdAt: number;
}
