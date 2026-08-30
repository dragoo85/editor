import React, { useRef } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { useEditStore } from '../../state/editStore';
import { Compass, ZoomIn } from 'lucide-react';

export const NavigatorPanel: React.FC = () => {
  const { photos, activePhotoId } = useCatalogStore();
  const { zoom, pan, setZoom, setPan } = useEditStore();
  const navRef = useRef<HTMLDivElement>(null);

  const activePhoto = photos.find(p => p.id === activePhotoId) || photos[0];

  const handleNavClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width - 0.5;
    const clickY = (e.clientY - rect.top) / rect.height - 0.5;

    // Pan the main canvas relative to click point
    setPan({
      x: -clickX * 1200 * (zoom - 1),
      y: -clickY * 800 * (zoom - 1)
    });
  };

  return (
    <div className="bg-dark-900 border-b border-dark-800 flex flex-col select-none text-xs">
      {/* Navigator Header with Zoom Presets */}
      <div className="h-7 px-3 bg-dark-850 flex items-center justify-between border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5 text-dark-300">
          <Compass className="w-3.5 h-3.5 text-accent-blue" />
          <span>Navigator</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { label: 'FIT', val: 1.0 },
            { label: 'FILL', val: 1.35 },
            { label: '1:1', val: 2.0 },
            { label: '2:1', val: 3.0 }
          ].map((z) => (
            <button
              key={z.label}
              onClick={() => {
                setZoom(z.val);
                if (z.val === 1.0) setPan({ x: 0, y: 0 });
              }}
              className={'px-1.5 py-0.5 rounded transition-colors ' + (
                Math.abs(zoom - z.val) < 0.1 ? 'bg-dark-700 text-white font-bold' : 'hover:text-white'
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Miniature Preview with Draggable Pan Box */}
      <div
        ref={navRef}
        onClick={handleNavClick}
        className="relative h-28 w-full bg-dark-950 overflow-hidden flex items-center justify-center cursor-crosshair group"
      >
        {activePhoto && (
          <img
            src={activePhoto.thumbnailUrl || activePhoto.previewUrl}
            alt="Navigator Preview"
            className="w-full h-full object-contain pointer-events-none opacity-85"
          />
        )}

        {/* Viewport Box */}
        {zoom > 1.0 && (
          <div
            className="absolute border border-white/80 bg-white/10 pointer-events-none rounded-xs shadow"
            style={{
              width: (100 / zoom) + '%',
              height: (100 / zoom) + '%',
              left: Math.max(0, Math.min(100 - (100 / zoom), 50 - (50 / zoom) - (pan.x / (zoom * 12)))) + '%',
              top: Math.max(0, Math.min(100 - (100 / zoom), 50 - (50 / zoom) - (pan.y / (zoom * 8)))) + '%'
            }}
          />
        )}
      </div>
    </div>
  );
};
