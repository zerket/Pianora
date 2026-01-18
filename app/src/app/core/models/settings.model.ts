// LED Mode enum - values must match firmware config.h LEDMode enum
export enum LedMode {
  FREE_PLAY = 0,     // Simple note highlight
  VELOCITY = 1,      // Color based on velocity
  SPLIT = 2,         // Two-color keyboard split
  RANDOM = 3,        // Random colors per note
  VISUALIZER = 4,    // Splash/fade effects
  AMBIENT = 5,       // Decorative effects
  LEARNING = 6,      // Learning mode hints
  DEMO = 7           // Auto-play demos
}

// MIDI Source types
export enum MidiSource {
  USB = 0,
  BLUETOOTH = 1,
  RTP_WIFI = 2
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

export interface SplitSettings {
  splitPoint: number;        // MIDI note number (21-108)
  leftColor: RgbColor;       // Color for left side (low notes)
  rightColor: RgbColor;      // Color for right side (high notes)
}

export interface MidiSettings {
  source: MidiSource;
  bleDeviceName?: string;
  rtpSessionName?: string;
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
  split: SplitSettings;
  learning: LearningSettings;
  midi: MidiSettings;
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
