import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { LedMode } from '@core/models/settings.model';

interface ModeOption {
  mode: LedMode;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="play-page">
      <h1>Play Mode</h1>

      <!-- Mode Selection -->
      <section class="modes-section">
        <h2>Select Mode</h2>
        <div class="modes-grid">
          @for (option of modeOptions; track option.mode) {
            <button
              class="mode-card"
              [class.active]="currentMode() === option.mode"
              (click)="selectMode(option.mode)"
            >
              <span class="mode-icon">{{ option.icon }}</span>
              <span class="mode-label">{{ option.label }}</span>
              <span class="mode-description">{{ option.description }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Quick Settings -->
      <section class="settings-section card">
        <h2>Quick Settings</h2>

        <div class="setting-row">
          <label>Brightness</label>
          <div class="setting-control">
            <input
              type="range"
              min="0"
              max="255"
              [ngModel]="brightness()"
              (ngModelChange)="setBrightness($event)"
            />
            <span class="setting-value">{{ brightness() }}</span>
          </div>
        </div>

        <div class="setting-row">
          <label>Color</label>
          <div class="setting-control">
            <input
              type="color"
              [ngModel]="colorHex()"
              (ngModelChange)="setColor($event)"
              class="color-picker"
            />
          </div>
        </div>

        @if (currentMode() === LedMode.VISUALIZER) {
          <div class="setting-row">
            <label>Fade Time (ms)</label>
            <div class="setting-control">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                [ngModel]="fadeTime()"
                (ngModelChange)="setFadeTime($event)"
              />
              <span class="setting-value">{{ fadeTime() }}ms</span>
            </div>
          </div>

          <div class="setting-row">
            <label>Wave Effect</label>
            <div class="setting-control">
              <label class="toggle">
                <input
                  type="checkbox"
                  [ngModel]="waveEnabled()"
                  (ngModelChange)="setWaveEnabled($event)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          @if (waveEnabled()) {
            <div class="setting-row">
              <label>Wave Width</label>
              <div class="setting-control">
                <input
                  type="range"
                  min="1"
                  max="10"
                  [ngModel]="waveWidth()"
                  (ngModelChange)="setWaveWidth($event)"
                />
                <span class="setting-value">{{ waveWidth() }} LEDs</span>
              </div>
            </div>
          }
        }
      </section>

      <!-- Active Notes Display -->
      @if (connectionService.activeNotes().size > 0) {
        <section class="active-notes card">
          <h3>Active Notes</h3>
          <div class="notes-display">
            @for (note of activeNotesArray(); track note) {
              <span class="note-badge">{{ getNoteName(note) }}</span>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .play-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      h1 {
        margin-bottom: var(--spacing-sm);
      }
    }

    .modes-section h2,
    .settings-section h2 {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .modes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
    }

    .mode-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      background-color: var(--color-bg-secondary);
      border: 2px solid transparent;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-tertiary);
      }

      &.active {
        border-color: var(--color-accent);
        background-color: var(--color-bg-tertiary);
      }
    }

    .mode-icon {
      font-size: 2rem;
    }

    .mode-label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .mode-description {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-align: center;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);

      label {
        font-size: 0.9rem;
        white-space: nowrap;
      }
    }

    .setting-control {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex: 1;
      max-width: 200px;

      input[type="range"] {
        flex: 1;
      }
    }

    .setting-value {
      min-width: 60px;
      text-align: right;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .color-picker {
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      background: none;

      &::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      &::-webkit-color-swatch {
        border: none;
        border-radius: var(--radius-md);
      }
    }

    .active-notes {
      h3 {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }
    }

    .notes-display {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .note-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      background-color: var(--color-accent);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 500;
    }
  `]
})
export class PlayComponent {
  connectionService = inject(CONNECTION_SERVICE);
  LedMode = LedMode;

  // Local state
  brightness = signal(128);
  colorHex = signal('#ffffff');
  fadeTime = signal(200);
  waveEnabled = signal(false);
  waveWidth = signal(3);

  currentMode = signal(LedMode.FREE_PLAY);

  modeOptions: ModeOption[] = [
    {
      mode: LedMode.FREE_PLAY,
      label: 'Free Play',
      icon: '🎹',
      description: 'Simple key highlighting'
    },
    {
      mode: LedMode.VISUALIZER,
      label: 'Visualizer',
      icon: '✨',
      description: 'Effects and animations'
    },
    {
      mode: LedMode.AMBIENT,
      label: 'Ambient',
      icon: '🌈',
      description: 'Decorative lighting'
    },
    {
      mode: LedMode.DEMO,
      label: 'Demo',
      icon: '🎬',
      description: 'Auto playback'
    }
  ];

  activeNotesArray() {
    return Array.from(this.connectionService.activeNotes());
  }

  selectMode(mode: LedMode): void {
    this.currentMode.set(mode);
    this.connectionService.setMode(mode);
  }

  setBrightness(value: number): void {
    this.brightness.set(value);
    this.connectionService.setSettings({ brightness: value });
  }

  setColor(hex: string): void {
    this.colorHex.set(hex);
    const rgb = this.hexToRgb(hex);
    if (rgb) {
      this.connectionService.setSettings({ color: rgb });
    }
  }

  setFadeTime(value: number): void {
    this.fadeTime.set(value);
    this.connectionService.setSettings({ fadeTime: value });
  }

  setWaveEnabled(value: boolean): void {
    this.waveEnabled.set(value);
    this.connectionService.setSettings({ waveEnabled: value });
  }

  setWaveWidth(value: number): void {
    this.waveWidth.set(value);
    this.connectionService.setSettings({ waveWidth: value });
  }

  getNoteName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : null;
  }
}
