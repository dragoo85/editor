import React from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { photos, selectedPhotoIds, activePhotoId } = useCatalogStore();
  const { zoom, developState } = useEditStore();

  const activePhoto = photos.find(p => p.id === activePhotoId);

  return (
    <div className="h-6 bg-dark-950 border-t border-dark-850 flex items-center justify-between px-3 text-[11px] text-dark-400 select-none z-30">
      {/* Active Photo Info */}
      <div className="flex items-center gap-3">
        {activePhoto ? (
          <>
            <span className="text-dark-200 font-medium">{activePhoto.filename}</span>
            <span>{activePhoto.width} � {activePhoto.height} px</span>
            {activePhoto.exif?.iso && (
              <span className="font-mono">ISO {activePhoto.exif.iso}</span>
            )}
            {activePhoto.exif?.fNumber && (
              <span className="font-mono">{activePhoto.exif.fNumber}</span>
            )}
            {activePhoto.exif?.exposureTime && (
              <span className="font-mono">{activePhoto.exif.exposureTime}s</span>
            )}
          </>
        ) : (
          <span>No photo selected</span>
        )}
      </div>

      {/* Performance & Status Badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-dark-300">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>GPU Acceleration (WebGL2 Float32)</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Offline & Private</span>
        </div>
        <span className="font-mono text-dark-300">Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
