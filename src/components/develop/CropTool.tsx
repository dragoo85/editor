import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { Scissors, RotateCw, FlipHorizontal, FlipVertical, RotateCcw } from 'lucide-react';

export const CropTool: React.FC = () => {
  const { developState, updateGeometry, resetGeometry } = useEditStore();
  const geo = developState.geometry;

  const aspectRatios = [
    { id: 'original', label: 'Original' },
    { id: '1:1', label: '1:1 Square' },
    { id: '4:3', label: '4:3' },
    { id: '3:2', label: '3:2 Photo' },
    { id: '16:9', label: '16:9 Cinema' },
    { id: '5:4', label: '5:4' },
    { id: 'custom', label: 'Free Aspect' }
  ];

  const handleRotate90 = () => {
    const nextRot = (geo.rotation + 90) % 360;
    updateGeometry({ rotation: nextRot }, 'Rotate 90�');
  };

  const handleFlipH = () => {
    updateGeometry({ flipH: !geo.flipH }, 'Flip Horizontal');
  };

  const handleFlipV = () => {
    updateGeometry({ flipV: !geo.flipV }, 'Flip Vertical');
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-accent-blue" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Crop & Transform</span>
        </div>
        <button
          onClick={resetGeometry}
          className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
          title="Reset Crop / Geometry"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-dark-400 text-[10px] font-medium uppercase">Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {aspectRatios.map((ar) => (
            <button
              key={ar.id}
              onClick={() => updateGeometry({ aspectRatio: ar.id }, 'Set Aspect Ratio')}
              className={'py-1 px-2 rounded text-[10px] font-medium border text-center transition-all ' + (
                geo.aspectRatio === ar.id
                  ? 'bg-accent-blue/15 border-accent-blue text-white font-bold'
                  : 'bg-dark-850 border-dark-750 text-dark-400 hover:text-white'
              )}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotate & Flip Quick Tools */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <button
          onClick={handleRotate90}
          className="flex items-center justify-center gap-1.5 py-1.5 bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-750 rounded text-xs transition-colors"
          title="Rotate 90� Clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rotate</span>
        </button>
        <button
          onClick={handleFlipH}
          className={'flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border transition-colors ' + (
            geo.flipH
              ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
              : 'bg-dark-850 border-dark-750 text-dark-200 hover:bg-dark-750'
          )}
          title="Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span>Flip H</span>
        </button>
        <button
          onClick={handleFlipV}
          className={'flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border transition-colors ' + (
            geo.flipV
              ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
              : 'bg-dark-850 border-dark-750 text-dark-200 hover:bg-dark-750'
          )}
          title="Flip Vertical"
        >
          <FlipVertical className="w-3.5 h-3.5" />
          <span>Flip V</span>
        </button>
      </div>

      {/* Straighten & Perspective */}
      <div className="flex flex-col gap-0.5 pt-1">
        <Slider
          label="Angle / Straighten"
          value={geo.straighten}
          min={-45}
          max={45}
          step={0.5}
          defaultValue={0}
          unit="�"
          onChange={(val) => updateGeometry({ straighten: val })}
        />
        <Slider
          label="Vertical Perspective"
          value={geo.perspectiveV}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateGeometry({ perspectiveV: val })}
        />
        <Slider
          label="Horizontal Perspective"
          value={geo.perspectiveH}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(val) => updateGeometry({ perspectiveH: val })}
        />
      </div>
    </div>
  );
};
