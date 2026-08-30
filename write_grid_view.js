const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/library/GridView.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { Star, Check, X } from 'lucide-react';
import { ColorLabel } from '../../types/image';

const COLOR_MAP: Record<ColorLabel, string> = {
  none: 'transparent',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7'
};

export const GridView: React.FC = () => {
  const {
    photos,
    selectedPhotoIds,
    activePhotoId,
    setActivePhoto,
    toggleSelectPhoto,
    updatePhotoRating,
    filter,
    setActiveView
  } = useCatalogStore();

  const [thumbSize, setThumbSize] = useState(180);

  const filteredPhotos = photos.filter((p) => {
    if (filter.minRating > 0 && p.rating < filter.minRating) return false;
    if (filter.flagFilter !== 'all' && p.flag !== filter.flagFilter) return false;
    if (filter.colorFilter !== 'all' && p.colorLabel !== filter.colorFilter) return false;
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase();
      const matchName = p.filename.toLowerCase().includes(q);
      const matchCam = p.exif?.model?.toLowerCase().includes(q);
      const matchLens = p.exif?.lens?.toLowerCase().includes(q);
      const matchKw = p.exif?.keywords?.some(k => k.toLowerCase().includes(q));
      if (!matchName && !matchCam && !matchLens && !matchKw) return false;
    }
    return true;
  });

  filteredPhotos.sort((a, b) => {
    let cmp = 0;
    if (filter.sortBy === 'date') cmp = (b.dateModified || 0) - (a.dateModified || 0);
    else if (filter.sortBy === 'name') cmp = a.filename.localeCompare(b.filename);
    else if (filter.sortBy === 'rating') cmp = (b.rating || 0) - (a.rating || 0);
    else if (filter.sortBy === 'flag') cmp = (b.flag === 'pick' ? 1 : 0) - (a.flag === 'pick' ? 1 : 0);
    return filter.sortOrder === 'asc' ? -cmp : cmp;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-950 select-none overflow-hidden">
      <div className="h-8 bg-dark-900/80 border-b border-dark-800 flex items-center justify-between px-4 text-xs text-dark-400">
        <span>
          Showing <strong>{filteredPhotos.length}</strong> of {photos.length} photos
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[10px]">Grid Size:</span>
          <input
            type="range"
            min={100}
            max={320}
            value={thumbSize}
            onChange={(e) => setThumbSize(parseInt(e.target.value))}
            className="w-24 h-1 bg-dark-700 rounded appearance-none cursor-pointer accent-accent-blue"
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {filteredPhotos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-500 gap-2">
            <p className="text-sm">No photographs found matching the current filters.</p>
            <p className="text-xs text-dark-600">Try clearing your search or rating filters.</p>
          </div>
        ) : (
          <div
            className="grid gap-3.5 justify-center"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(' + thumbSize + 'px, 1fr))' }}
          >
            {filteredPhotos.map((photo) => {
              const isActive = photo.id === activePhotoId;
              const isSelected = selectedPhotoIds.includes(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                      toggleSelectPhoto(photo.id, true);
                    } else {
                      setActivePhoto(photo.id);
                    }
                  }}
                  onDoubleClick={() => {
                    setActivePhoto(photo.id);
                    setActiveView('develop');
                  }}
                  className={'group relative bg-dark-900 rounded-md border overflow-hidden cursor-pointer transition-all flex flex-col ' + (
                    isActive
                      ? 'border-accent-blue ring-2 ring-accent-blue/40 shadow-xl'
                      : isSelected
                      ? 'border-white/70 bg-dark-800'
                      : 'border-dark-800 hover:border-dark-600 shadow-md'
                  )}
                  style={{ height: (thumbSize * 1.1) + 'px' }}
                >
                  <div className="relative flex-1 bg-dark-950 overflow-hidden flex items-center justify-center">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    {photo.colorLabel !== 'none' && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1.5 z-10"
                        style={{ backgroundColor: COLOR_MAP[photo.colorLabel] }}
                      />
                    )}

                    {photo.flag !== 'none' && (
                      <div className={'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold z-10 flex items-center gap-1 shadow ' + (
                        photo.flag === 'pick' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      )}>
                        {photo.flag === 'pick' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{photo.flag.toUpperCase()}</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-950/85 px-1.5 py-1 rounded backdrop-blur-xs">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePhotoRating(photo.id, photo.rating === star ? 0 : star);
                          }}
                          className={'p-0.5 hover:scale-125 transition-transform ' + (
                            photo.rating >= star ? 'text-amber-400' : 'text-dark-600 hover:text-dark-400'
                          )}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-2.5 py-1.5 bg-dark-900 border-t border-dark-800 flex items-center justify-between text-[11px]">
                    <span className="truncate text-dark-200 font-medium">{photo.filename}</span>
                    {photo.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-400 font-mono font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{photo.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved GridView.tsx');
