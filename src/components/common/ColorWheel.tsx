import React, { useRef, useState, useEffect } from 'react';
import { ColorGradingWheel } from '../../types/adjustments';
import { hsvToRgb } from '../../engine/math/ColorSpaces';

interface ColorWheelProps {
  label: string;
  wheel: ColorGradingWheel;
  onChange: (wheel: ColorGradingWheel) => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ label, wheel, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = 46;
  const center = 50;

  // Convert Polar (Hue/Saturation) to Cartesian (X/Y)
  const angleRad = (wheel.hue * Math.PI) / 180;
  const dist = (wheel.saturation / 100) * radius;
  const puckX = center + dist * Math.cos(angleRad);
  const puckY = center + dist * Math.sin(angleRad);

  const handlePointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;

    let d = Math.sqrt(x * x + y * y);
    let sat = Math.min(100, (d / radius) * 100);

    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    onChange({
      ...wheel,
      hue: Math.round(angle),
      saturation: Math.round(sat)
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointer(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handlePointer(e.clientX, e.clientY);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [r, g, b] = hsvToRgb(wheel.hue, wheel.saturation, 100);
  const colorHex = 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-dark-850 rounded border border-dark-750">
      <span className="text-[11px] font-medium text-dark-300">{label}</span>

      {/* Interactive Color Wheel Canvas / SVG */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onChange({ hue: 0, saturation: 0, luminance: 0 })}
        className="relative w-[100px] h-[100px] rounded-full cursor-crosshair shadow-inner"
        style={{
          background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.6)'
        }}
      >
        {/* Radial white-to-transparent overlay for saturation gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, white 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0) 100%)'
          }}
        />

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-dark-500/50 pointer-events-none" />

        {/* Draggable Puck */}
        <div
          className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: puckX + 'px',
            top: puckY + 'px',
            backgroundColor: colorHex
          }}
        />
      </div>

      {/* Luminance Bar */}
      <div className="w-full flex items-center gap-1 mt-1">
        <span className="text-[10px] text-dark-400">L</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={wheel.luminance}
          onChange={(e) => onChange({ ...wheel, luminance: parseInt(e.target.value) })}
          onDoubleClick={() => onChange({ ...wheel, luminance: 0 })}
          className="w-full h-1 bg-dark-700 rounded appearance-none cursor-pointer accent-accent-blue"
        />
        <span className="text-[10px] font-mono text-dark-300 w-6 text-right">
          {wheel.luminance > 0 ? '+' + wheel.luminance : wheel.luminance}
        </span>
      </div>
    </div>
  );
};
