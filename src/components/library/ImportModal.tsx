import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { RawDecoder } from '../../engine/raw/RawDecoder';
import { PhotoRecord } from '../../types/image';
import { FolderOpen, Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { importPhotos } = useCatalogStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    const records: PhotoRecord[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));

      try {
        const decoded = await RawDecoder.decode(file, file.name);
        const record: PhotoRecord = {
          id: 'photo_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6),
          path: file.name,
          filename: file.name,
          extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
          width: decoded.width,
          height: decoded.height,
          sizeBytes: file.size,
          dateModified: file.lastModified,
          dateTaken: file.lastModified,
          rating: 0,
          flag: 'none',
          colorLabel: 'none',
          collections: [],
          isFavorite: false,
          thumbnailUrl: decoded.thumbnailUrl,
          previewUrl: decoded.previewUrl,
          exif: decoded.exif
        };
        records.push(record);
      } catch (err) {
        console.error('Failed to decode image during import:', err);
      }
    }

    importPhotos(records);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
      <div className="w-[560px] bg-dark-900 border border-dark-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 bg-dark-850 border-b border-dark-750">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-semibold text-white">Import Photographs</h3>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-750">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4 text-xs">
          <div className="border-2 border-dashed border-dark-700 hover:border-accent-blue rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer relative bg-dark-850/40">
            <input
              type="file"
              multiple
              accept="image/*,.dng,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.tiff,.tif"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-full bg-accent-blue/15 flex items-center justify-center text-accent-blue">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Click or drag & drop photographs here</p>
              <p className="text-xs text-dark-400 mt-1">Supports RAW (DNG, CR2, NEF, ARW, ORF), JPEG, PNG, TIFF, WebP</p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded bg-dark-850 border border-dark-750">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-medium">{selectedFiles.length} photo{selectedFiles.length === 1 ? '' : 's'} selected</span>
              </div>
              <span className="font-mono text-dark-400">
                {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs text-accent-blue">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating GPU thumbnails & parsing EXIF...
                </span>
                <span className="font-mono text-white">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-dark-750 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-blue transition-all duration-150 rounded-full"
                  style={{ width: progress + '%' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-dark-850 border-t border-dark-750">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-1.5 rounded bg-dark-750 hover:bg-dark-700 text-dark-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || selectedFiles.length === 0}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded bg-accent-blue hover:bg-blue-600 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Import {selectedFiles.length > 0 ? selectedFiles.length + ' Photos' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
