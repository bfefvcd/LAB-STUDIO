
export enum Scale {
  C_MAJOR_A_MINOR = 'C_MAJOR_A_MINOR',
  D_FLAT_MAJOR_B_FLAT_MINOR = 'D_FLAT_MAJOR_B_FLAT_MINOR',
  D_MAJOR_B_MINOR = 'D_MAJOR_B_MINOR',
  E_FLAT_MAJOR_C_MINOR = 'E_FLAT_MAJOR_C_MINOR',
  E_MAJOR_D_FLAT_MINOR = 'E_MAJOR_D_FLAT_MINOR',
  F_MAJOR_D_MINOR = 'F_MAJOR_D_MINOR',
  G_FLAT_MAJOR_E_FLAT_MINOR = 'G_FLAT_MAJOR_E_FLAT_MINOR',
  G_MAJOR_E_MINOR = 'G_MAJOR_E_MINOR',
  A_FLAT_MAJOR_F_MINOR = 'A_FLAT_MAJOR_F_MINOR',
  A_MAJOR_G_FLAT_MINOR = 'A_MAJOR_G_FLAT_MINOR',
  B_FLAT_MAJOR_G_MINOR = 'B_FLAT_MAJOR_G_MINOR',
  B_MAJOR_A_FLAT_MINOR = 'B_MAJOR_A_FLAT_MINOR',
  SCALE_UNSPECIFIED = 'SCALE_UNSPECIFIED'
}

export enum MusicGenerationMode {
  QUALITY = 'QUALITY',
  DIVERSITY = 'DIVERSITY',
  VOCALIZATION = 'VOCALIZATION'
}

export interface WeightedPrompt {
  text: string;
  weight: number;
}

export interface MusicConfig {
  guidance: number;
  bpm: number;
  density: number;
  brightness: number;
  scale: Scale;
  muteBass: boolean;
  muteDrums: boolean;
  onlyBassAndDrums: boolean;
  mode: MusicGenerationMode;
}

export interface DetectionResult {
  point?: [number, number];
  box_2d?: [number, number, number, number];
  label: string;
}

export type LabTab = 'music' | 'vision';
