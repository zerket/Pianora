import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageSelectorComponent],
  template: `
    <div class="settings-page">
      <h1>{{ i18n.t('settings.title') }}</h1>

      <!-- WiFi Settings -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.wifi') }}</h2>

        <!-- Current Status -->
        <div class="wifi-status">
          @if (connectionService.staConnected()) {
            <div class="status-connected">
              <span class="status-icon">&#10003;</span>
              <span>{{ connectionService.staSSID() }}</span>
              <span class="status-ip">({{ connectionService.staIP() }})</span>
            </div>
            <button class="btn btn-small btn-secondary" (click)="disconnectWifi()">
              {{ i18n.t('settings.disconnect') }}
            </button>
          } @else {
            <div class="status-disconnected">
              <span>{{ i18n.t('settings.notConnected') }}</span>
            </div>
          }
        </div>
        @if (connectionService.staConnected()) {
          <div class="wifi-hint">
            {{ i18n.t('settings.accessVia') }}: http://{{ connectionService.staIP() }}/ {{ i18n.t('common.or') }} http://pianora.local/
          </div>
        }

        <!-- Network Selection -->
        <div class="wifi-connect-form">
          <div class="setting-row">
            <span class="setting-label">{{ i18n.t('settings.networkSsid') }}</span>
            <div class="network-select-row">
              <select
                [ngModel]="selectedNetwork()"
                (ngModelChange)="onNetworkSelect($event)"
                [disabled]="connectionService.wifiScanning()"
              >
                <option value="">{{ i18n.t('settings.selectNetwork') }}</option>
                @for (network of connectionService.wifiNetworks(); track network.ssid) {
                  <option [value]="network.ssid">
                    {{ network.ssid }} ({{ network.rssi }} dBm){{ network.secure ? ' *' : '' }}
                  </option>
                }
              </select>
              <button
                class="btn btn-small btn-secondary"
                (click)="scanNetworks()"
                [disabled]="connectionService.wifiScanning()"
              >
                @if (connectionService.wifiScanning()) {
                  ...
                } @else {
                  &#8635;
                }
              </button>
            </div>
          </div>

          <div class="setting-row">
            <span class="setting-label">{{ i18n.t('settings.password') }}</span>
            <input
              type="password"
              [ngModel]="wifiPassword()"
              (ngModelChange)="wifiPassword.set($event)"
              [placeholder]="i18n.t('settings.password')"
            />
          </div>

          <div class="button-row">
            <button
              class="btn btn-primary"
              (click)="connectToWifi()"
              [disabled]="!selectedNetwork() || connectionService.wifiConnecting()"
            >
              @if (connectionService.wifiConnecting()) {
                {{ i18n.t('settings.connecting') }}
              } @else {
                {{ i18n.t('settings.connect') }}
              }
            </button>
          </div>

          @if (wifiMessage()) {
            <div class="wifi-message" [class.success]="wifiSuccess()" [class.error]="!wifiSuccess()">
              {{ wifiMessage() }}
            </div>
          }
        </div>
      </section>

      <!-- BLE MIDI Section -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.bleMidi') }}</h2>

        @if (connectionService.staConnected()) {
          <!-- Instructions when WiFi is active -->
          <div class="ble-instructions">
            <span class="info-icon">ℹ️</span>
            <div class="instructions-content">
              <p class="instructions-title">{{ i18n.t('settings.bleUnavailable') }}</p>
              <p>{{ i18n.t('settings.bleWifiInstructions') }}</p>
            </div>
          </div>
        } @else {
          <!-- Current Status -->
          <div class="ble-status">
            @if (connectionService.bleConnected()) {
              <div class="status-connected">
                <span class="status-icon">&#9835;</span>
                <span>{{ connectionService.bleDeviceName() }}</span>
              </div>
              <button class="btn btn-small btn-secondary" (click)="disconnectBle()">
                {{ i18n.t('settings.disconnect') }}
              </button>
            } @else {
              <div class="status-disconnected">
                <span>{{ i18n.t('settings.bleNotConnected') }}</span>
              </div>
            }
          </div>

          <!-- Device Selection -->
          @if (!connectionService.bleConnected()) {
            <div class="ble-connect-form">
              <div class="setting-row">
                <span class="setting-label">{{ i18n.t('settings.bleDevice') }}</span>
                <div class="network-select-row">
                  <select
                    [ngModel]="selectedBleDevice()"
                    (ngModelChange)="selectedBleDevice.set($event)"
                    [disabled]="connectionService.bleScanning()"
                  >
                    <option value="">{{ i18n.t('settings.selectDevice') }}</option>
                    @for (device of connectionService.bleDevices(); track device.address) {
                      <option [value]="device.address">
                        {{ device.name }}
                      </option>
                    }
                  </select>
                  <button
                    class="btn btn-small btn-secondary"
                    (click)="scanBleDevices()"
                    [disabled]="connectionService.bleScanning()"
                  >
                    @if (connectionService.bleScanning()) {
                      ...
                    } @else {
                      &#8635;
                    }
                  </button>
                </div>
              </div>

              <div class="button-row">
                <button
                  class="btn btn-primary"
                  (click)="connectToBle()"
                  [disabled]="!selectedBleDevice() || connectionService.bleScanning()"
                >
                  {{ i18n.t('settings.connect') }}
                </button>
              </div>
            </div>
          }
        }
      </section>

      <!-- Calibration Section -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.calibration') }}</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ i18n.t('settings.ledCalibration') }}</span>
            <span class="setting-description">
              @if (connectionService.calibrated()) {
                {{ i18n.t('settings.calibrated') }}
              } @else {
                {{ i18n.t('settings.notCalibrated') }}
              }
            </span>
          </div>
          <a routerLink="/calibration" class="btn btn-secondary">
            {{ connectionService.calibrated() ? i18n.t('settings.recalibrate') : i18n.t('settings.start') }}
          </a>
        </div>
      </section>

      <!-- LED Settings -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.ledSettings') }}</h2>

        <div class="setting-row">
          <span class="setting-label">{{ i18n.t('settings.ledCount') }}</span>
          <input
            type="number"
            [ngModel]="ledCount()"
            (ngModelChange)="ledCount.set($event)"
            min="1"
            max="300"
            class="input-small"
          />
        </div>

        <div class="setting-row">
          <span class="setting-label">{{ i18n.t('settings.reversedDirection') }}</span>
          <label class="toggle">
            <input
              type="checkbox"
              [ngModel]="ledReversed()"
              (ngModelChange)="ledReversed.set($event)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <span class="setting-label">{{ i18n.t('settings.defaultBrightness') }}</span>
          <div class="slider-control">
            <input
              type="range"
              min="0"
              max="255"
              [ngModel]="defaultBrightness()"
              (ngModelChange)="defaultBrightness.set($event)"
            />
            <span class="setting-value">{{ defaultBrightness() }}</span>
          </div>
        </div>
      </section>

      <!-- System -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.system') }}</h2>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ i18n.t('settings.firmwareVersion') }}</span>
            <span class="setting-value">
              {{ connectionService.status()?.version || i18n.t('common.unknown') }}
            </span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ i18n.t('settings.freeMemory') }}</span>
            <span class="setting-value">
              {{ formatBytes(connectionService.status()?.freeHeap || 0) }}
            </span>
          </div>
        </div>

        @if (connectionService.hasOta()) {
          <div class="button-row">
            <a [href]="getOtaUrl()" target="_blank" class="btn btn-secondary">
              {{ i18n.t('settings.otaUpdate') }}
            </a>
          </div>
        }

        <div class="button-row">
          <button class="btn btn-secondary" (click)="restart()">
            {{ i18n.t('settings.restartController') }}
          </button>
        </div>

        <div class="button-row">
          <button class="btn btn-danger" (click)="factoryReset()">
            {{ i18n.t('settings.factoryReset') }}
          </button>
        </div>
      </section>

      <!-- About -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.about') }}</h2>
        <div class="about-info">
          <p><strong>Pianora</strong></p>
          <p class="text-muted">{{ i18n.t('settings.appDescription') }}</p>
          <p class="text-muted">{{ i18n.t('settings.version') }} 0.5.0</p>
        </div>
      </section>

      <!-- Language Section -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.language') }}</h2>
        <div class="setting-row">
          <app-language-selector />
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      h1 {
        margin-bottom: 0;
      }
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      h2 {
        font-size: 1rem;
        color: var(--color-text-secondary);
        margin: 0;
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--color-border);
      }
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
    }

    .setting-label {
      font-size: 0.95rem;
    }

    .setting-description {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting-value {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .slider-control {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      input[type="range"] {
        width: 120px;
      }
    }

    .input-small {
      width: 80px;
      text-align: center;
    }

    select {
      min-width: 150px;
      flex: 1;
    }

    input[type="text"],
    input[type="password"] {
      width: 160px;
    }

    .button-row {
      padding-top: var(--spacing-xs);

      .btn, a.btn {
        width: 100%;
        display: block;
        text-align: center;
        text-decoration: none;
      }
    }

    .btn-primary {
      background-color: var(--color-primary);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--color-primary-dark, #1565c0);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-small {
      padding: var(--spacing-xs) var(--spacing-sm);
      min-width: 40px;
    }

    .btn-danger {
      background-color: var(--color-error);
      color: white;

      &:hover {
        background-color: #e64545;
      }
    }

    .about-info {
      text-align: center;

      p {
        margin: var(--spacing-xs) 0;
      }
    }

    /* WiFi Styles */
    .wifi-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }

    .status-connected {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--color-success, #4caf50);

      .status-icon {
        font-weight: bold;
      }

      .status-ip {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
      }
    }

    .status-disconnected {
      color: var(--color-text-secondary);
    }

    .wifi-hint {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
      word-break: break-all;
    }

    .wifi-connect-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      padding-top: var(--spacing-sm);
    }

    .network-select-row {
      display: flex;
      gap: var(--spacing-xs);
      align-items: center;
    }

    .wifi-message {
      padding: var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      text-align: center;

      &.success {
        background: rgba(76, 175, 80, 0.1);
        color: var(--color-success, #4caf50);
      }

      &.error {
        background: rgba(244, 67, 54, 0.1);
        color: var(--color-error, #f44336);
      }
    }

    /* BLE MIDI Styles */
    .ble-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }

    .ble-connect-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      padding-top: var(--spacing-sm);
    }

    .ble-instructions {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: rgba(33, 150, 243, 0.15);
      border: 1px solid rgba(33, 150, 243, 0.3);
      border-radius: var(--radius-sm);
      color: var(--color-text-primary);
      font-size: 0.9rem;
      line-height: 1.6;

      .info-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .instructions-content {
        flex: 1;

        p {
          margin: 0;
        }

        .instructions-title {
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          color: #2196f3;
        }
      }
    }
  `]
})
export class SettingsComponent {
  connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);

  // Settings state
  ledCount = signal(144);
  ledReversed = signal(false);
  defaultBrightness = signal(128);

  // WiFi state
  selectedNetwork = signal('');
  wifiPassword = signal('');
  wifiMessage = signal('');
  wifiSuccess = signal(false);

  // BLE MIDI state
  selectedBleDevice = signal('');

  // Track if initial load is done to avoid sending on first load
  private initialLoadDone = false;

  constructor() {
    // Watch for WiFi status changes
    effect(() => {
      const status = this.connectionService.lastWifiStatus();
      if (status) {
        this.wifiMessage.set(status.message);
        this.wifiSuccess.set(status.success);
        if (status.success && status.connected) {
          this.selectedNetwork.set('');
          this.wifiPassword.set('');
        }
      }
    });

    // Auto-select single BLE device after scan
    effect(() => {
      const devices = this.connectionService.bleDevices();
      const isScanning = this.connectionService.bleScanning();

      // If scan just finished and exactly one device was found, auto-select it
      if (!isScanning && devices.length === 1 && !this.selectedBleDevice()) {
        this.selectedBleDevice.set(devices[0].address);
      }
    });

    // Load initial LED settings from controller status
    effect(() => {
      const status = this.connectionService.status();
      if (status && !this.initialLoadDone) {
        // Initialize from controller if available
        if (status.brightness !== undefined) {
          this.defaultBrightness.set(status.brightness);
        }
        this.initialLoadDone = true;
      }
    });

    // Send LED config changes to controller (debounced)
    effect(() => {
      const reversed = this.ledReversed();
      const brightness = this.defaultBrightness();

      // Only send after initial load
      if (this.initialLoadDone && this.connectionService.connected()) {
        this.connectionService.send('set_led_config', {
          reversed,
          brightness
        });
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  scanNetworks(): void {
    this.wifiMessage.set('');
    this.connectionService.scanWifi();
  }

  onNetworkSelect(ssid: string): void {
    this.selectedNetwork.set(ssid);
    this.wifiMessage.set('');
  }

  connectToWifi(): void {
    const ssid = this.selectedNetwork();
    const password = this.wifiPassword();
    if (ssid) {
      this.wifiMessage.set('');
      this.connectionService.connectWifi(ssid, password);
    }
  }

  disconnectWifi(): void {
    this.connectionService.disconnectWifi();
    this.wifiMessage.set('');
  }

  // BLE MIDI methods
  scanBleDevices(): void {
    this.connectionService.scanBleMidi();
  }

  connectToBle(): void {
    const address = this.selectedBleDevice();
    if (address) {
      this.connectionService.connectBleMidi(address);
      this.selectedBleDevice.set('');
    }
  }

  disconnectBle(): void {
    this.connectionService.disconnectBleMidi();
  }

  getOtaUrl(): string {
    return this.connectionService.getOtaUrl();
  }

  restart(): void {
    if (confirm(this.i18n.t('common.confirmRestart'))) {
      this.connectionService.send('restart');
    }
  }

  factoryReset(): void {
    if (confirm(this.i18n.t('common.confirmFactoryReset'))) {
      if (confirm(this.i18n.t('common.confirmFactoryResetFinal'))) {
        console.log('Factory reset...');
      }
    }
  }
}
