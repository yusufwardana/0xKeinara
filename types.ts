export enum FocusArea {
  MOTOR_KASAR = 'Motorik Kasar',
  MOTOR_HALUS = 'Motorik Halus',
  KOMUNIKASI = 'Komunikasi & Bahasa',
  SOSIAL = 'Sosial & Emosional',
  KOGNITIF = 'Kognitif & Pemecahan Masalah'
}

export interface Activity {
  title: string;
  duration: string;
  materials: string[];
  instructions: string[];
  benefits: string;
  safetyTip: string;
}

export interface Milestone {
  id: string;
  ageRange: string;
  description: string;
  checked: boolean;
  category: FocusArea;
}

export interface VisualMode {
  name: string;
  type: 'high-contrast' | 'tracking' | 'colors';
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface GrowthRecord {
  id: string;
  date: string;
  weight: number; // in kg
  height: number; // in cm
  notes?: string;
}

export type Gender = 'Laki-laki' | 'Perempuan';