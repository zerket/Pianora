import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { getNoteName } from '@core/models/settings.model';

type CalibrationStep = 'intro' | 'first-key' | 'last-key' | 'complete';

@Component({
  selector: 'app-calibration',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calibration-page">
      <h1>Calibration</h1>

      <!-- Intro Step -->
      @if (step() === 'intro') {
        <div class="calibration-card card">
          <div class="step-icon">🎹</div>
          <h2>Quick Calibration</h2>
          <p>
            We'll match your LED strip to your piano keys.
            This only takes a few seconds.
          </p>
          <ol class="instructions">
            <li>Make sure your piano is connected via USB</li>
            <li>You'll press the leftmost key on your piano</li>
            <li>Then press the rightmost key</li>
            <li>We'll automatically map the LEDs to all keys</li>
          </ol>
          <div class="button-group">
            <button class="btn btn-primary" (click)="startCalibration()">
              Start Calibration
            </button>
            <button class="btn btn-secondary" (click)="goBack()">
              Cancel
            </button>
          </div>
        </div>
      }

      <!-- First Key Step -->
      @if (step() === 'first-key') {
        <div class="calibration-card card">
          <div class="step-icon">⬅️</div>
          <h2>Press the Leftmost Key</h2>
          <p>
            Press and hold the <strong>leftmost key</strong> on your piano
            (usually A0 or the lowest note available).
          </p>
          <div class="keyboard-hint">
            <div class="piano-visual">
              <div class="key white highlight"></div>
              <div class="key black"></div>
              <div class="key white"></div>
              <div class="key white"></div>
              <div class="key black"></div>
              <div class="key white"></div>
              <div class="key black"></div>
              <div class="key white"></div>
            </div>
            <span class="hint-arrow">← Press this key</span>
          </div>

          @if (firstNote()) {
            <div class="detected-note">
              Detected: <strong>{{ getNoteName(firstNote()!) }}</strong>
            </div>
          }

          <div class="waiting-indicator" [class.detected]="firstNote()">
            @if (!firstNote()) {
              <span class="pulse-dot"></span>
              Waiting for key press...
            } @else {
              ✓ Key detected!
            }
          </div>
        </div>
      }

      <!-- Last Key Step -->
      @if (step() === 'last-key') {
        <div class="calibration-card card">
          <div class="step-icon">➡️</div>
          <h2>Press the Rightmost Key</h2>
          <p>
            Now press and hold the <strong>rightmost key</strong> on your piano
            (usually C8 or the highest note available).
          </p>
          <div class="keyboard-hint">
            <div class="piano-visual">
              <div class="key white"></div>
              <div class="key black"></div>
              <div class="key white"></div>
              <div class="key black"></div>
              <div class="key white"></div>
              <div class="key white"></div>
              <div class="key black"></div>
              <div class="key white highlight"></div>
            </div>
            <span class="hint-arrow">Press this key →</span>
          </div>

          @if (lastNote()) {
            <div class="detected-note">
              Detected: <strong>{{ getNoteName(lastNote()!) }}</strong>
            </div>
          }

          <div class="waiting-indicator" [class.detected]="lastNote()">
            @if (!lastNote()) {
              <span class="pulse-dot"></span>
              Waiting for key press...
            } @else {
              ✓ Key detected!
            }
          </div>
        </div>
      }

      <!-- Complete Step -->
      @if (step() === 'complete') {
        <div class="calibration-card card">
          <div class="step-icon">✅</div>
          <h2>Calibration Complete!</h2>
          <p>Your LED strip is now calibrated.</p>

          <div class="calibration-summary">
            <div class="summary-row">
              <span>First key:</span>
              <strong>{{ getNoteName(firstNote()!) }}</strong>
            </div>
            <div class="summary-row">
              <span>Last key:</span>
              <strong>{{ getNoteName(lastNote()!) }}</strong>
            </div>
            <div class="summary-row">
              <span>Total keys:</span>
              <strong>{{ (lastNote()! - firstNote()! + 1) }}</strong>
            </div>
          </div>

          <div class="button-group">
            <button class="btn btn-primary" (click)="finish()">
              Done
            </button>
            <button class="btn btn-secondary" (click)="restart()">
              Recalibrate
            </button>
          </div>
        </div>
      }

      <!-- Progress indicator -->
      <div class="progress-dots">
        <span class="dot" [class.active]="step() === 'intro'"></span>
        <span class="dot" [class.active]="step() === 'first-key'"></span>
        <span class="dot" [class.active]="step() === 'last-key'"></span>
        <span class="dot" [class.active]="step() === 'complete'"></span>
      </div>
    </div>
  `,
  styles: [`
    .calibration-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-lg);
      min-height: 80vh;

      h1 {
        align-self: flex-start;
      }
    }

    .calibration-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--spacing-md);
      padding: var(--spacing-xl);
      max-width: 400px;
      width: 100%;
    }

    .step-icon {
      font-size: 3rem;
    }

    h2 {
      margin: 0;
    }

    p {
      color: var(--color-text-secondary);
      margin: 0;
    }

    .instructions {
      text-align: left;
      padding-left: var(--spacing-lg);
      color: var(--color-text-secondary);

      li {
        margin: var(--spacing-xs) 0;
      }
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      width: 100%;
      margin-top: var(--spacing-md);

      .btn {
        width: 100%;
      }
    }

    .keyboard-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      margin: var(--spacing-md) 0;
    }

    .piano-visual {
      display: flex;
      height: 60px;

      .key {
        width: 20px;
        border: 1px solid var(--color-border);
        border-radius: 0 0 4px 4px;

        &.white {
          background-color: var(--color-piano-white);
          height: 100%;
        }

        &.black {
          background-color: var(--color-piano-black);
          height: 60%;
          width: 14px;
          margin: 0 -7px;
          z-index: 1;
        }

        &.highlight {
          background-color: var(--color-led-default);
          box-shadow: 0 0 10px var(--color-led-default);
        }
      }
    }

    .hint-arrow {
      font-size: 0.85rem;
      color: var(--color-accent);
    }

    .detected-note {
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 1.2rem;
    }

    .waiting-indicator {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--color-text-secondary);

      &.detected {
        color: var(--color-success);
      }
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: var(--color-warning);
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .calibration-summary {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;

      span {
        color: var(--color-text-secondary);
      }
    }

    .progress-dots {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: auto;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-bg-tertiary);
      transition: background-color var(--transition-fast);

      &.active {
        background-color: var(--color-accent);
      }
    }
  `]
})
export class CalibrationComponent {
  private router = inject(Router);
  private connectionService = inject(CONNECTION_SERVICE);

  step = signal<CalibrationStep>('intro');
  firstNote = signal<number | null>(null);
  lastNote = signal<number | null>(null);

  getNoteName = getNoteName;

  startCalibration(): void {
    this.step.set('first-key');
    this.connectionService.startCalibration('quick');

    // Listen for MIDI notes
    // In real implementation, this would subscribe to MIDI events
    // For demo, we'll simulate with a timeout
    this.waitForNote('first');
  }

  private waitForNote(which: 'first' | 'last'): void {
    // This would be replaced with actual MIDI event subscription
    // For now, simulating the flow
    const sub = setInterval(() => {
      const lastMidi = this.connectionService.lastMidiNote();
      if (lastMidi && lastMidi.on) {
        if (which === 'first') {
          this.firstNote.set(lastMidi.note);
          clearInterval(sub);
          setTimeout(() => {
            this.step.set('last-key');
            this.waitForNote('last');
          }, 1000);
        } else {
          this.lastNote.set(lastMidi.note);
          clearInterval(sub);
          setTimeout(() => {
            this.step.set('complete');
            this.saveCalibration();
          }, 1000);
        }
      }
    }, 100);
  }

  private saveCalibration(): void {
    // Send calibration data to controller
    if (this.firstNote() && this.lastNote()) {
      this.connectionService.sendCalibrationInput(this.firstNote()!);
      this.connectionService.sendCalibrationInput(this.lastNote()!);
    }
  }

  restart(): void {
    this.firstNote.set(null);
    this.lastNote.set(null);
    this.step.set('intro');
  }

  finish(): void {
    this.router.navigate(['/settings']);
  }

  goBack(): void {
    this.router.navigate(['/settings']);
  }
}
