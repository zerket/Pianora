import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-bar">
      <div class="status-item">
        <span
          class="status-dot"
          [class.connected]="connectionService.connected()"
          [class.disconnected]="!connectionService.connected()"
        ></span>
        <span class="status-label">
          {{ connectionService.connected() ? i18n.t('status.connected') : i18n.t('status.disconnected') }}
        </span>
      </div>

      @if (connectionService.connected()) {
        <div class="status-item">
          <span
            class="status-dot"
            [class.connected]="connectionService.midiConnected()"
            [class.disconnected]="!connectionService.midiConnected()"
          ></span>
          <span class="status-label">{{ i18n.t('status.midi') }}</span>
        </div>

        @if (!connectionService.calibrated()) {
          <div class="status-item warning">
            <span class="status-icon">⚠️</span>
            <span class="status-label">{{ i18n.t('status.calibrationNeeded') }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.85rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .status-label {
      color: var(--color-text-secondary);
    }

    .status-icon {
      font-size: 1rem;
    }

    .warning {
      margin-left: auto;

      .status-label {
        color: var(--color-warning);
      }
    }
  `]
})
export class StatusBarComponent {
  connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);
}
