import React, { useState } from 'react';
import { useCatalogStore } from '../../state/catalogStore';
import { Info, Check } from 'lucide-react';

export const MetadataPanel: React.FC = () => {
  const { photos, activePhotoId, updatePhotoMetadata } = useCatalogStore();
  const activePhoto = photos.find(p => p.id === activePhotoId);

  const [isEditingIptc, setIsEditingIptc] = useState(false);
  const [title, setTitle] = useState(activePhoto?.exif?.title || '');
  const [caption, setCaption] = useState(activePhoto?.exif?.caption || '');
  const [copyright, setCopyright] = useState(activePhoto?.exif?.copyright || '');
  const [creator, setCreator] = useState(activePhoto?.exif?.creator || '');

  if (!activePhoto) {
    return (
      <div className="w-72 bg-dark-900 border-l border-dark-800 p-4 text-xs text-dark-500 flex items-center justify-center select-none">
        Select a photograph to inspect metadata.
      </div>
    );
  }

  const exif = activePhoto.exif || {};

  const handleSaveIptc = () => {
    updatePhotoMetadata(activePhoto.id, {
      title,
      caption,
      copyright,
      creator
    });
    setIsEditingIptc(false);
  };

  return (
    <div className="w-72 bg-dark-900 border-l border-dark-800 flex flex-col h-full select-none text-xs overflow-y-auto">
      <div className="p-3.5 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-bold text-dark-200">EXIF & METADATA</span>
        </div>
      </div>

      <div className="p-3.5 border-b border-dark-800 bg-dark-850/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-dark-800 p-2 rounded border border-dark-750">
            <span className="text-[10px] text-dark-400 block">SHUTTER</span>
            <span className="font-mono text-xs font-bold text-white">
              {exif.exposureTime ? exif.exposureTime + 's' : '1/250s'}
            </span>
          </div>
          <div className="bg-dark-800 p-2 rounded border border-dark-750">
            <span className="text-[10px] text-dark-400 block">APERTURE</span>
            <span className="font-mono text-xs font-bold text-white">
              {exif.fNumber ? exif.fNumber : 'f/2.8'}
            </span>
          </div>
          <div className="bg-dark-800 p-2 rounded border border-dark-750">
            <span className="text-[10px] text-dark-400 block">ISO</span>
            <span className="font-mono text-xs font-bold text-white">
              {exif.iso ? exif.iso : '100'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-[11px] text-dark-300">
          <div className="flex justify-between">
            <span className="text-dark-400">Camera:</span>
            <span className="text-white font-medium truncate">{exif.model || 'Digital Camera'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Lens:</span>
            <span className="text-white font-medium truncate">{exif.lens || 'Prime Lens 50mm'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Focal Length:</span>
            <span className="font-mono text-dark-200">{exif.focalLength || '50 mm'}</span>
          </div>
        </div>
      </div>

      <div className="p-3.5 border-b border-dark-800 flex flex-col gap-1.5 text-[11px]">
        <span className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">FILE DETAILS</span>
        <div className="flex justify-between">
          <span className="text-dark-400">Dimensions:</span>
          <span className="font-mono text-dark-200">{activePhoto.width} � {activePhoto.height} px</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-400">File Size:</span>
          <span className="font-mono text-dark-200">{(activePhoto.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dark-400">Format:</span>
          <span className="font-mono text-dark-200 uppercase">{activePhoto.extension}</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">IPTC METADATA</span>
          {!isEditingIptc ? (
            <button
              onClick={() => setIsEditingIptc(true)}
              className="text-[10px] text-accent-blue hover:underline"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={handleSaveIptc}
              className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold hover:underline"
            >
              <Check className="w-3 h-3" /> Save
            </button>
          )}
        </div>

        {isEditingIptc ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-dark-400">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none focus:border-accent-blue"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-dark-400">Caption</label>
              <textarea
                value={caption}
                rows={2}
                onChange={(e) => setCaption(e.target.value)}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none focus:border-accent-blue resize-none"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-dark-400">Creator / Author</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none focus:border-accent-blue"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-dark-400">Copyright</label>
              <input
                type="text"
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded text-white text-xs outline-none focus:border-accent-blue"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 text-[11px] text-dark-300">
            <div>
              <span className="text-dark-500 block text-[10px]">Title:</span>
              <span>{activePhoto.exif?.title || 'None'}</span>
            </div>
            <div>
              <span className="text-dark-500 block text-[10px]">Caption:</span>
              <span>{activePhoto.exif?.caption || 'None'}</span>
            </div>
            <div>
              <span className="text-dark-500 block text-[10px]">Creator:</span>
              <span>{activePhoto.exif?.creator || 'None'}</span>
            </div>
            <div>
              <span className="text-dark-500 block text-[10px]">Copyright:</span>
              <span>{activePhoto.exif?.copyright || 'All Rights Reserved'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
