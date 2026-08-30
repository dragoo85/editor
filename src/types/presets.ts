import { DevelopState } from './adjustments';

export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  adjustments: Partial<DevelopState>;
  isBuiltIn: boolean;
}
