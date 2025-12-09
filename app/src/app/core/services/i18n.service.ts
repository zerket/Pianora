import { Injectable, signal, computed } from '@angular/core';
import { Language, TranslationKeys, SUPPORTED_LANGUAGES } from '../i18n/types';
import { ru } from '../i18n/ru';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { fr } from '../i18n/fr';
import { de } from '../i18n/de';

// Re-export types for backward compatibility
export type { Language, TranslationKeys, LanguageInfo } from '../i18n/types';
export { SUPPORTED_LANGUAGES } from '../i18n/types';

const translations: Record<Language, TranslationKeys> = { ru, en, es, fr, de };

const STORAGE_KEY = 'pianora_language';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLang = signal<Language>(this.getInitialLanguage());

  readonly language = this.currentLang.asReadonly();
  readonly languages = SUPPORTED_LANGUAGES;

  readonly currentLanguageInfo = computed(() =>
    SUPPORTED_LANGUAGES.find(l => l.code === this.currentLang()) || SUPPORTED_LANGUAGES[0]
  );

  private getInitialLanguage(): Language {
    // Try to get from localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as Language;
    if (stored && translations[stored]) {
      return stored;
    }

    // Default to Russian
    return 'ru';
  }

  setLanguage(lang: Language): void {
    if (translations[lang]) {
      this.currentLang.set(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  t(key: keyof TranslationKeys): string {
    const lang = this.currentLang();
    return translations[lang]?.[key] || translations['en'][key] || key;
  }

  // Helper for getting translation as signal for templates
  translate(key: keyof TranslationKeys) {
    return computed(() => this.t(key));
  }
}
