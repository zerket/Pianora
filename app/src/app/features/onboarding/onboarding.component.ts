import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';

type OnboardingStep = 'welcome' | 'connect' | 'test' | 'done';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onboarding-page">
      <!-- Step 1: Welcome -->
      @if (step() === 'welcome') {
        <div class="onboarding-card">
          <div class="step-icon piano-icon">
            <svg viewBox="0 0 100 60" class="piano-svg">
              <rect x="5" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="15" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="25" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="35" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="45" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="55" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="65" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="75" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <rect x="85" y="10" width="10" height="45" fill="#fff" stroke="#333" rx="2"/>
              <!-- Black keys -->
              <rect x="12" y="10" width="7" height="28" fill="#222" rx="1"/>
              <rect x="22" y="10" width="7" height="28" fill="#222" rx="1"/>
              <rect x="42" y="10" width="7" height="28" fill="#222" rx="1"/>
              <rect x="52" y="10" width="7" height="28" fill="#222" rx="1"/>
              <rect x="62" y="10" width="7" height="28" fill="#222" rx="1"/>
              <rect x="82" y="10" width="7" height="28" fill="#222" rx="1"/>
              <!-- LED strip -->
              <rect x="5" y="3" width="90" height="5" fill="url(#ledGradient)" rx="2"/>
              <defs>
                <linearGradient id="ledGradient">
                  <stop offset="0%" stop-color="#ff0000"/>
                  <stop offset="17%" stop-color="#ff8800"/>
                  <stop offset="33%" stop-color="#ffff00"/>
                  <stop offset="50%" stop-color="#00ff00"/>
                  <stop offset="67%" stop-color="#00ffff"/>
                  <stop offset="83%" stop-color="#0088ff"/>
                  <stop offset="100%" stop-color="#8800ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>{{ i18n.t('onboarding.welcomeTitle') }}</h1>
          <p class="subtitle">{{ i18n.t('onboarding.welcomeSubtitle') }}</p>
          <button class="btn btn-primary btn-large" (click)="nextStep()">
            {{ i18n.t('onboarding.getStarted') }}
          </button>
        </div>
      }

      <!-- Step 2: Connect -->
      @if (step() === 'connect') {
        <div class="onboarding-card">
          <div class="step-icon">
            @if (isConnected()) {
              <div class="icon-connected">
                <svg viewBox="0 0 24 24" width="64" height="64">
                  <path fill="#4ade80" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            } @else {
              <div class="icon-usb">
                <svg viewBox="0 0 24 24" width="64" height="64">
                  <path fill="currentColor" d="M15 7v4h1v2h-3V5h2l-3-4-3 4h2v8H8v-2.07c.7-.37 1.2-1.08 1.2-1.93 0-1.21-.99-2.2-2.2-2.2-1.21 0-2.2.99-2.2 2.2 0 .85.5 1.56 1.2 1.93V13c0 1.11.89 2 2 2h3v3.05c-.71.37-1.2 1.1-1.2 1.95 0 1.22.99 2.2 2.2 2.2 1.21 0 2.2-.98 2.2-2.2 0-.85-.49-1.58-1.2-1.95V15h3c1.11 0 2-.89 2-2v-2h1V7h-4z"/>
                </svg>
              </div>
            }
          </div>
          <h2>{{ i18n.t('onboarding.connectTitle') }}</h2>
          <p>{{ i18n.t('onboarding.connectDesc') }}</p>

          <div class="connection-status" [class.connected]="isConnected()">
            @if (isConnected()) {
              <span class="status-dot connected"></span>
              {{ i18n.t('onboarding.pianoConnected') }}
            } @else {
              <span class="status-dot waiting"></span>
              {{ i18n.t('onboarding.waitingForPiano') }}
            }
          </div>

          <div class="button-group">
            <button class="btn btn-primary"
                    [disabled]="!isConnected()"
                    (click)="nextStep()">
              {{ i18n.t('onboarding.continue') }}
            </button>
            <button class="btn btn-text" (click)="skipOnboarding()">
              {{ i18n.t('onboarding.skipForNow') }}
            </button>
          </div>
        </div>
      }

      <!-- Step 3: Test -->
      @if (step() === 'test') {
        <div class="onboarding-card">
          <div class="step-icon">
            <div class="test-visualization" [class.active]="lastNote()">
              <div class="led-demo">
                @for (led of demoLeds; track $index) {
                  <div class="led"
                       [class.active]="activeLedIndex() === $index"
                       [style.background-color]="activeLedIndex() === $index ? ledColor() : 'transparent'">
                  </div>
                }
              </div>
            </div>
          </div>
          <h2>{{ i18n.t('onboarding.testTitle') }}</h2>
          <p>{{ i18n.t('onboarding.testDesc') }}</p>

          @if (lastNote()) {
            <div class="note-display">
              {{ i18n.t('onboarding.notePressed') }}: <strong>{{ getNoteName(lastNote()!) }}</strong>
            </div>
          } @else {
            <div class="waiting-hint">
              <span class="pulse-dot"></span>
              {{ i18n.t('onboarding.pressAnyKey') }}
            </div>
          }

          <div class="button-group">
            <button class="btn btn-primary" (click)="nextStep()">
              {{ i18n.t('onboarding.looksGood') }}
            </button>
            <button class="btn btn-secondary" (click)="prevStep()">
              {{ i18n.t('onboarding.back') }}
            </button>
          </div>
        </div>
      }

      <!-- Step 4: Done -->
      @if (step() === 'done') {
        <div class="onboarding-card">
          <div class="step-icon success-icon">
            <svg viewBox="0 0 24 24" width="80" height="80">
              <circle cx="12" cy="12" r="10" fill="#4ade80"/>
              <path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <h2>{{ i18n.t('onboarding.doneTitle') }}</h2>
          <p>{{ i18n.t('onboarding.doneDesc') }}</p>

          <div class="quick-actions">
            <button class="action-card" (click)="goTo('/play')">
              <span class="action-icon">🎹</span>
              <span class="action-label">{{ i18n.t('onboarding.actionPlay') }}</span>
            </button>
            <button class="action-card" (click)="goTo('/learn')">
              <span class="action-icon">📚</span>
              <span class="action-label">{{ i18n.t('onboarding.actionLearn') }}</span>
            </button>
            <button class="action-card" (click)="goTo('/settings')">
              <span class="action-icon">⚙️</span>
              <span class="action-label">{{ i18n.t('onboarding.actionSettings') }}</span>
            </button>
          </div>
        </div>
      }

      <!-- Progress indicator -->
      <div class="progress-dots">
        <span class="dot" [class.active]="step() === 'welcome'" [class.completed]="stepIndex() > 0"></span>
        <span class="dot" [class.active]="step() === 'connect'" [class.completed]="stepIndex() > 1"></span>
        <span class="dot" [class.active]="step() === 'test'" [class.completed]="stepIndex() > 2"></span>
        <span class="dot" [class.active]="step() === 'done'" [class.completed]="stepIndex() > 3"></span>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: var(--spacing-lg);
      background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
    }

    .onboarding-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-xl);
      max-width: 420px;
      width: 100%;
      background-color: var(--color-bg-secondary);
      border-radius: var(--radius-lg);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 80px;
    }

    .piano-icon {
      width: 160px;
      height: 100px;
    }

    .piano-svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }

    h1 {
      font-size: 1.75rem;
      margin: 0;
      color: var(--color-text-primary);
    }

    h2 {
      font-size: 1.5rem;
      margin: 0;
      color: var(--color-text-primary);
    }

    p {
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .subtitle {
      font-size: 1.1rem;
    }

    .btn-large {
      padding: var(--spacing-md) var(--spacing-xl);
      font-size: 1.1rem;
      min-width: 200px;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      width: 100%;
      margin-top: var(--spacing-md);
    }

    .btn-text {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: var(--spacing-sm);

      &:hover {
        color: var(--color-text-primary);
      }
    }

    .icon-usb {
      color: var(--color-text-secondary);
      animation: pulse 2s infinite;
    }

    .icon-connected {
      animation: bounceIn 0.5s ease-out;
    }

    @keyframes bounceIn {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 0.95rem;

      &.connected {
        background-color: rgba(74, 222, 128, 0.1);
        color: #4ade80;
      }
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;

      &.waiting {
        background-color: var(--color-warning);
        animation: pulse 1.5s infinite;
      }

      &.connected {
        background-color: #4ade80;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }

    .test-visualization {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      transition: all 0.2s ease;

      &.active {
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
      }
    }

    .led-demo {
      display: flex;
      gap: 3px;
    }

    .led {
      width: 8px;
      height: 24px;
      background-color: transparent;
      border: 1px solid var(--color-border);
      border-radius: 2px;
      transition: all 0.1s ease;

      &.active {
        box-shadow: 0 0 10px currentColor;
        border-color: transparent;
      }
    }

    .note-display {
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 1.2rem;

      strong {
        color: var(--color-accent);
      }
    }

    .waiting-hint {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--color-text-secondary);
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: var(--color-warning);
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    .success-icon {
      width: 100px;
      height: 100px;
    }

    .quick-actions {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      justify-content: center;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      min-width: 90px;
      background-color: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-hover);
        border-color: var(--color-accent);
        transform: translateY(-2px);
      }
    }

    .action-icon {
      font-size: 2rem;
    }

    .action-label {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .progress-dots {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-xl);
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--color-bg-tertiary);
      transition: all var(--transition-fast);

      &.active {
        background-color: var(--color-accent);
        transform: scale(1.2);
      }

      &.completed {
        background-color: #4ade80;
      }
    }
  `]
})
export class OnboardingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);

  step = signal<OnboardingStep>('welcome');
  lastNote = signal<number | null>(null);
  activeLedIndex = signal<number>(-1);
  ledColor = signal<string>('#00ff00');

  demoLeds = Array(20).fill(0);

  private noteSubscription: ReturnType<typeof setInterval> | null = null;

  get stepIndex(): () => number {
    return () => {
      const steps: OnboardingStep[] = ['welcome', 'connect', 'test', 'done'];
      return steps.indexOf(this.step());
    };
  }

  isConnected = this.connectionService.connected;

  ngOnInit(): void {
    // Check if onboarding was already completed
    if (localStorage.getItem('pianora_onboarding_completed') === 'true') {
      this.router.navigate(['/play']);
      return;
    }

    // Start listening for MIDI notes when on test step
    this.noteSubscription = setInterval(() => {
      if (this.step() === 'test') {
        const lastMidi = this.connectionService.lastMidiNote();
        if (lastMidi && lastMidi.on) {
          this.lastNote.set(lastMidi.note);
          // Map note to LED index for visualization (simplified)
          const ledIndex = Math.floor((lastMidi.note - 21) / 88 * this.demoLeds.length);
          this.activeLedIndex.set(Math.max(0, Math.min(this.demoLeds.length - 1, ledIndex)));
          // Generate color based on note
          const hue = ((lastMidi.note - 21) / 88) * 360;
          this.ledColor.set(`hsl(${hue}, 100%, 50%)`);
        }
      }
    }, 50);
  }

  ngOnDestroy(): void {
    if (this.noteSubscription) {
      clearInterval(this.noteSubscription);
    }
  }

  nextStep(): void {
    const steps: OnboardingStep[] = ['welcome', 'connect', 'test', 'done'];
    const currentIndex = steps.indexOf(this.step());
    if (currentIndex < steps.length - 1) {
      this.step.set(steps[currentIndex + 1]);
    }
  }

  prevStep(): void {
    const steps: OnboardingStep[] = ['welcome', 'connect', 'test', 'done'];
    const currentIndex = steps.indexOf(this.step());
    if (currentIndex > 0) {
      this.step.set(steps[currentIndex - 1]);
    }
  }

  skipOnboarding(): void {
    this.completeOnboarding();
    this.router.navigate(['/play']);
  }

  completeOnboarding(): void {
    localStorage.setItem('pianora_onboarding_completed', 'true');
  }

  goTo(path: string): void {
    this.completeOnboarding();
    this.router.navigate([path]);
  }

  getNoteName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return `${note}${octave}`;
  }
}
