import { Component, inject, signal } from '@angular/core';
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

      <!-- Language Section -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.language') }}</h2>
        <div class="setting-row">
          <app-language-selector />
        </div>
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

      <!-- WiFi Settings -->
      <section class="settings-section card">
        <h2>{{ i18n.t('settings.wifi') }}</h2>

        <div class="setting-row">
          <span class="setting-label">{{ i18n.t('settings.wifiMode') }}</span>
          <select [ngModel]="wifiMode()" (ngModelChange)="wifiMode.set($event)">
            <option value="0">{{ i18n.t('settings.accessPoint') }}</option>
            <option value="1">{{ i18n.t('settings.connectToNetwork') }}</option>
            <option value="2">{{ i18n.t('settings.both') }}</option>
          </select>
        </div>

        @if (wifiMode() === '1' || wifiMode() === '2') {
          <div class="setting-row">
            <span class="setting-label">{{ i18n.t('settings.networkSsid') }}</span>
            <input
              type="text"
              [ngModel]="staSsid()"
              (ngModelChange)="staSsid.set($event)"
              placeholder="WiFi Name"
            />
          </div>

          <div class="setting-row">
            <span class="setting-label">{{ i18n.t('settings.password') }}</span>
            <input
              type="password"
              [ngModel]="staPassword()"
              (ngModelChange)="staPassword.set($event)"
              placeholder="WiFi Password"
            />
          </div>
        }

        @if (wifiMode() === '0' || wifiMode() === '2') {
          <div class="setting-row">
            <span class="setting-label">{{ i18n.t('settings.apName') }}</span>
            <input
              type="text"
              [ngModel]="apSsid()"
              (ngModelChange)="apSsid.set($event)"
              placeholder="Pianora"
            />
          </div>
        }
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

        <div class="button-row">
          <button class="btn btn-secondary" (click)="checkForUpdates()">
            {{ i18n.t('settings.checkUpdates') }}
          </button>
        </div>

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
          <p class="text-muted">{{ i18n.t('settings.version') }} 0.1.0</p>
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
    }

    input[type="text"],
    input[type="password"] {
      width: 160px;
    }

    .button-row {
      padding-top: var(--spacing-xs);

      .btn {
        width: 100%;
      }
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
  `]
})
export class SettingsComponent {
  connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);

  // Settings state
  ledCount = signal(144);
  ledReversed = signal(false);
  defaultBrightness = signal(128);

  wifiMode = signal('0');
  staSsid = signal('');
  staPassword = signal('');
  apSsid = signal('Pianora');

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  checkForUpdates(): void {
    alert(this.i18n.t('common.updateNotImplemented'));
  }

  restart(): void {
    if (confirm(this.i18n.t('common.confirmRestart'))) {
      console.log('Restarting...');
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
