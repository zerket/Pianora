// LED Mode enum
export enum LedMode {
  OFF = 0,
  FREE_PLAY = 1,
  VISUALIZER = 2,
  LEARNING = 3,
  DEMO = 4,
  AMBIENT = 5,
  FALLING_NOTES = 6,
  GAME = 7,
  SYNTHESIA = 8
}

// Ambient effect types
export enum AmbientEffect {
  STATIC = 0,
  GRADIENT = 1,
  RAINBOW = 2,
  PULSE = 3,
  BREATHING = 4,
  WAVE = 5
}

// Learning sub-modes
export enum LearningMode {
  WAIT = 0,      // Wait for correct keys
  RHYTHM = 1,    // Require correct timing
  AUTO = 2       // Auto-scroll
}

// RGB Color type
export type RgbColor = [number, number, number];

// Settings interfaces
export interface LedSettings {
  brightness: number;
  color: RgbColor;
  count: number;
  reversed: boolean;
}

export interface VisualizerSettings {
  fadeTime: number;
  waveEnabled: boolean;
  waveWidth: number;
  waveSpeed: number;
  waveColor: RgbColor;
  gradient: boolean;
}

export interface LearningSettings {
  hintColor: RgbColor;
  successColor: RgbColor;
  errorColor: RgbColor;
  lookAhead: number;
  splitHands: boolean;
  mode: LearningMode;
  tempo: number;
}

export interface WifiSettings {
  mode: number;      // 0=AP, 1=STA, 2=AP+STA
  staSsid: string;
  staPassword: string;
  apSsid: string;
  apPassword: string;
  hostname: string;
}

export interface CalibrationSettings {
  firstNote: number;
  firstLed: number;
  lastNote: number;
  lastLed: number;
  calibrated: boolean;
}

export interface AllSettings {
  led: LedSettings;
  visualizer: VisualizerSettings;
  learning: LearningSettings;
  wifi: WifiSettings;
  calibration: CalibrationSettings;
  currentMode: LedMode;
}

// MIDI constants
export const MIDI_NOTE_MIN = 21;  // A0
export const MIDI_NOTE_MAX = 108; // C8
export const MIDI_NOTE_COUNT = 88;

// Note name helper
export function getNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

// Check if note is black key
export function isBlackKey(midiNote: number): boolean {
  const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
  return blackKeys.includes(midiNote % 12);
}
