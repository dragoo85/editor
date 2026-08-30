import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import {
  Folder,
  FolderPlus,
  Star,
  Flag,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

export const FolderTree: React.FC = () => {
  const {
    photos,
    collections,
    activeCollectionId,
    setActiveCollection,
    createCollection,
    deleteCollection,
    setFilter,
    filter
  } = useCatalogStore();

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName] = useState('');

  const handleCreate = () => {
    if (newColName.trim()) {
      createCollection(newColName.trim());
      setNewColName('');
      setIsCreatingCollection(false);
    }
  };

  const favoriteCount = photos.filter(p => p.rating >= 4).length;
  const pickCount = photos.filter(p => p.flag === 'pick').length;

  return (
    <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full select-none text-xs overflow-y-auto">
      {/* Catalog & Smart Collections */}
      <div className="p-3 border-b border-dark-800">
        <span className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">CATALOG</span>
        <div className="mt-2 flex flex-col gap-0.5">
          <button
            onClick={() => {
              setActiveCollection(null);
              setFilter({ flagFilter: 'all', minRating: 0, colorFilter: 'all' });
            }}
            className={'flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ' + (
              activeCollectionId === null && filter.flagFilter === 'all' && filter.minRating === 0
                ? 'bg-accent-blue text-white font-semibold'
                : 'text-dark-300 hover:bg-dark-850 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>All Photographs</span>
            </div>
            <span className="font-mono text-[11px] opacity-75">{photos.length}</span>
          </button>

          <button
            onClick={() => {
              setActiveCollection(null);
              setFilter({ minRating: 4 });
            }}
            className={'flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ' + (
              filter.minRating === 4
                ? 'bg-accent-blue text-white font-semibold'
                : 'text-dark-300 hover:bg-dark-850 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Rated (4-5?)</span>
            </div>
            <span className="font-mono text-[11px] opacity-75">{favoriteCount}</span>
          </button>

          <button
            onClick={() => {
              setActiveCollection(null);
              setFilter({ flagFilter: 'pick' });
            }}
            className={'flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ' + (
              filter.flagFilter === 'pick'
                ? 'bg-accent-blue text-white font-semibold'
                : 'text-dark-300 hover:bg-dark-850 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Flagged Picks</span>
            </div>
            <span className="font-mono text-[11px] opacity-75">{pickCount}</span>
          </button>
        </div>
      </div>

      {/* User Collections */}
      <div className="p-3 border-b border-dark-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">COLLECTIONS</span>
          <button
            onClick={() => setIsCreatingCollection(true)}
            className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-800"
            title="Create Collection"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isCreatingCollection && (
          <div className="mt-2 flex items-center gap-1">
            <input
              type="text"
              placeholder="Collection name..."
              value={newColName}
              autoFocus
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreatingCollection(false);
              }}
              className="w-full px-2 py-1 bg-dark-800 border border-accent-blue text-white rounded text-xs outline-none"
            />
            <button onClick={handleCreate} className="px-2 py-1 bg-accent-blue text-white rounded text-xs font-bold">
              +
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-0.5">
          {collections.map((col) => (
            <div
              key={col.id}
              onClick={() => setActiveCollection(col.id)}
              className={'group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ' + (
                activeCollectionId === col.id
                  ? 'bg-accent-blue text-white font-semibold'
                  : 'text-dark-300 hover:bg-dark-850 hover:text-white'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                <span className="truncate">{col.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollection(col.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-dark-400 hover:text-rose-400 rounded transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
