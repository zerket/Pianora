import { InjectionToken, Provider } from '@angular/core';
import { environment } from '@env/environment';
import { ConnectionService } from './connection.service';
import { MockConnectionService } from './mock-connection.service';

/**
 * Interface for connection service (both real and mock implement this)
 */
export interface IConnectionService {
  connected: () => boolean;
  status: () => any;
  lastMidiNote: () => any;
  activeNotes: () => Set<number>;
  midiConnected: () => boolean;
  calibrated: () => boolean;

  // WiFi-related signals
  staConnected: () => boolean;
  staIP: () => string;
  staSSID: () => string;
  wifiNetworks: () => any[];
  wifiScanning: () => boolean;
  wifiConnecting: () => boolean;
  lastWifiStatus: () => any;
  hasOta: () => boolean;

  connect(): void;
  disconnect(): void;
  send(type: string, payload?: any): void;
  requestStatus(): void;
  setMode(mode: number): void;
  setSettings(settings: any): void;
  startCalibration(type?: 'quick' | 'detailed'): void;
  sendCalibrationInput(note: number): void;
  playSong(filename: string): void;
  stopSong(): void;
  startRecording(): void;
  stopRecording(): void;

  // WiFi methods
  scanWifi(): void;
  connectWifi(ssid: string, password: string): void;
  disconnectWifi(): void;
  getOtaUrl(): string;

  // BLE MIDI signals
  bleScanning: () => boolean;
  bleConnected: () => boolean;
  bleDeviceName: () => string;
  bleDevices: () => { name: string; address: string }[];

  // BLE MIDI methods
  scanBleMidi(): void;
  stopBleScan(): void;
  connectBleMidi(address: string): void;
  disconnectBleMidi(): void;
}

/**
 * Injection token for the connection service
 */
export const CONNECTION_SERVICE = new InjectionToken<IConnectionService>('ConnectionService');

/**
 * Provider that switches between real and mock service based on environment
 */
export const connectionServiceProvider: Provider = {
  provide: CONNECTION_SERVICE,
  useFactory: () => {
    if (environment.useMock) {
      console.log('🎮 Using MOCK connection service');
      return new MockConnectionService();
    } else {
      console.log('🔌 Using REAL connection service');
      return new ConnectionService();
    }
  }
};
