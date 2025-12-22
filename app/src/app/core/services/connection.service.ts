import { Injectable, signal, computed } from '@angular/core';
import { environment } from '@env/environment';

export interface ControllerStatus {
  version: string;
  midiConnected: boolean;
  bleConnected: boolean;
  rtpConnected: boolean;
  mode: number;
  brightness: number;
  calibrated: boolean;
  wsClients: number;
  freeHeap: number;
  wifi: {
    apIp: string;
    staConnected: boolean;
    staIp?: string;
    rssi?: number;
  };
  features: {
    elegantOta: boolean;
    bleMidi: boolean;
    rtpMidi: boolean;
  };
}

export interface MidiNote {
  note: number;
  velocity: number;
  on: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  // Signals for reactive state
  private _connected = signal(false);
  private _status = signal<ControllerStatus | null>(null);
  private _lastMidiNote = signal<MidiNote | null>(null);
  private _activeNotes = signal<Set<number>>(new Set());

  // Public computed signals
  readonly connected = this._connected.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastMidiNote = this._lastMidiNote.asReadonly();
  readonly activeNotes = this._activeNotes.asReadonly();
  readonly midiConnected = computed(() => this._status()?.midiConnected ?? false);
  readonly bleConnected = computed(() => this._status()?.bleConnected ?? false);
  readonly rtpConnected = computed(() => this._status()?.rtpConnected ?? false);
  readonly calibrated = computed(() => this._status()?.calibrated ?? false);
  readonly hasOta = computed(() => this._status()?.features?.elegantOta ?? false);
  readonly hasBleMidi = computed(() => this._status()?.features?.bleMidi ?? false);
  readonly hasRtpMidi = computed(() => this._status()?.features?.rtpMidi ?? false);

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = environment.production
       ? `ws://${window.location.hostname}:81/`
      : environment.wsUrl;

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this._connected.set(true);
        this.reconnectAttempts = 0;
        this.requestStatus();
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this._connected.set(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, payload: any = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  // Commands
  requestStatus(): void {
    this.send('get_status');
  }

  setMode(mode: number): void {
    this.send('set_mode', { mode });
  }

  setSettings(settings: Partial<{
    brightness: number;
    color: [number, number, number];
    fadeTime: number;
    waveEnabled: boolean;
    waveWidth: number;
    splitPoint: number;
    splitLeftColor: [number, number, number];
    splitRightColor: [number, number, number];
  }>): void {
    this.send('set_settings', settings);
  }

  // BLE MIDI commands
  scanBleMidi(): void {
    this.send('scan_ble_midi');
  }

  stopBleScan(): void {
    this.send('stop_ble_scan');
  }

  // OTA Update
  getOtaUrl(): string {
    const baseUrl = environment.production
      ? `http://${window.location.host}`
      : environment.wsUrl.replace('ws://', 'http://').replace('/ws', '');
    return `${baseUrl}/update`;
  }

  startCalibration(type: 'quick' | 'detailed' = 'quick'): void {
    this.send('start_calibration', { type });
  }

  sendCalibrationInput(note: number): void {
    this.send('calibration_input', { note });
  }

  playSong(filename: string): void {
    this.send('play_song', { filename });
  }

  stopSong(): void {
    this.send('stop_song');
  }

  startRecording(): void {
    this.send('start_recording');
  }

  stopRecording(): void {
    this.send('stop_recording');
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'status':
          this._status.set({
            version: message.version,
            midiConnected: message.midi_connected,
            bleConnected: message.ble_connected ?? false,
            rtpConnected: message.rtp_connected ?? false,
            mode: message.mode,
            brightness: message.brightness,
            calibrated: message.calibrated,
            wsClients: message.ws_clients,
            freeHeap: message.free_heap,
            wifi: message.wifi,
            features: {
              elegantOta: message.features?.elegant_ota ?? false,
              bleMidi: message.features?.ble_midi ?? false,
              rtpMidi: message.features?.rtp_midi ?? false
            }
          });
          break;

        case 'midi_note':
          const midiNote: MidiNote = {
            note: message.note,
            velocity: message.velocity,
            on: message.on,
            timestamp: Date.now()
          };
          this._lastMidiNote.set(midiNote);

          // Update active notes set
          const notes = new Set(this._activeNotes());
          if (midiNote.on) {
            notes.add(midiNote.note);
          } else {
            notes.delete(midiNote.note);
          }
          this._activeNotes.set(notes);
          break;

        case 'calibration_step':
          // Handle calibration step updates
          console.log('Calibration step:', message.step, message.led_index);
          break;

        case 'error':
          console.error('Controller error:', message.message);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.error('Max reconnect attempts reached');
    }
  }
}
