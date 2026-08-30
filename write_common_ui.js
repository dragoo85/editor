const fs = require('fs');
const path = require('path');

function save(relPath, content) {
  const full = path.resolve(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Saved:', relPath);
}

// 1. Slider.tsx
save('src/components/common/Slider.tsx', `import React, { useState, useEffect } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  unit = '',
  onChange,
  formatValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(String(value));

  useEffect(() => {
    setTempText(String(value));
  }, [value]);

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleTextCommit = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempText);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const percentage = ((value - min) / (max - min)) * 100;
  const zeroPercentage = ((Math.max(min, Math.min(max, defaultValue)) - min) / (max - min)) * 100;

  const isBipolar = min < 0 && max > 0;

  return (
    <div className="flex flex-col gap-1 py-1 text-xs select-none group">
      <div className="flex items-center justify-between text-dark-300 group-hover:text-dark-200">
        <span onDoubleClick={handleDoubleClick} className="cursor-pointer hover:text-accent-blue transition-colors">
          {label}
        </span>
        {isEditing ? (
          <input
            type="number"
            className="w-14 px-1 py-0.5 bg-dark-700 text-white rounded outline-none border border-accent-blue text-right font-mono text-xs"
            value={tempText}
            autoFocus
            step={step}
            onChange={(e) => setTempText(e.target.value)}
            onBlur={handleTextCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextCommit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            onDoubleClick={handleDoubleClick}
            className="font-mono text-dark-300 hover:text-white cursor-pointer px-1 rounded hover:bg-dark-700"
          >
            {formatValue ? formatValue(value) : (value > 0 && isBipolar ? '+' + value : value) + unit}
          </span>
        )}
      </div>

      <div className="relative flex items-center h-4 cursor-pointer" onDoubleClick={handleDoubleClick}>
        {/* Track background */}
        <div className="absolute w-full h-1 bg-dark-700 rounded-full overflow-hidden">
          {/* Active fill bar */}
          {isBipolar ? (
            <div
              className="absolute h-full bg-accent-blue/80 rounded-full"
              style={{
                left: (value >= defaultValue ? zeroPercentage : percentage) + '%',
                width: Math.abs(percentage - zeroPercentage) + '%'
              }}
            />
          ) : (
            <div
              className="absolute h-full bg-accent-blue/80 rounded-full"
              style={{ width: percentage + '%' }}
            />
          )}
        </div>

        {/* Real input slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-4 opacity-0 cursor-ew-resize z-10"
        />

        {/* Thumb indicator */}
        <div
          className="absolute w-3 h-3 bg-dark-100 rounded-full shadow border border-dark-900 pointer-events-none transition-transform group-hover:scale-110 -ml-1.5"
          style={{ left: percentage + '%' }}
        />
      </div>
    </div>
  );
};
`);

// 2. ColorWheel.tsx
save('src/components/common/ColorWheel.tsx', `import React, { useRef, useState, useEffect } from 'react';
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
`);

// 3. SplitView.tsx
save('src/components/common/SplitView.tsx', `import React, { useRef, useState, useEffect } from 'react';

interface SplitViewProps {
  splitPosition: number;
  onChangeSplit: (pos: number) => void;
  children: React.ReactNode;
}

export const SplitView: React.FC<SplitViewProps> = ({ splitPosition, onChangeSplit, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    onChangeSplit(Math.max(0.05, Math.min(0.95, pos)));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging) handlePointer(e.clientX);
    };
    const onUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {children}

      {/* Split Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-accent-blue/90 shadow-2xl cursor-ew-resize z-20"
        style={{ left: (splitPosition * 100) + '%' }}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-dark-900 border border-accent-blue flex items-center justify-center shadow-lg">
          <span className="text-[9px] font-bold text-white">?</span>
        </div>

        {/* Labels */}
        <div className="absolute top-4 -left-16 px-2 py-0.5 rounded bg-dark-900/80 backdrop-blur text-[10px] text-dark-300 font-mono">
          BEFORE
        </div>
        <div className="absolute top-4 left-3 px-2 py-0.5 rounded bg-dark-900/80 backdrop-blur text-[10px] text-accent-blue font-mono">
          AFTER
        </div>
      </div>
    </div>
  );
};
`);

console.log('Common UI components created.');
