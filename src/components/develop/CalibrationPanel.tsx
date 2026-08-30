import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Slider } from '../common/Slider';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { DEFAULT_CALIBRATION } from '../../types/adjustments';

export const CalibrationPanel: React.FC = () => {
  const { developState, updateCalibration, commitHistory } = useEditStore();
  const cal = developState.calibration || DEFAULT_CALIBRATION;

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none text-xs border-t border-dark-800">
      <div className="flex items-center justify-between border-b border-dark-800 pb-1.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-accent-purple" />
          <span className="font-bold text-dark-200 uppercase tracking-wide text-[11px]">Calibration</span>
        </div>
        <button
          onClick={() => {
            updateCalibration(DEFAULT_CALIBRATION);
            commitHistory('Reset Calibration');
          }}
          className="text-dark-500 hover:text-white transition-colors"
          title="Reset Calibration"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Shadows Tint */}
      <div className="flex flex-col gap-1 pb-2 border-b border-dark-800/60">
        <Slider
          label="Shadows Tint"
          value={cal.shadowsTint}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ shadowsTint: v })}
          onChangeEnd={() => commitHistory('Adjust Shadows Tint')}
        />
      </div>

      {/* Red Primary */}
      <div className="flex flex-col gap-1 pb-2 border-b border-dark-800/60">
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Red Primary</span>
        <Slider
          label="Hue"
          value={cal.redHue}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ redHue: v })}
          onChangeEnd={() => commitHistory('Adjust Red Primary Hue')}
        />
        <Slider
          label="Saturation"
          value={cal.redSaturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ redSaturation: v })}
          onChangeEnd={() => commitHistory('Adjust Red Primary Saturation')}
        />
      </div>

      {/* Green Primary */}
      <div className="flex flex-col gap-1 pb-2 border-b border-dark-800/60">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Green Primary</span>
        <Slider
          label="Hue"
          value={cal.greenHue}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ greenHue: v })}
          onChangeEnd={() => commitHistory('Adjust Green Primary Hue')}
        />
        <Slider
          label="Saturation"
          value={cal.greenSaturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ greenSaturation: v })}
          onChangeEnd={() => commitHistory('Adjust Green Primary Saturation')}
        />
      </div>

      {/* Blue Primary */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Blue Primary</span>
        <Slider
          label="Hue"
          value={cal.blueHue}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ blueHue: v })}
          onChangeEnd={() => commitHistory('Adjust Blue Primary Hue')}
        />
        <Slider
          label="Saturation"
          value={cal.blueSaturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => updateCalibration({ blueSaturation: v })}
          onChangeEnd={() => commitHistory('Adjust Blue Primary Saturation')}
        />
      </div>
    </div>
  );
};
