import React, { useState, useEffect, useRef } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (val: number) => void;
  onChangeEnd?: () => void;
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
  onChangeEnd,
  formatValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(String(value));
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setTempText(String(value));
    }
  }, [value]);

  const handleDoubleClick = () => {
    onChange(defaultValue);
    onChangeEnd?.();
  };

  const handleTextCommit = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempText);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      onChangeEnd?.();
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
        <div className="absolute w-full h-1 bg-dark-700 rounded-full overflow-hidden">
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

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onPointerDown={() => {
            isDraggingRef.current = true;
          }}
          onChange={(e) => {
            onChange(parseFloat(e.target.value));
          }}
          onPointerUp={() => {
            isDraggingRef.current = false;
            onChangeEnd?.();
          }}
          className="absolute w-full h-4 opacity-0 cursor-ew-resize z-10"
        />

        <div
          className="absolute w-3 h-3 bg-dark-100 rounded-full shadow border border-dark-900 pointer-events-none transition-transform group-hover:scale-110 -ml-1.5"
          style={{ left: percentage + '%' }}
        />
      </div>
    </div>
  );
};
