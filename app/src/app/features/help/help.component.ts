import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-page">
      <h1>{{ i18n.t('help.title') }}</h1>

      <!-- Hotkeys Section -->
      <section class="help-section">
        <h2>{{ i18n.t('help.hotkeys.title') }}</h2>
        <p class="section-desc">{{ i18n.t('help.hotkeys.activation') }}</p>

        <div class="hotkey-group">
          <h3>{{ i18n.t('help.hotkeys.modes') }}</h3>
          <div class="hotkey-list">
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + C3</span>
              <span class="action">{{ i18n.t('help.hotkeys.pointMode') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + D3</span>
              <span class="action">{{ i18n.t('help.hotkeys.splashMode') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + E3</span>
              <span class="action">{{ i18n.t('help.hotkeys.randomMode') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + F3</span>
              <span class="action">{{ i18n.t('help.hotkeys.velocityMode') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + G3</span>
              <span class="action">{{ i18n.t('help.hotkeys.rainbowMode') }}</span>
            </div>
          </div>
        </div>

        <div class="hotkey-group">
          <h3>{{ i18n.t('help.hotkeys.brightness') }}</h3>
          <div class="hotkey-list">
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + C#3</span>
              <span class="action">{{ i18n.t('help.hotkeys.brightnessUp') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + D#3</span>
              <span class="action">{{ i18n.t('help.hotkeys.brightnessDown') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + A3</span>
              <span class="action">{{ i18n.t('help.hotkeys.toggleLed') }}</span>
            </div>
          </div>
        </div>

        <div class="hotkey-group">
          <h3>{{ i18n.t('help.hotkeys.colors') }}</h3>
          <div class="hotkey-list">
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + C4</span>
              <span class="action color-red">{{ i18n.t('help.hotkeys.colorRed') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + D4</span>
              <span class="action color-orange">{{ i18n.t('help.hotkeys.colorOrange') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + E4</span>
              <span class="action color-yellow">{{ i18n.t('help.hotkeys.colorYellow') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + F4</span>
              <span class="action color-green">{{ i18n.t('help.hotkeys.colorGreen') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + G4</span>
              <span class="action color-cyan">{{ i18n.t('help.hotkeys.colorCyan') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + A4</span>
              <span class="action color-blue">{{ i18n.t('help.hotkeys.colorBlue') }}</span>
            </div>
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + B4</span>
              <span class="action color-violet">{{ i18n.t('help.hotkeys.colorViolet') }}</span>
            </div>
          </div>
        </div>

        <div class="hotkey-group">
          <h3>{{ i18n.t('help.hotkeys.playback') }}</h3>
          <div class="hotkey-list">
            <div class="hotkey-item">
              <span class="keys">A0 + B0 + B3</span>
              <span class="action">{{ i18n.t('help.hotkeys.playPause') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- LED Modes Section -->
      <section class="help-section">
        <h2>{{ i18n.t('help.modes.title') }}</h2>

        <div class="mode-list">
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.freePlay') }}</h3>
            <p>{{ i18n.t('help.modes.freePlayDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.velocity') }}</h3>
            <p>{{ i18n.t('help.modes.velocityDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.split') }}</h3>
            <p>{{ i18n.t('help.modes.splitDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.random') }}</h3>
            <p>{{ i18n.t('help.modes.randomDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.visualizer') }}</h3>
            <p>{{ i18n.t('help.modes.visualizerDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('play.mode.ambient') }}</h3>
            <p>{{ i18n.t('help.modes.ambientDesc') }}</p>
          </div>
        </div>
      </section>

      <!-- Learning Mode Section -->
      <section class="help-section">
        <h2>{{ i18n.t('help.learning.title') }}</h2>
        <p>{{ i18n.t('help.learning.desc') }}</p>

        <div class="mode-list">
          <div class="mode-item">
            <h3>{{ i18n.t('learn.waitMode') }}</h3>
            <p>{{ i18n.t('learn.waitModeDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('learn.rhythmMode') }}</h3>
            <p>{{ i18n.t('learn.rhythmModeDesc') }}</p>
          </div>
          <div class="mode-item">
            <h3>{{ i18n.t('learn.autoScroll') }}</h3>
            <p>{{ i18n.t('learn.autoScrollDesc') }}</p>
          </div>
        </div>

        <div class="color-legend">
          <h3>{{ i18n.t('help.learning.colorLegend') }}</h3>
          <div class="color-item">
            <span class="color-dot guide"></span>
            <span>{{ i18n.t('help.learning.guideColor') }}</span>
          </div>
          <div class="color-item">
            <span class="color-dot success"></span>
            <span>{{ i18n.t('help.learning.successColor') }}</span>
          </div>
          <div class="color-item">
            <span class="color-dot error"></span>
            <span>{{ i18n.t('help.learning.errorColor') }}</span>
          </div>
        </div>
      </section>

      <!-- Tips Section -->
      <section class="help-section">
        <h2>{{ i18n.t('help.tips.title') }}</h2>
        <ul class="tips-list">
          <li>{{ i18n.t('help.tips.tip1') }}</li>
          <li>{{ i18n.t('help.tips.tip2') }}</li>
          <li>{{ i18n.t('help.tips.tip3') }}</li>
          <li>{{ i18n.t('help.tips.tip4') }}</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .help-page {
      padding: var(--spacing-md);
      padding-bottom: 80px;
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      font-size: 1.5rem;
      margin-bottom: var(--spacing-lg);
      color: var(--color-text-primary);
    }

    .help-section {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    h2 {
      font-size: 1.1rem;
      color: var(--color-accent);
      margin-bottom: var(--spacing-sm);
    }

    h3 {
      font-size: 0.95rem;
      color: var(--color-text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .section-desc {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-sm);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .hotkey-group {
      margin-bottom: var(--spacing-md);
    }

    .hotkey-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .hotkey-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .keys {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--color-accent);
      background: var(--color-bg-primary);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }

    .action {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .color-red { color: #ff4444; }
    .color-orange { color: #ff8800; }
    .color-yellow { color: #ffcc00; }
    .color-green { color: #44ff44; }
    .color-cyan { color: #44ffff; }
    .color-blue { color: #4488ff; }
    .color-violet { color: #cc44ff; }

    .mode-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .mode-item {
      padding: var(--spacing-sm);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .mode-item h3 {
      margin-bottom: 4px;
    }

    .mode-item p {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .color-legend {
      margin-top: var(--spacing-md);
      padding: var(--spacing-sm);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .color-legend h3 {
      margin-bottom: var(--spacing-sm);
    }

    .color-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }

    .color-dot.guide { background: #ffd700; }
    .color-dot.success { background: #44ff44; }
    .color-dot.error { background: #ff4444; }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tips-list li {
      padding: var(--spacing-sm);
      padding-left: var(--spacing-md);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      position: relative;
      margin-bottom: var(--spacing-xs);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .tips-list li::before {
      content: '💡';
      position: absolute;
      left: var(--spacing-xs);
    }
  `]
})
export class HelpComponent {
  i18n = inject(I18nService);
}
