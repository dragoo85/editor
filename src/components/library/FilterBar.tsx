import React from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { Search, Star, Check, X, ArrowUpDown } from 'lucide-react';
import { ColorLabel } from '../../types/image';

const COLOR_BUTTONS: { label: ColorLabel; bg: string }[] = [
  { label: 'red', bg: 'bg-red-500' },
  { label: 'yellow', bg: 'bg-yellow-500' },
  { label: 'green', bg: 'bg-green-500' },
  { label: 'blue', bg: 'bg-blue-500' },
  { label: 'purple', bg: 'bg-purple-500' }
];

export const FilterBar: React.FC = () => {
  const { filter, setFilter } = useCatalogStore();

  return (
    <div className="h-10 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4 text-xs select-none z-20">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-dark-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by filename, camera, lens, keyword..."
            value={filter.searchQuery}
            onChange={(e) => setFilter({ searchQuery: e.target.value })}
            className="w-72 pl-8 pr-3 py-1 bg-dark-850 border border-dark-750 rounded text-dark-200 placeholder-dark-500 focus:border-accent-blue focus:outline-none text-xs"
          />
          {filter.searchQuery && (
            <button
              onClick={() => setFilter({ searchQuery: '' })}
              className="absolute right-2 text-dark-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-dark-850 px-2 py-0.5 rounded border border-dark-750">
          <span className="text-[10px] text-dark-400 mr-1 font-medium">RATING:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setFilter({ minRating: filter.minRating === star ? 0 : star })}
              className={'p-0.5 transition-colors ' + (
                filter.minRating >= star ? 'text-amber-400' : 'text-dark-600 hover:text-dark-400'
              )}
              title={'Filter >= ' + star + ' stars'}
            >
              <Star className="w-3 h-3 fill-current" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-dark-850 px-1 py-0.5 rounded border border-dark-750">
          <button
            onClick={() => setFilter({ flagFilter: 'all' })}
            className={'px-1.5 py-0.5 rounded text-[10px] font-medium ' + (
              filter.flagFilter === 'all' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter({ flagFilter: filter.flagFilter === 'pick' ? 'all' : 'pick' })}
            className={'p-1 rounded ' + (
              filter.flagFilter === 'pick' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-dark-400 hover:text-white'
            )}
            title="Picks only"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setFilter({ flagFilter: filter.flagFilter === 'reject' ? 'all' : 'reject' })}
            className={'p-1 rounded ' + (
              filter.flagFilter === 'reject' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'text-dark-400 hover:text-white'
            )}
            title="Rejects only"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-dark-850 px-2 py-1 rounded border border-dark-750">
          {COLOR_BUTTONS.map((c) => (
            <button
              key={c.label}
              onClick={() => setFilter({ colorFilter: filter.colorFilter === c.label ? 'all' : c.label })}
              className={'w-3 h-3 rounded-full ' + c.bg + ' transition-transform ' + (
                filter.colorFilter === c.label ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
              )}
              title={'Filter by color: ' + c.label}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 text-dark-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-dark-400" />
          <select
            value={filter.sortBy}
            onChange={(e) => setFilter({ sortBy: e.target.value as any })}
            className="bg-dark-850 border border-dark-750 rounded px-2 py-0.5 text-xs text-dark-200 outline-none cursor-pointer"
          >
            <option value="date">Date Taken</option>
            <option value="name">File Name</option>
            <option value="rating">Rating</option>
            <option value="flag">Flag Status</option>
          </select>
          <button
            onClick={() => setFilter({ sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="px-1.5 py-0.5 bg-dark-850 border border-dark-750 rounded text-[10px] font-mono text-dark-300 hover:text-white"
          >
            {filter.sortOrder.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
