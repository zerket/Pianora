import { Injectable, signal, computed } from '@angular/core';
import { ControllerStatus, MidiNote } from './connection.service';

/**
 * Mock Connection Service for testing without hardware.
 *
 * Usage:
 *   1. In app.component.ts, replace ConnectionService with MockConnectionService
 *   2. Or set environment.useMock = true
 *
 * Features:
 *   - Simulates WebSocket connection
 *   - Generates random MIDI notes on demand
 *   - Allows testing all UI features
 */
@Injectable({
  providedIn: 'root'
})
export class MockConnectionService {
  // Signals for reactive state
  private _connected = signal(true);
  private _status = signal<ControllerStatus>({
    version: '0.1.0-mock',
    midiConnected: true,
    mode: 1,
    brightness: 128,
    calibrated: true,
    wsClients: 1,
    freeHeap: 200000,
    wifi: {
      apIp: '192.168.4.1',
      staConnected: false
    }
  });
  private _lastMidiNote = signal<MidiNote | null>(null);
  private _activeNotes = signal<Set<number>>(new Set());

  // Public computed signals
  readonly connected = this._connected.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastMidiNote = this._lastMidiNote.asReadonly();
  readonly activeNotes = this._activeNotes.asReadonly();
  readonly midiConnected = computed(() => this._status()?.midiConnected ?? false);
  readonly calibrated = computed(() => this._status()?.calibrated ?? false);

  private noteInterval: any = null;

  connect(): void {
    console.log('[MOCK] Connected to mock controller');
    this._connected.set(true);
  }

  disconnect(): void {
    console.log('[MOCK] Disconnected');
    this._connected.set(false);
    this.stopSimulation();
  }

  send(type: string, payload: any = {}): void {
    console.log('[MOCK] Send:', type, payload);
  }

  requestStatus(): void {
    console.log('[MOCK] Status requested');
  }

  setMode(mode: number): void {
    console.log('[MOCK] Mode set to:', mode);
    this._status.update(s => ({ ...s, mode }));
  }

  setSettings(settings: any): void {
    console.log('[MOCK] Settings updated:', settings);
    if (settings.brightness !== undefined) {
      this._status.update(s => ({ ...s, brightness: settings.brightness }));
    }
  }

  startCalibration(type: 'quick' | 'detailed' = 'quick'): void {
    console.log('[MOCK] Calibration started:', type);
  }

  sendCalibrationInput(note: number): void {
    console.log('[MOCK] Calibration input:', note);
  }

  playSong(filename: string): void {
    console.log('[MOCK] Playing song:', filename);
  }

  stopSong(): void {
    console.log('[MOCK] Song stopped');
  }

  startRecording(): void {
    console.log('[MOCK] Recording started');
  }

  stopRecording(): void {
    console.log('[MOCK] Recording stopped');
  }

  // =========================================================================
  // Mock-specific methods for testing
  // =========================================================================

  /**
   * Simulate a MIDI note press
   */
  simulateNoteOn(note: number, velocity: number = 100): void {
    const midiNote: MidiNote = {
      note,
      velocity,
      on: true,
      timestamp: Date.now()
    };
    this._lastMidiNote.set(midiNote);

    const notes = new Set(this._activeNotes());
    notes.add(note);
    this._activeNotes.set(notes);

    console.log('[MOCK] Note ON:', note, velocity);
  }

  /**
   * Simulate a MIDI note release
   */
  simulateNoteOff(note: number): void {
    const midiNote: MidiNote = {
      note,
      velocity: 0,
      on: false,
      timestamp: Date.now()
    };
    this._lastMidiNote.set(midiNote);

    const notes = new Set(this._activeNotes());
    notes.delete(note);
    this._activeNotes.set(notes);

    console.log('[MOCK] Note OFF:', note);
  }

  /**
   * Start automatic random note simulation
   */
  startSimulation(intervalMs: number = 500): void {
    if (this.noteInterval) return;

    console.log('[MOCK] Starting note simulation');

    this.noteInterval = setInterval(() => {
      // Random note between A0 (21) and C8 (108)
      const note = Math.floor(Math.random() * 88) + 21;
      const velocity = Math.floor(Math.random() * 100) + 27;

      this.simulateNoteOn(note, velocity);

      // Release after random duration
      setTimeout(() => {
        this.simulateNoteOff(note);
      }, Math.random() * 400 + 100);
    }, intervalMs);
  }

  /**
   * Stop automatic simulation
   */
  stopSimulation(): void {
    if (this.noteInterval) {
      clearInterval(this.noteInterval);
      this.noteInterval = null;
      console.log('[MOCK] Simulation stopped');
    }

    // Clear all active notes
    this._activeNotes.set(new Set());
  }

  /**
   * Simulate playing a chord
   */
  simulateChord(notes: number[], velocity: number = 100): void {
    notes.forEach(note => this.simulateNoteOn(note, velocity));

    setTimeout(() => {
      notes.forEach(note => this.simulateNoteOff(note));
    }, 500);
  }

  /**
   * Simulate a scale
   */
  simulateScale(startNote: number = 60, length: number = 8): void {
    const majorScale = [0, 2, 4, 5, 7, 9, 11, 12];

    majorScale.slice(0, length).forEach((interval, index) => {
      setTimeout(() => {
        const note = startNote + interval;
        this.simulateNoteOn(note, 100);

        setTimeout(() => {
          this.simulateNoteOff(note);
        }, 200);
      }, index * 250);
    });
  }

  /**
   * Toggle calibration status for testing
   */
  toggleCalibrated(): void {
    this._status.update(s => ({ ...s, calibrated: !s.calibrated }));
  }

  /**
   * Toggle MIDI connection status for testing
   */
  toggleMidiConnected(): void {
    this._status.update(s => ({ ...s, midiConnected: !s.midiConnected }));
  }
}
