import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, SUPPORTED_LANGUAGES, Language } from '@core/services/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button class="current-language" (click)="toggleDropdown()">
        <span class="flag">{{ i18n.currentLanguageInfo().flag }}</span>
        <span class="lang-name">{{ i18n.currentLanguageInfo().nativeName }}</span>
        <span class="arrow" [class.open]="isOpen()">▼</span>
      </button>

      @if (isOpen()) {
        <div class="dropdown">
          @for (lang of languages; track lang.code) {
            <button
              class="language-option"
              [class.active]="lang.code === i18n.language()"
              (click)="selectLanguage(lang.code)"
            >
              <span class="flag">{{ lang.flag }}</span>
              <span class="lang-name">{{ lang.nativeName }}</span>
              @if (lang.code === i18n.language()) {
                <span class="check">✓</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .language-selector {
      position: relative;
    }

    .current-language {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
      min-width: 160px;

      &:hover {
        background-color: var(--color-bg-secondary);
        border-color: var(--color-accent);
      }
    }

    .flag {
      font-size: 1.2rem;
    }

    .lang-name {
      flex: 1;
      text-align: left;
      font-size: 0.9rem;
    }

    .arrow {
      font-size: 0.7rem;
      transition: transform var(--transition-fast);

      &.open {
        transform: rotate(180deg);
      }
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      overflow: hidden;
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      cursor: pointer;
      transition: background-color var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-tertiary);
      }

      &.active {
        background-color: var(--color-bg-tertiary);
        color: var(--color-accent);
      }
    }

    .check {
      margin-left: auto;
      color: var(--color-success);
    }
  `]
})
export class LanguageSelectorComponent {
  i18n = inject(I18nService);
  languages = SUPPORTED_LANGUAGES;
  isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  selectLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
    this.isOpen.set(false);
  }
}
