import { Injectable, signal, computed } from '@angular/core';
import { ControllerStatus, MidiNote, WiFiNetwork, WiFiStatus } from './connection.service';

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
    bleConnected: false,
    rtpConnected: false,
    mode: 1,
    brightness: 128,
    calibrated: true,
    wsClients: 1,
    freeHeap: 200000,
    wifi: {
      mode: 'ap',
      apIp: '192.168.4.1',
      apSSID: 'Pianora-Mock',
      staConnected: false,
      staSSID: '',
      staIp: '',
      rssi: 0
    },
    features: {
      elegantOta: true,
      bleMidi: false,
      rtpMidi: false,
      wifiSta: true
    }
  });
  private _lastMidiNote = signal<MidiNote | null>(null);
  private _activeNotes = signal<Set<number>>(new Set());
  private _wifiNetworks = signal<WiFiNetwork[]>([]);
  private _wifiScanning = signal(false);
  private _wifiConnecting = signal(false);
  private _lastWifiStatus = signal<WiFiStatus | null>(null);

  // BLE MIDI state
  private _bleScanning = signal(false);
  private _bleMidiConnected = signal(false);
  private _bleDeviceName = signal('');
  private _bleDevices = signal<{ name: string; address: string }[]>([]);

  // Public computed signals
  readonly connected = this._connected.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastMidiNote = this._lastMidiNote.asReadonly();
  readonly activeNotes = this._activeNotes.asReadonly();
  readonly midiConnected = computed(() => this._status()?.midiConnected ?? false);
  readonly calibrated = computed(() => this._status()?.calibrated ?? false);
  readonly staConnected = computed(() => this._status()?.wifi?.staConnected ?? false);
  readonly staIP = computed(() => this._status()?.wifi?.staIp ?? '');
  readonly staSSID = computed(() => this._status()?.wifi?.staSSID ?? '');
  readonly wifiNetworks = this._wifiNetworks.asReadonly();
  readonly wifiScanning = this._wifiScanning.asReadonly();
  readonly wifiConnecting = this._wifiConnecting.asReadonly();
  readonly lastWifiStatus = this._lastWifiStatus.asReadonly();
  readonly hasOta = computed(() => this._status()?.features?.elegantOta ?? false);

  // BLE MIDI public signals
  readonly bleScanning = this._bleScanning.asReadonly();
  readonly bleConnected = this._bleMidiConnected.asReadonly();
  readonly bleDeviceName = this._bleDeviceName.asReadonly();
  readonly bleDevices = this._bleDevices.asReadonly();

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

  // WiFi methods
  scanWifi(): void {
    console.log('[MOCK] Scanning WiFi networks');
    this._wifiScanning.set(true);
    this._wifiNetworks.set([]);

    // Simulate network scan
    setTimeout(() => {
      this._wifiNetworks.set([
        { ssid: 'Home-Network', rssi: -45, secure: true },
        { ssid: 'Guest-WiFi', rssi: -60, secure: true },
        { ssid: 'OpenNetwork', rssi: -75, secure: false }
      ]);
      this._wifiScanning.set(false);
    }, 1500);
  }

  connectWifi(ssid: string, password: string): void {
    console.log('[MOCK] Connecting to WiFi:', ssid);
    this._wifiConnecting.set(true);

    // Simulate connection
    setTimeout(() => {
      this._wifiConnecting.set(false);
      this._lastWifiStatus.set({
        success: true,
        message: `Connected to ${ssid}`,
        connected: true,
        ip: '192.168.1.100'
      });
      this._status.update(s => ({
        ...s,
        wifi: {
          ...s.wifi,
          staConnected: true,
          staSSID: ssid,
          staIp: '192.168.1.100',
          rssi: -50
        }
      }));
    }, 2000);
  }

  disconnectWifi(): void {
    console.log('[MOCK] Disconnecting WiFi');
    this._status.update(s => ({
      ...s,
      wifi: {
        ...s.wifi,
        staConnected: false,
        staSSID: '',
        staIp: '',
        rssi: 0
      }
    }));
  }

  getOtaUrl(): string {
    return 'http://192.168.4.1/update';
  }

  // BLE MIDI methods
  scanBleMidi(): void {
    console.log('[MOCK] Scanning BLE MIDI devices');
    this._bleScanning.set(true);
    this._bleDevices.set([]);

    // Simulate BLE scan
    setTimeout(() => {
      this._bleDevices.set([
        { name: 'Kawai KDP120', address: 'AA:BB:CC:DD:EE:FF' },
        { name: 'Roland FP-30X', address: '11:22:33:44:55:66' },
        { name: 'Yamaha P-125', address: '77:88:99:AA:BB:CC' }
      ]);
      this._bleScanning.set(false);
    }, 2000);
  }

  stopBleScan(): void {
    console.log('[MOCK] Stopping BLE scan');
    this._bleScanning.set(false);
  }

  connectBleMidi(address: string): void {
    console.log('[MOCK] Connecting to BLE MIDI:', address);
    const device = this._bleDevices().find(d => d.address === address);

    setTimeout(() => {
      this._bleMidiConnected.set(true);
      this._bleDeviceName.set(device?.name ?? 'Unknown Device');
      console.log('[MOCK] Connected to', device?.name);
    }, 1500);
  }

  disconnectBleMidi(): void {
    console.log('[MOCK] Disconnecting BLE MIDI');
    this._bleMidiConnected.set(false);
    this._bleDeviceName.set('');
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
