import { Injectable, signal, computed } from '@angular/core';
import { environment } from '@env/environment';

export interface ControllerStatus {
  version: string;
  midiConnected: boolean;
  bleConnected: boolean;
  mode: number;
  brightness: number;
  calibrated: boolean;
  wsClients: number;
  freeHeap: number;
  wifi: {
    mode: string;
    apIp: string;
    apSSID: string;
    staConnected: boolean;
    staSSID: string;
    staIp?: string;
    rssi?: number;
  };
  features: {
    elegantOta: boolean;
    bleMidi: boolean;
    wifiSta: boolean;
  };
}

export interface MidiNote {
  note: number;
  velocity: number;
  on: boolean;
  timestamp: number;
}

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  secure: boolean;
}

export interface WiFiStatus {
  success: boolean;
  message: string;
  connected: boolean;
  ip: string;
}

export interface RecordedNote {
  t: number;  // timestamp in ms
  n: number;  // note number
  v: number;  // velocity (0 = note off)
}

export interface RecordingData {
  totalNotes: number;
  durationMs: number;
  notes: RecordedNote[];
}

export interface CalibrationStep {
  step: string;
  message: string;
  firstNote?: number;
  lastNote?: number;
  calibrated?: boolean;
}

export interface HotkeyEvent {
  action: string;  // 'play_pause'
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
  private _wifiNetworks = signal<WiFiNetwork[]>([]);
  private _wifiScanning = signal(false);
  private _wifiConnecting = signal(false);
  private _lastWifiStatus = signal<WiFiStatus | null>(null);

  // BLE MIDI state
  private _bleScanning = signal(false);
  private _bleMidiConnected = signal(false);
  private _bleDeviceName = signal('');
  private _bleDevices = signal<{ name: string; address: string }[]>([]);

  // Recording state
  private _isRecording = signal(false);
  private _recordingNotes = signal(0);
  private _recordingData = signal<RecordingData | null>(null);
  private recordingChunks: RecordedNote[] = [];
  private recordingExpectedChunks = 0;
  private recordingTotalNotes = 0;
  private recordingDurationMs = 0;

  // Calibration state
  private _calibrationStep = signal<CalibrationStep | null>(null);

  // Hotkey state
  private _lastHotkey = signal<HotkeyEvent | null>(null);

  // Public computed signals
  readonly connected = this._connected.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastMidiNote = this._lastMidiNote.asReadonly();
  readonly activeNotes = this._activeNotes.asReadonly();
  readonly midiConnected = computed(() => this._status()?.midiConnected ?? false);
  readonly calibrated = computed(() => this._status()?.calibrated ?? false);
  readonly hasOta = computed(() => this._status()?.features?.elegantOta ?? false);
  readonly hasBleMidi = computed(() => this._status()?.features?.bleMidi ?? false);
  readonly hasWifiSta = computed(() => this._status()?.features?.wifiSta ?? false);
  readonly staConnected = computed(() => this._status()?.wifi?.staConnected ?? false);
  readonly staIP = computed(() => this._status()?.wifi?.staIp ?? '');
  readonly staSSID = computed(() => this._status()?.wifi?.staSSID ?? '');
  readonly wifiNetworks = this._wifiNetworks.asReadonly();
  readonly wifiScanning = this._wifiScanning.asReadonly();
  readonly wifiConnecting = this._wifiConnecting.asReadonly();
  readonly lastWifiStatus = this._lastWifiStatus.asReadonly();

  // BLE MIDI public signals
  readonly bleScanning = this._bleScanning.asReadonly();
  readonly bleConnected = this._bleMidiConnected.asReadonly();
  readonly bleDeviceName = this._bleDeviceName.asReadonly();
  readonly bleDevices = this._bleDevices.asReadonly();

  // Recording public signals
  readonly isRecording = this._isRecording.asReadonly();
  readonly recordingNotes = this._recordingNotes.asReadonly();
  readonly recordingData = this._recordingData.asReadonly();

  // Calibration public signals
  readonly calibrationStep = this._calibrationStep.asReadonly();

  // Hotkey public signals
  readonly lastHotkey = this._lastHotkey.asReadonly();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = environment.wsUrl || `ws://${window.location.hostname}:81/`;

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

  // WiFi commands
  scanWifi(): void {
    this._wifiScanning.set(true);
    this._wifiNetworks.set([]);
    this.send('wifi_scan');
  }

  connectWifi(ssid: string, password: string): void {
    this._wifiConnecting.set(true);
    this._lastWifiStatus.set(null);
    this.send('wifi_connect', { ssid, password });
  }

  disconnectWifi(): void {
    this.send('wifi_disconnect');
  }

  // BLE MIDI commands
  scanBleMidi(): void {
    this._bleScanning.set(true);
    this._bleDevices.set([]);
    this.send('scan_ble_midi');
  }

  stopBleScan(): void {
    this._bleScanning.set(false);
    this.send('stop_ble_scan');
  }

  connectBleMidi(address: string): void {
    this.send('connect_ble_midi', { address });
  }

  disconnectBleMidi(): void {
    this.send('disconnect_ble_midi');
  }

  // OTA Update
  getOtaUrl(): string {
    return `http://${window.location.host}/update`;
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

  // Learning mode: send expected notes to firmware
  setExpectedNotes(notes: number[]): void {
    this.send('set_expected_notes', { notes });
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
            mode: message.mode,
            brightness: message.brightness,
            calibrated: message.calibrated,
            wsClients: message.ws_clients,
            freeHeap: message.free_heap,
            wifi: {
              mode: message.wifi?.mode ?? 'ap',
              apIp: message.wifi?.apIp ?? '',
              apSSID: message.wifi?.apSSID ?? 'Pianora',
              staConnected: message.wifi?.staConnected ?? false,
              staSSID: message.wifi?.staSSID ?? '',
              staIp: message.wifi?.staIP ?? '',
              rssi: message.wifi?.rssi ?? 0
            },
            features: {
              elegantOta: message.features?.elegant_ota ?? false,
              bleMidi: message.features?.ble_midi ?? false,
              wifiSta: message.features?.wifi_sta ?? false
            }
          });

          // Update BLE state from status message (firmware sends it here, not in separate ble_status)
          this._bleMidiConnected.set(message.ble_connected ?? false);
          this._bleDeviceName.set(message.ble_device_name ?? '');
          this._bleScanning.set(message.ble_scanning ?? false);

          // Update recording state
          this._isRecording.set(message.is_recording ?? false);
          this._recordingNotes.set(message.recording_notes ?? 0);
          break;

        case 'wifi_networks':
          this._wifiScanning.set(false);
          this._wifiNetworks.set(message.payload || []);
          break;

        case 'wifi_status':
          this._wifiConnecting.set(false);
          this._lastWifiStatus.set(message.payload);
          break;

        case 'ble_devices':
          this._bleScanning.set(false);
          this._bleDevices.set(message.devices || []);
          break;

        case 'ble_status':
          this._bleMidiConnected.set(message.connected ?? false);
          this._bleDeviceName.set(message.device_name ?? '');
          break;

        case 'midi_note':
          // Debug: log received MIDI note
          console.log('[MIDI] Received:', message.on ? 'NOTE ON' : 'NOTE OFF',
            'note=' + message.note, 'vel=' + message.velocity);

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

          // Debug: log active notes count
          console.log('[MIDI] Active notes:', notes.size);
          break;

        case 'calibration_step':
          console.log('Calibration step:', message.step, message.message);
          this._calibrationStep.set({
            step: message.step,
            message: message.message,
            firstNote: message.first_note,
            lastNote: message.last_note,
            calibrated: message.calibrated
          });
          break;

        case 'recording_data':
          // Handle chunked recording data
          const chunk = message.chunk ?? 0;
          const totalChunks = message.total_chunks ?? 1;

          if (chunk === 0) {
            // First chunk - initialize
            this.recordingChunks = [];
            this.recordingExpectedChunks = totalChunks;
            this.recordingTotalNotes = message.total_notes ?? 0;
            this.recordingDurationMs = message.duration_ms ?? 0;
          }

          // Add notes from this chunk
          if (message.notes && Array.isArray(message.notes)) {
            this.recordingChunks.push(...message.notes);
          }

          // Check if all chunks received
          if (chunk === totalChunks - 1) {
            // All chunks received - emit recording data
            this._recordingData.set({
              totalNotes: this.recordingTotalNotes,
              durationMs: this.recordingDurationMs,
              notes: this.recordingChunks
            });
            console.log('Recording data received:', this.recordingTotalNotes, 'notes');
          }
          break;

        case 'hotkey':
          // Handle hotkey events from piano
          console.log('Hotkey received:', message.action);
          this._lastHotkey.set({
            action: message.action,
            timestamp: Date.now()
          });
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
