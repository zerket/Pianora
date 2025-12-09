import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { MockConnectionService } from '@core/services/mock-connection.service';
import { I18nService } from '@core/services/i18n.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isMockMode && isExpanded()) {
      <div class="debug-panel">
        <div class="debug-header">
          <span>🎮 {{ i18n.t('debug.title') }}</span>
          <button (click)="isExpanded.set(false)">×</button>
        </div>

        <div class="debug-content">
          <div class="debug-section">
            <h4>{{ i18n.t('debug.simulateNotes') }}</h4>
            <div class="debug-buttons">
              <button (click)="playRandomNote()">{{ i18n.t('debug.randomNote') }}</button>
              <button (click)="playChord()">{{ i18n.t('debug.cMajorChord') }}</button>
              <button (click)="playScale()">{{ i18n.t('debug.cScale') }}</button>
            </div>
          </div>

          <div class="debug-section">
            <h4>{{ i18n.t('debug.autoSimulation') }}</h4>
            <div class="debug-buttons">
              <button (click)="startSimulation()" [disabled]="isSimulating()">
                {{ i18n.t('debug.start') }}
              </button>
              <button (click)="stopSimulation()" [disabled]="!isSimulating()">
                {{ i18n.t('debug.stop') }}
              </button>
            </div>
          </div>

          <div class="debug-section">
            <h4>{{ i18n.t('debug.statusToggles') }}</h4>
            <div class="debug-buttons">
              <button (click)="toggleMidi()">
                {{ i18n.t('debug.toggleMidi') }} {{ mockService.midiConnected() ? '🟢' : '🔴' }}
              </button>
              <button (click)="toggleCalibration()">
                {{ i18n.t('debug.toggleCalibrated') }} {{ mockService.calibrated() ? '🟢' : '🔴' }}
              </button>
            </div>
          </div>

          <div class="debug-section">
            <h4>{{ i18n.t('debug.pianoKeys') }}</h4>
            <div class="mini-piano">
              @for (note of pianoNotes; track note.midi) {
                <button
                  class="piano-key"
                  [class.black]="note.black"
                  [class.active]="mockService.activeNotes().has(note.midi)"
                  (mousedown)="noteOn(note.midi)"
                  (mouseup)="noteOff(note.midi)"
                  (mouseleave)="noteOff(note.midi)"
                >
                  {{ note.name }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    @if (isMockMode && !isExpanded()) {
      <button class="debug-toggle" (click)="isExpanded.set(true)">
        🎮
      </button>
    }
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      bottom: 70px;
      right: 10px;
      width: 280px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      font-size: 0.85rem;
    }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;

      button {
        background: none;
        border: none;
        color: var(--color-text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
      }
    }

    .debug-content {
      padding: var(--spacing-sm);
      max-height: 400px;
      overflow-y: auto;
    }

    .debug-section {
      margin-bottom: var(--spacing-md);

      h4 {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-xs);
        text-transform: uppercase;
      }
    }

    .debug-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);

      button {
        padding: 4px 8px;
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: 0.8rem;

        &:hover:not(:disabled) {
          background: var(--color-accent);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .mini-piano {
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
    }

    .piano-key {
      width: 24px;
      height: 40px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 0 0 4px 4px;
      font-size: 0.6rem;
      color: #333;
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 2px;

      &.black {
        background: #333;
        color: white;
        height: 28px;
        width: 18px;
        margin: 0 -6px;
        z-index: 1;
      }

      &.active {
        background: var(--color-led-default) !important;
        color: #000;
      }
    }

    .debug-toggle {
      position: fixed;
      bottom: 70px;
      right: 10px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      font-size: 1.2rem;
      cursor: pointer;
      z-index: 1000;
      box-shadow: var(--shadow-md);
    }
  `]
})
export class DebugPanelComponent {
  private connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);

  isMockMode = environment.useMock;
  isExpanded = signal(false);
  isSimulating = signal(false);

  get mockService(): MockConnectionService {
    return this.connectionService as MockConnectionService;
  }

  pianoNotes = [
    { midi: 60, name: 'C4', black: false },
    { midi: 61, name: 'C#', black: true },
    { midi: 62, name: 'D4', black: false },
    { midi: 63, name: 'D#', black: true },
    { midi: 64, name: 'E4', black: false },
    { midi: 65, name: 'F4', black: false },
    { midi: 66, name: 'F#', black: true },
    { midi: 67, name: 'G4', black: false },
    { midi: 68, name: 'G#', black: true },
    { midi: 69, name: 'A4', black: false },
    { midi: 70, name: 'A#', black: true },
    { midi: 71, name: 'B4', black: false },
    { midi: 72, name: 'C5', black: false },
  ];

  playRandomNote(): void {
    const note = Math.floor(Math.random() * 88) + 21;
    this.mockService.simulateNoteOn(note, 100);
    setTimeout(() => this.mockService.simulateNoteOff(note), 300);
  }

  playChord(): void {
    this.mockService.simulateChord([60, 64, 67]);
  }

  playScale(): void {
    this.mockService.simulateScale(60, 8);
  }

  startSimulation(): void {
    this.mockService.startSimulation(400);
    this.isSimulating.set(true);
  }

  stopSimulation(): void {
    this.mockService.stopSimulation();
    this.isSimulating.set(false);
  }

  toggleMidi(): void {
    this.mockService.toggleMidiConnected();
  }

  toggleCalibration(): void {
    this.mockService.toggleCalibrated();
  }

  noteOn(note: number): void {
    this.mockService.simulateNoteOn(note, 100);
  }

  noteOff(note: number): void {
    this.mockService.simulateNoteOff(note);
  }
}
