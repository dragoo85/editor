import { NavigatorPanel } from './components/develop/NavigatorPanel';
import React, { useState, useEffect } from 'react';
import { useCatalogStore } from './state/catalogStore';
import { useEditStore } from './state/editStore';
import { TitleBar } from './components/layout/TitleBar';
import { TopNav } from './components/layout/TopNav';
import { Filmstrip } from './components/layout/Filmstrip';
import { StatusBar } from './components/layout/StatusBar';
import { FolderTree } from './components/library/FolderTree';
import { FilterBar } from './components/library/FilterBar';
import { GridView } from './components/library/GridView';
import { MetadataPanel } from './components/library/MetadataPanel';
import { CanvasViewport } from './components/develop/CanvasViewport';
import { DevelopRightPanel } from './components/develop/DevelopRightPanel';
import { PresetsPanel } from './components/develop/PresetsPanel';
import { HistoryPanel } from './components/develop/HistoryPanel';
import { ImportModal } from './components/library/ImportModal';
import { ExportDialog } from './components/common/ExportDialog';
import { SyncModal } from './components/common/SyncModal';

export const App: React.FC = () => {
  const {
    activeView,
    setActiveView,
    activePhotoId,
    updatePhotoRating,
    updatePhotoFlag,
    updatePhotoColorLabel,
    selectNextPhoto
  } = useCatalogStore();

  const {
    undo,
    redo,
    toggleBeforeAfter,
    setActiveTool
  } = useEditStore();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [developLeftTab, setDevelopLeftTab] = useState<'presets' | 'history'>('presets');

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        return;
      }

      // View modes
      if (e.key.toLowerCase() === 'g') {
        setActiveView('library');
        return;
      }
      if (e.key.toLowerCase() === 'd') {
        setActiveView('develop');
        return;
      }

      // Tools
      if (e.key.toLowerCase() === 'v') setActiveTool('select');
      if (e.key.toLowerCase() === 'c') setActiveTool('crop');
      if (e.key.toLowerCase() === 'm') setActiveTool('mask');
      if (e.key.toLowerCase() === 'h') setActiveTool('heal');

      // Before / After
      if (e.key === '\\') {
        toggleBeforeAfter();
        return;
      }

      // Photo Navigation
      if (e.key === 'ArrowRight') {
        selectNextPhoto(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        selectNextPhoto(-1);
        return;
      }

      // Ratings & Flags on active photo
      if (activePhotoId) {
        if (e.key >= '0' && e.key <= '5') {
          updatePhotoRating(activePhotoId, parseInt(e.key));
        } else if (e.key.toLowerCase() === 'p') {
          updatePhotoFlag(activePhotoId, 'pick');
        } else if (e.key.toLowerCase() === 'x') {
          updatePhotoFlag(activePhotoId, 'reject');
        } else if (e.key.toLowerCase() === 'u') {
          updatePhotoFlag(activePhotoId, 'none');
        } else if (e.key === '6') {
          updatePhotoColorLabel(activePhotoId, 'red');
        } else if (e.key === '7') {
          updatePhotoColorLabel(activePhotoId, 'yellow');
        } else if (e.key === '8') {
          updatePhotoColorLabel(activePhotoId, 'green');
        } else if (e.key === '9') {
          updatePhotoColorLabel(activePhotoId, 'blue');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoId, undo, redo, setActiveView, toggleBeforeAfter, setActiveTool, updatePhotoRating, updatePhotoFlag, updatePhotoColorLabel, selectNextPhoto]);

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-950 text-dark-100 overflow-hidden font-sans select-none">
      {/* 1. Custom Title Bar */}
      <TitleBar />

      {/* 2. Top Navigation Bar */}
      <TopNav
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'library' ? (
          // LIBRARY MODULE WORKSPACE
          <>
            <FolderTree />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <FilterBar />
              <GridView />
            </div>
            <MetadataPanel />
          </>
        ) : (
          // DEVELOP MODULE WORKSPACE
          <>
            <div className="flex flex-col h-full">
              {/* Navigator Viewport Box */}
              <NavigatorPanel />

              {/* Presets vs History Switcher */}
              <div className="grid grid-cols-2 bg-dark-900 border-r border-b border-dark-800 p-1 text-[11px] font-semibold text-dark-400">
                <button
                  onClick={() => setDevelopLeftTab('presets')}
                  className={'py-1 rounded transition-colors ' + (
                    developLeftTab === 'presets' ? 'bg-dark-800 text-white shadow-xs' : 'hover:text-white'
                  )}
                >
                  PRESETS
                </button>
                <button
                  onClick={() => setDevelopLeftTab('history')}
                  className={'py-1 rounded transition-colors ' + (
                    developLeftTab === 'history' ? 'bg-dark-800 text-white shadow-xs' : 'hover:text-white'
                  )}
                >
                  HISTORY
                </button>
              </div>
              {developLeftTab === 'presets' ? <PresetsPanel /> : <HistoryPanel />}
            </div>

            <CanvasViewport />
            <DevelopRightPanel />
          </>
        )}
      </div>

      {/* 4. Bottom Filmstrip Reel */}
      <Filmstrip />

      {/* 5. Status Bar */}
      <StatusBar />

      {/* Modals & Dialogs */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <SyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} />
    </div>
  );
};
