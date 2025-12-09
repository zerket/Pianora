import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="learn-page">
      <h1>{{ i18n.t('learn.title') }}</h1>

      @if (!connectionService.calibrated()) {
        <div class="calibration-warning card">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <h3>{{ i18n.t('learn.calibrationRequired') }}</h3>
            <p>{{ i18n.t('learn.calibrationRequiredDesc') }}</p>
            <a routerLink="/calibration" class="btn btn-primary">
              {{ i18n.t('learn.startCalibration') }}
            </a>
          </div>
        </div>
      } @else {
        <section class="song-selection card">
          <h2>{{ i18n.t('learn.selectSong') }}</h2>
          <p class="text-muted">{{ i18n.t('learn.selectSongDesc') }}</p>
          <a routerLink="/library" class="btn btn-secondary">
            {{ i18n.t('learn.browseLibrary') }}
          </a>
        </section>

        <section class="learning-modes">
          <h2>{{ i18n.t('learn.learningModes') }}</h2>
          <div class="modes-list">
            <div class="mode-item card">
              <div class="mode-header">
                <span class="mode-icon">⏸️</span>
                <h3>{{ i18n.t('learn.waitMode') }}</h3>
              </div>
              <p>{{ i18n.t('learn.waitModeDesc') }}</p>
            </div>

            <div class="mode-item card">
              <div class="mode-header">
                <span class="mode-icon">🎵</span>
                <h3>{{ i18n.t('learn.rhythmMode') }}</h3>
              </div>
              <p>{{ i18n.t('learn.rhythmModeDesc') }}</p>
            </div>

            <div class="mode-item card">
              <div class="mode-header">
                <span class="mode-icon">▶️</span>
                <h3>{{ i18n.t('learn.autoScroll') }}</h3>
              </div>
              <p>{{ i18n.t('learn.autoScrollDesc') }}</p>
            </div>
          </div>
        </section>

        <section class="sheet-music-preview card">
          <h2>{{ i18n.t('learn.sheetMusic') }}</h2>
          <p class="text-muted">{{ i18n.t('learn.sheetMusicDesc') }}</p>
          <div class="sheet-placeholder">
            🎼
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .learn-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      h1 {
        margin-bottom: var(--spacing-sm);
      }

      h2 {
        font-size: 1rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-md);
      }
    }

    .calibration-warning {
      display: flex;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background-color: rgba(255, 230, 109, 0.1);
      border: 1px solid var(--color-warning);

      .warning-icon {
        font-size: 2rem;
      }

      .warning-content {
        flex: 1;

        h3 {
          margin-bottom: var(--spacing-xs);
        }

        p {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-md);
        }
      }
    }

    .song-selection {
      text-align: center;

      p {
        margin-bottom: var(--spacing-md);
      }
    }

    .learning-modes {
      h2 {
        margin-bottom: var(--spacing-md);
      }
    }

    .modes-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .mode-item {
      padding: var(--spacing-md);

      .mode-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
      }

      .mode-icon {
        font-size: 1.5rem;
      }

      h3 {
        font-size: 1rem;
        margin: 0;
      }

      p {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        margin: 0;
      }
    }

    .sheet-music-preview {
      text-align: center;

      p {
        margin-bottom: var(--spacing-md);
      }
    }

    .sheet-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 3rem;
      opacity: 0.5;
    }
  `]
})
export class LearnComponent {
  connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);
}
