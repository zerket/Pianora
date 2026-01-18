import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Midi, Track } from '@tonejs/midi';
import * as Tone from 'tone';
import { CONNECTION_SERVICE } from './connection.provider';

export interface MidiNote {
  note: number;       // MIDI note number (0-127)
  time: number;       // Start time in seconds
  duration: number;   // Duration in seconds
  velocity: number;   // Velocity (0-127)
  track: number;      // Track index (for left/right hand detection)
}

export interface ParsedMidi {
  name: string;
  duration: number;
  bpm: number;
  timeSignature: [number, number]; // [numerator, denominator], e.g. [4, 4]
  measureDuration: number;          // Duration of one measure in seconds
  tracks: { name: string; notes: MidiNote[] }[];
  allNotes: MidiNote[];  // All notes sorted by time
}

export type LearningMode = 'wait' | 'rhythm' | 'autoplay';

@Injectable({ providedIn: 'root' })
export class MidiPlayerService {
  // State signals
  private _currentSong = signal<ParsedMidi | null>(null);
  private _isPlaying = signal(false);
  private _isPaused = signal(false);
  private _currentTime = signal(0);
  private _playbackSpeed = signal(1);
  private _learningMode = signal<LearningMode>('autoplay');
  private _isWaiting = signal(false);

  // Public readonly signals
  readonly currentSong = this._currentSong.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly isPaused = this._isPaused.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly playbackSpeed = this._playbackSpeed.asReadonly();
  readonly learningMode = this._learningMode.asReadonly();
  readonly isWaiting = this._isWaiting.asReadonly();

  // Computed signals
  readonly duration = computed(() => this._currentSong()?.duration ?? 0);
  readonly progress = computed(() => {
    const d = this.duration();
    return d > 0 ? (this._currentTime() / d) * 100 : 0;
  });

  // Notes that should be displayed (upcoming notes in visualizer)
  readonly upcomingNotes = computed(() => {
    const song = this._currentSong();
    const time = this._currentTime();
    if (!song) return [];

    const lookahead = 4; // seconds to show ahead
    return song.allNotes.filter(
      n => n.time >= time && n.time <= time + lookahead
    );
  });

  // Notes that are currently expected (for learning mode)
  readonly expectedNotes = computed(() => {
    const song = this._currentSong();
    const time = this._currentTime();
    if (!song) return [];

    const tolerance = 0.1; // seconds
    return song.allNotes
      .filter(n => n.time >= time - tolerance && n.time <= time + tolerance)
      .map(n => n.note);
  });

  // Active notes (currently playing)
  readonly activeNotes = computed(() => {
    const song = this._currentSong();
    const time = this._currentTime();
    if (!song) return [];

    return song.allNotes
      .filter(n => time >= n.time && time <= n.time + n.duration)
      .map(n => n.note);
  });

  // Determine which track is left/right hand based on average note pitch
  readonly trackHands = computed(() => {
    const song = this._currentSong();
    if (!song) return new Map<number, 'left' | 'right'>();

    const result = new Map<number, 'left' | 'right'>();

    for (let i = 0; i < song.tracks.length; i++) {
      const track = song.tracks[i];
      if (track.notes.length === 0) continue;

      // Calculate average note pitch for this track
      const avgNote = track.notes.reduce((sum, n) => sum + n.note, 0) / track.notes.length;

      // Notes below C4 (60) are typically left hand
      result.set(i, avgNote < 60 ? 'left' : 'right');
    }

    return result;
  });

  // Private properties
  private synth: Tone.Sampler | Tone.PolySynth | null = null;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private samplerLoaded = false;

  // Piano samples from free CDN (Salamander Grand Piano)
  // Note: Salamander uses 's' for sharps in filenames (e.g., Fs4.mp3 for F#4)
  private readonly PIANO_SAMPLES_BASE = 'https://tonejs.github.io/audio/salamander/';

  // Connection service for sending expected notes to firmware
  private connectionService = inject(CONNECTION_SERVICE);

  constructor() {
    // Clean up on destroy
    effect(() => {
      return () => this.dispose();
    });

    // Send expected notes to firmware for LED hints in learning mode
    effect(() => {
      const expected = this.expectedNotes();
      // Only send if we have a connection service with setExpectedNotes method
      if (this.connectionService && typeof this.connectionService.setExpectedNotes === 'function') {
        this.connectionService.setExpectedNotes(expected);
      }
    });
  }

  async loadMidi(data: ArrayBuffer): Promise<ParsedMidi> {
    const midi = new Midi(data);

    const allNotes: MidiNote[] = [];

    const tracks = midi.tracks.map((track: Track, trackIndex: number) => {
      const notes: MidiNote[] = track.notes.map(note => ({
        note: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: Math.round(note.velocity * 127),
        track: trackIndex
      }));

      allNotes.push(...notes);

      return {
        name: track.name || 'Track',
        notes
      };
    });

    // Sort all notes by time
    allNotes.sort((a, b) => a.time - b.time);

    // Extract tempo and time signature
    const bpm = midi.header.tempos[0]?.bpm ?? 120;
    const timeSig = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
    const timeSignature: [number, number] = [timeSig[0], timeSig[1]];

    // Calculate measure duration in seconds
    const beatsPerMeasure = timeSignature[0];
    const beatDuration = 60 / bpm; // seconds per beat
    const measureDuration = beatDuration * beatsPerMeasure;

    const parsed: ParsedMidi = {
      name: midi.name || 'Unknown',
      duration: midi.duration,
      bpm,
      timeSignature,
      measureDuration,
      tracks,
      allNotes
    };

    this._currentSong.set(parsed);
    this._currentTime.set(0);
    this._isPlaying.set(false);
    this._isPaused.set(false);

    return parsed;
  }

  async play(): Promise<void> {
    if (!this._currentSong()) return;

    // Initialize Tone.js if needed
    await Tone.start();

    // Initialize piano sampler if not already loaded
    if (!this.synth || !this.samplerLoaded) {
      await this.initPianoSampler();
    }

    if (this._isPaused()) {
      // Resume from paused position
      this.startTime = performance.now() - (this.pausedTime * 1000 / this._playbackSpeed());
      this._isPaused.set(false);
    } else {
      // Start from beginning or current position
      this.startTime = performance.now() - (this._currentTime() * 1000 / this._playbackSpeed());
    }

    this._isPlaying.set(true);
    this.tick();
  }

  private async initPianoSampler(): Promise<void> {
    return new Promise((resolve) => {
      // Salamander Grand Piano sample mapping
      // Uses 's' for sharps in filenames (Fs4.mp3 for F#4)
      // Key = Tone.js note name, Value = filename
      const samples: Record<string, string> = {
        'A0': 'A0.mp3',
        'C1': 'C1.mp3',
        'D#1': 'Ds1.mp3',
        'F#1': 'Fs1.mp3',
        'A1': 'A1.mp3',
        'C2': 'C2.mp3',
        'D#2': 'Ds2.mp3',
        'F#2': 'Fs2.mp3',
        'A2': 'A2.mp3',
        'C3': 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        'A3': 'A3.mp3',
        'C4': 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        'A4': 'A4.mp3',
        'C5': 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        'A5': 'A5.mp3',
        'C6': 'C6.mp3',
        'D#6': 'Ds6.mp3',
        'F#6': 'Fs6.mp3',
        'A6': 'A6.mp3',
        'C7': 'C7.mp3',
        'D#7': 'Ds7.mp3',
        'F#7': 'Fs7.mp3',
        'A7': 'A7.mp3',
        'C8': 'C8.mp3'
      };

      this.synth = new Tone.Sampler({
        urls: samples,
        baseUrl: this.PIANO_SAMPLES_BASE,
        release: 1,
        onload: () => {
          this.samplerLoaded = true;
          console.log('Piano samples loaded');
          resolve();
        },
        onerror: (err) => {
          console.error('Failed to load piano samples, using fallback synth:', err);
          // Fallback to basic synth if samples fail to load
          this.initFallbackSynth();
          resolve();
        }
      }).toDestination();

      this.synth.volume.value = -6;
    });
  }

  private initFallbackSynth(): void {
    // Fallback synth that sounds more piano-like
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle8'
      },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.2,
        release: 1.2
      }
    }).toDestination();
    this.synth.volume.value = -10;
    this.samplerLoaded = true;
  }

  pause(): void {
    this._isPlaying.set(false);
    this._isPaused.set(true);
    this.pausedTime = this._currentTime();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all playing notes
    this.synth?.releaseAll();
  }

  stop(): void {
    this._isPlaying.set(false);
    this._isPaused.set(false);
    this._currentTime.set(0);
    this.pausedTime = 0;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.synth?.releaseAll();
  }

  seekTo(time: number): void {
    const duration = this.duration();
    const clampedTime = Math.max(0, Math.min(time, duration));

    this._currentTime.set(clampedTime);
    this.pausedTime = clampedTime;

    if (this._isPlaying()) {
      this.startTime = performance.now() - (clampedTime * 1000 / this._playbackSpeed());
    }

    this.synth?.releaseAll();
  }

  setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.25, Math.min(2, speed));
    const currentTime = this._currentTime();

    this._playbackSpeed.set(clampedSpeed);

    if (this._isPlaying()) {
      this.startTime = performance.now() - (currentTime * 1000 / clampedSpeed);
    }
  }

  setLearningMode(mode: LearningMode): void {
    this._learningMode.set(mode);
  }

  // Check if a note matches expected notes (for learning mode)
  checkNote(note: number): boolean {
    const expected = this.expectedNotes();
    return expected.includes(note);
  }

  // Notify that user pressed a note (for wait mode)
  onUserNote(note: number): void {
    if (this._learningMode() !== 'wait' || !this._isWaiting()) return;

    const expected = this.expectedNotes();
    if (expected.includes(note)) {
      // Remove from expected and continue if all notes pressed
      // This is simplified - full implementation would track all pressed notes
      this._isWaiting.set(false);
    }
  }

  private tick = (): void => {
    if (!this._isPlaying()) return;

    const song = this._currentSong();
    if (!song) return;

    const elapsed = (performance.now() - this.startTime) * this._playbackSpeed() / 1000;
    this._currentTime.set(elapsed);

    // Check if song ended
    if (elapsed >= song.duration) {
      this.stop();
      return;
    }

    // In autoplay mode, play notes
    if (this._learningMode() === 'autoplay' || this._learningMode() === 'rhythm') {
      this.playNotesAtTime(elapsed);
    } else if (this._learningMode() === 'wait') {
      // Wait mode - check if we should wait for user input
      const expected = this.expectedNotes();
      if (expected.length > 0 && !this._isWaiting()) {
        this._isWaiting.set(true);
        // Pause playback until user plays the notes
      }

      if (this._isWaiting()) {
        // Don't advance time while waiting
        this.animationFrameId = requestAnimationFrame(this.tick);
        return;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private playNotesAtTime(time: number): void {
    const song = this._currentSong();
    if (!song || !this.synth) return;

    const tolerance = 0.05; // 50ms window

    // Find notes that should start now
    const notesToPlay = song.allNotes.filter(
      n => n.time >= time - tolerance && n.time <= time && n.time > time - tolerance * 2
    );

    for (const note of notesToPlay) {
      // Use note name for Sampler (e.g., 'C4'), frequency for PolySynth
      const noteName = Tone.Frequency(note.note, 'midi').toNote();
      const velocity = note.velocity / 127;

      try {
        this.synth.triggerAttackRelease(noteName, note.duration, undefined, velocity);
      } catch (err) {
        // Fallback to frequency if note name fails
        const freq = Tone.Frequency(note.note, 'midi').toFrequency();
        this.synth.triggerAttackRelease(freq, note.duration, undefined, velocity);
      }
    }
  }

  private dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.synth?.dispose();
    this.synth = null;
    this.samplerLoaded = false;
  }

  // Helper: Get note name from MIDI number
  getNoteName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  // Helper: Format time as mm:ss
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
