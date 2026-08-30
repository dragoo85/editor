const fs = require('fs');
const path = require('path');
const full = path.resolve('src/components/develop/DevelopRightPanel.tsx');
fs.mkdirSync(path.dirname(full), { recursive: true });

const content = `import React from 'react';
import { useEditStore } from '../../state/editStore';
import { Histogram } from './Histogram';
import { ToneControls } from './ToneControls';
import { CurveEditor } from './CurveEditor';
import { HSLPanel } from './HSLPanel';
import { ColorGrading } from './ColorGrading';
import { DetailOptics } from './DetailOptics';
import { CropTool } from './CropTool';
import { MaskingPanel } from './MaskingPanel';
import { HealingTool } from './HealingTool';

export const DevelopRightPanel: React.FC = () => {
  const { activeTool } = useEditStore();

  return (
    <div className="w-80 bg-dark-900 border-l border-dark-800 flex flex-col h-full select-none overflow-y-auto scrollbar-thin">
      {/* Real-time Histogram */}
      <Histogram />

      {/* Conditional Tool Panel or Complete Edit Stack */}
      {activeTool === 'crop' ? (
        <CropTool />
      ) : activeTool === 'mask' ? (
        <MaskingPanel />
      ) : activeTool === 'heal' ? (
        <HealingTool />
      ) : (
        <div className="flex flex-col">
          <ToneControls />
          <CurveEditor />
          <HSLPanel />
          <ColorGrading />
          <DetailOptics />
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(full, content.trimStart(), 'utf8');
console.log('Saved DevelopRightPanel.tsx');
