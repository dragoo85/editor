import React, { useRef, useEffect } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { Star, Flag, Check, X as RejectIcon } from 'lucide-react';
import { FlagType, ColorLabel } from '../../types/image';

const COLOR_MAP: Record<ColorLabel, string> = {
  none: 'transparent',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7'
};

export const Filmstrip: React.FC = () => {
  const {
    photos,
    selectedPhotoIds,
    activePhotoId,
    setActivePhoto,
    toggleSelectPhoto,
    updatePhotoRating,
    updatePhotoFlag,
    updatePhotoColorLabel
  } = useCatalogStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active photo into view
  useEffect(() => {
    if (activePhotoId && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-photo-id="' + activePhotoId + '"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activePhotoId]);

  if (photos.length === 0) return null;

  return (
    <div className="h-28 bg-dark-950 border-t border-dark-850 flex flex-col select-none z-30">
      {/* Filmstrip Reel Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-dark-900/60 border-b border-dark-850 text-[10px] text-dark-400">
        <span>FILMSTRIP ({photos.length} photos)</span>
        <div className="flex items-center gap-2">
          <span>Shortcuts: <strong>1-5</strong> Rating, <strong>P</strong> Pick, <strong>X</strong> Reject, <strong>U</strong> Unflag</span>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div ref={scrollRef} className="flex-1 flex items-center gap-2 px-3 overflow-x-auto overflow-y-hidden py-1.5 scrollbar-thin">
        {photos.map((photo, idx) => {
          const isActive = photo.id === activePhotoId;
          const isSelected = selectedPhotoIds.includes(photo.id);

          return (
            <div
              key={photo.id}
              data-photo-id={photo.id}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  toggleSelectPhoto(photo.id, true);
                } else {
                  setActivePhoto(photo.id);
                }
              }}
              className={'group relative flex-shrink-0 w-24 h-20 bg-dark-900 rounded border overflow-hidden cursor-pointer transition-all ' + (
                isActive
                  ? 'border-accent-blue ring-2 ring-accent-blue/30 shadow-lg'
                  : isSelected
                  ? 'border-white/60 bg-dark-800'
                  : 'border-dark-800 hover:border-dark-600'
              )}
            >
              {/* Thumbnail Image */}
              <img
                src={photo.thumbnailUrl}
                alt={photo.filename}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Color Label indicator bottom bar */}
              {photo.colorLabel !== 'none' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 z-10"
                  style={{ backgroundColor: COLOR_MAP[photo.colorLabel] }}
                />
              )}

              {/* Rating overlay stars */}
              <div className="absolute top-1 left-1 flex items-center gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-950/75 px-1 py-0.5 rounded backdrop-blur-xs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={(e) => {
                      e.stopPropagation();
                      updatePhotoRating(photo.id, photo.rating === star ? 0 : star);
                    }}
                    className={'p-0 hover:scale-125 transition-transform ' + (
                      photo.rating >= star ? 'text-amber-400' : 'text-dark-500'
                    )}
                  >
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </button>
                ))}
              </div>

              {/* Flag Badge indicator */}
              {photo.flag !== 'none' && (
                <div className={'absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold z-10 flex items-center gap-0.5 ' + (
                  photo.flag === 'pick'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                )}>
                  {photo.flag === 'pick' ? <Check className="w-2.5 h-2.5" /> : <RejectIcon className="w-2.5 h-2.5" />}
                </div>
              )}

              {/* Star count if rated and not hovered */}
              {photo.rating > 0 && (
                <div className="absolute bottom-1.5 left-1 px-1 py-0.2 rounded bg-dark-950/80 text-amber-400 flex items-center gap-0.5 text-[9px] font-mono group-hover:opacity-0">
                  <Star className="w-2 h-2 fill-current" />
                  <span>{photo.rating}</span>
                </div>
              )}

              {/* Filename index badge */}
              <div className="absolute bottom-1 right-1 text-[8px] font-mono text-dark-300 bg-dark-950/70 px-1 rounded">
                #{idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
