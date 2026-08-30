import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEditStore } from '../../state/editStore';
import { CurvePoint } from '../../types/adjustments';
import { MonotoneCubicSpline } from '../../engine/math/Spline';
import { Sliders, RotateCcw } from 'lucide-react';

type Channel = 'rgb' | 'red' | 'green' | 'blue';

export const CurveEditor: React.FC = () => {
  const { developState, updateCurve, resetCurve, setDevelopState } = useEditStore();
  const [activeChannel, setActiveChannel] = useState<Channel>('rgb');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = developState.curve[activeChannel];
  const spline = new MonotoneCubicSpline(points);

  const size = 200;
  let pathD = '';
  for (let x = 0; x <= size; x += 1) {
    const origX = (x / size) * 255;
    const origY = spline.evaluate(origX);
    const svgY = size - (origY / 255) * size;
    if (x === 0) pathD += 'M ' + x + ' ' + svgY;
    else pathD += ' L ' + x + ' ' + svgY;
  }

  const handlePointerDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDragIndex(index);
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 255;
    const clickY = ((rect.bottom - e.clientY) / rect.height) * 255;

    // Check if clicked near an existing point
    const nearIdx = points.findIndex(
      p => Math.hypot(p.x - clickX, p.y - clickY) < 18
    );

    if (nearIdx !== -1) {
      setDragIndex(nearIdx);
      return;
    }

    if (points.length < 8) {
      const newPt: CurvePoint = { x: Math.round(clickX), y: Math.round(clickY) };
      const newPoints = [...points, newPt].sort((a, b) => a.x - b.x);
      const insertedIdx = newPoints.findIndex(p => p.x === newPt.x && p.y === newPt.y);

      updateCurve({ [activeChannel]: newPoints } as any, false);
      setDragIndex(insertedIdx);
    }
  };

  const handlePointDoubleClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0 || index === points.length - 1) return;
    const newPoints = points.filter((_, i) => i !== index);
    updateCurve({ [activeChannel]: newPoints } as any, true, 'Remove Curve Point');
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragIndex === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      let rawX = ((e.clientX - rect.left) / rect.width) * 255;
      let rawY = ((rect.bottom - e.clientY) / rect.height) * 255;

      let y = Math.max(0, Math.min(255, Math.round(rawY)));
      let x = Math.max(0, Math.min(255, Math.round(rawX)));

      // Endpoint constraints
      if (dragIndex === 0) {
        x = 0;
      } else if (dragIndex === points.length - 1) {
        x = 255;
      } else {
        // Constrain X strictly between predecessor and successor points
        const minX = points[dragIndex - 1].x + 1;
        const maxX = points[dragIndex + 1].x - 1;
        x = Math.max(minX, Math.min(maxX, x));
      }

      const updated = [...points];
      updated[dragIndex] = { x, y };

      // Update state without recording history on every mouse tick for 120fps responsiveness
      updateCurve({ [activeChannel]: updated } as any, false);
    };

    const onUp = () => {
      if (dragIndex !== null) {
        setDragIndex(null);
        // Push single history step on release
        setDevelopState(developState, true, 'Tone Curve');
      }
    };

    if (dragIndex !== null) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragIndex, points, activeChannel, updateCurve, setDevelopState, developState]);

  const channelColors: Record<Channel, string> = {
    rgb: '#f1f4fa',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6'
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent-cyan" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Tone Curve</span>
        </div>
        <button
          onClick={resetCurve}
          className="p-1 text-dark-500 hover:text-rose-400 rounded transition-colors"
          title="Reset Tone Curves"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-1 bg-dark-850 rounded border border-dark-750">
        {[
          { id: 'rgb', label: 'RGB' },
          { id: 'red', label: 'Red' },
          { id: 'green', label: 'Green' },
          { id: 'blue', label: 'Blue' }
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveChannel(c.id as Channel)}
            className={'py-1 rounded text-[11px] font-bold transition-all ' + (
              activeChannel === c.id
                ? 'bg-dark-700 text-white shadow-sm'
                : 'text-dark-400 hover:text-white'
            )}
            style={activeChannel === c.id ? { color: channelColors[c.id as Channel] } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center my-1">
        <div className="relative w-[200px] h-[200px] bg-dark-950 rounded border border-dark-750 overflow-hidden shadow-inner">
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-dark-400" />
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
            <line x1="0" y1="200" x2="200" y2="0" stroke="#6c768d" strokeDasharray="3 3" strokeWidth="1" />
          </svg>

          <svg
            ref={svgRef}
            onMouseDown={handleSvgMouseDown}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10"
            viewBox="0 0 200 200"
          >
            <path
              d={pathD}
              fill="none"
              stroke={channelColors[activeChannel]}
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {points.map((pt, idx) => {
              const cx = (pt.x / 255) * 200;
              const cy = 200 - (pt.y / 255) * 200;
              const isSelected = dragIndex === idx;

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6.5 : 5}
                  fill={channelColors[activeChannel]}
                  stroke="#0a0b0d"
                  strokeWidth="2"
                  onMouseDown={(e) => handlePointerDown(idx, e)}
                  onDoubleClick={(e) => handlePointDoubleClick(idx, e)}
                  className="cursor-move hover:scale-125 transition-transform"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <span className="text-[10px] text-dark-500 text-center">
        Click on curve to add point � Drag to shape � Double-click point to delete
      </span>
    </div>
  );
};
