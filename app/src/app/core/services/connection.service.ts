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
    rtpMidi: boolean;
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

  // Public computed signals
  readonly connected = this._connected.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastMidiNote = this._lastMidiNote.asReadonly();
  readonly activeNotes = this._activeNotes.asReadonly();
  readonly midiConnected = computed(() => this._status()?.midiConnected ?? false);
  readonly rtpConnected = computed(() => this._status()?.rtpConnected ?? false);
  readonly calibrated = computed(() => this._status()?.calibrated ?? false);
  readonly hasOta = computed(() => this._status()?.features?.elegantOta ?? false);
  readonly hasBleMidi = computed(() => this._status()?.features?.bleMidi ?? false);
  readonly hasRtpMidi = computed(() => this._status()?.features?.rtpMidi ?? false);
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
              rtpMidi: message.features?.rtp_midi ?? false,
              wifiSta: message.features?.wifi_sta ?? false
            }
          });
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
