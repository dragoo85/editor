const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/HistoryPanel.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React, { useState } from 'react';
import { useEditStore } from '../../state/editStore';
import { History, Camera, Plus, Trash2, RotateCcw } from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const {
    history,
    historyIndex,
    revertToHistoryStep,
    snapshots,
    createSnapshot,
    applySnapshot,
    deleteSnapshot
  } = useEditStore();

  const [activeTab, setActiveTab] = useState<'history' | 'snapshots'>('history');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  const handleCreateSnapshot = () => {
    if (snapshotName.trim()) {
      createSnapshot(snapshotName.trim());
      setSnapshotName('');
      setIsCreatingSnapshot(false);
    }
  };

  return (
    <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full select-none text-xs overflow-y-auto">
      {/* Header Tabs */}
      <div className="p-2 border-b border-dark-800 flex items-center justify-between">
        <div className="grid grid-cols-2 gap-1 w-full bg-dark-850 p-0.5 rounded border border-dark-750 font-medium">
          <button
            onClick={() => setActiveTab('history')}
            className={'flex items-center justify-center gap-1.5 py-1 rounded text-[11px] transition-colors ' + (
              activeTab === 'history' ? 'bg-dark-700 text-white font-semibold' : 'text-dark-400 hover:text-white'
            )}
          >
            <History className="w-3 h-3" />
            History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={'flex items-center justify-center gap-1.5 py-1 rounded text-[11px] transition-colors ' + (
              activeTab === 'snapshots' ? 'bg-dark-700 text-white font-semibold' : 'text-dark-400 hover:text-white'
            )}
          >
            <Camera className="w-3 h-3" />
            Snapshots ({snapshots.length})
          </button>
        </div>
      </div>

      {/* History Timeline */}
      {activeTab === 'history' ? (
        <div className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {history.map((step, idx) => {
            const isCurrent = idx === historyIndex;
            const isPast = idx < historyIndex;

            return (
              <div
                key={idx}
                onClick={() => revertToHistoryStep(idx)}
                className={'flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ' + (
                  isCurrent
                    ? 'bg-accent-blue text-white font-semibold shadow-sm'
                    : isPast
                    ? 'text-dark-300 hover:bg-dark-850 hover:text-white'
                    : 'text-dark-600 hover:bg-dark-850 hover:text-dark-400'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                  <span className="truncate">{step.name}</span>
                </div>
                <span className="text-[9px] font-mono opacity-60">#{idx + 1}</span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Snapshots Manager */
        <div className="flex-1 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-dark-400 uppercase">SAVED SNAPSHOTS</span>
            <button
              onClick={() => setIsCreatingSnapshot(true)}
              className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-800"
              title="Create Snapshot"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCreatingSnapshot && (
            <div className="p-2 bg-dark-850 rounded border border-dark-750 flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Snapshot name..."
                value={snapshotName}
                autoFocus
                onChange={(e) => setSnapshotName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSnapshot();
                  if (e.key === 'Escape') setIsCreatingSnapshot(false);
                }}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none"
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsCreatingSnapshot(false)}
                  className="px-2 py-0.5 rounded bg-dark-750 text-dark-300 text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSnapshot}
                  className="px-2 py-0.5 rounded bg-accent-blue text-white text-[10px] font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {snapshots.length === 0 ? (
              <p className="text-[11px] text-dark-500 text-center py-2">
                No snapshots saved yet. Save a snapshot to bookmark your current edit state.
              </p>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => applySnapshot(snap.id)}
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-dark-300 hover:bg-dark-850 hover:text-white transition-colors"
                >
                  <span className="truncate">{snap.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSnapshot(snap.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-400 hover:text-rose-400"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved HistoryPanel.tsx');
