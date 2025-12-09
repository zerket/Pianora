import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@core/services/i18n.service';

interface Song {
  name: string;
  artist?: string;
  duration?: number;
  type: 'builtin' | 'imported' | 'recording';
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="library-page">
      <h1>{{ i18n.t('library.title') }}</h1>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab() === 'all'"
          (click)="activeTab.set('all')"
        >
          {{ i18n.t('library.all') }}
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'imported'"
          (click)="activeTab.set('imported')"
        >
          {{ i18n.t('library.imported') }}
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'recordings'"
          (click)="activeTab.set('recordings')"
        >
          {{ i18n.t('library.recordings') }}
        </button>
      </div>

      <!-- Upload Button -->
      <div class="upload-section">
        <label class="btn btn-secondary upload-btn">
          <span>📁 {{ i18n.t('library.importMidi') }}</span>
          <input
            type="file"
            accept=".mid,.midi"
            (change)="onFileSelected($event)"
            hidden
          />
        </label>
      </div>

      <!-- Songs List -->
      <div class="songs-list">
        @if (filteredSongs().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">🎵</span>
            <p>{{ i18n.t('library.noSongs') }}</p>
            <p class="text-muted">{{ i18n.t('library.noSongsDesc') }}</p>
          </div>
        } @else {
          @for (song of filteredSongs(); track song.name) {
            <div class="song-item card">
              <div class="song-info">
                <span class="song-icon">
                  @switch (song.type) {
                    @case ('builtin') { 📚 }
                    @case ('imported') { 📁 }
                    @case ('recording') { 🎤 }
                  }
                </span>
                <div class="song-details">
                  <h3>{{ song.name }}</h3>
                  @if (song.artist) {
                    <p class="song-artist">{{ song.artist }}</p>
                  }
                </div>
              </div>
              <div class="song-actions">
                <button class="btn btn-icon" [title]="i18n.t('library.play')">▶️</button>
                <button class="btn btn-icon" [title]="i18n.t('library.learnSong')">📖</button>
                @if (song.type !== 'builtin') {
                  <button class="btn btn-icon" [title]="i18n.t('library.delete')">🗑️</button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Storage Info -->
      <div class="storage-info">
        <div class="storage-bar">
          <div
            class="storage-used"
            [style.width.%]="storagePercent()"
          ></div>
        </div>
        <p class="storage-text">
          {{ usedStorage() }} / {{ totalStorage() }} {{ i18n.t('library.storageUsed') }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .library-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      h1 {
        margin-bottom: 0;
      }
    }

    .tabs {
      display: flex;
      gap: var(--spacing-xs);
      background-color: var(--color-bg-secondary);
      padding: var(--spacing-xs);
      border-radius: var(--radius-lg);
    }

    .tab {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-secondary);
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
      }

      &.active {
        background-color: var(--color-bg-tertiary);
        color: var(--color-text-primary);
      }
    }

    .upload-section {
      display: flex;
      justify-content: center;
    }

    .upload-btn {
      width: 100%;
      justify-content: center;
    }

    .songs-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-xl);
      text-align: center;

      .empty-icon {
        font-size: 3rem;
        margin-bottom: var(--spacing-md);
        opacity: 0.5;
      }

      p {
        margin: 0;
      }
    }

    .song-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
    }

    .song-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .song-icon {
      font-size: 1.5rem;
    }

    .song-details {
      h3 {
        font-size: 1rem;
        margin: 0;
      }

      .song-artist {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    .song-actions {
      display: flex;
      gap: var(--spacing-xs);
    }

    .storage-info {
      margin-top: auto;
      padding-top: var(--spacing-md);
    }

    .storage-bar {
      height: 4px;
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: var(--spacing-xs);
    }

    .storage-used {
      height: 100%;
      background-color: var(--color-accent);
      transition: width var(--transition-normal);
    }

    .storage-text {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
      text-align: center;
      margin: 0;
    }
  `]
})
export class LibraryComponent {
  i18n = inject(I18nService);

  activeTab = signal<'all' | 'imported' | 'recordings'>('all');

  // Mock data - would come from API
  songs = signal<Song[]>([
    { name: 'Für Elise', artist: 'Beethoven', type: 'builtin' },
    { name: 'Moonlight Sonata', artist: 'Beethoven', type: 'builtin' },
  ]);

  usedStorage = signal('1.2 MB');
  totalStorage = signal('16 MB');
  storagePercent = signal(7.5);

  filteredSongs() {
    const tab = this.activeTab();
    const allSongs = this.songs();

    if (tab === 'all') return allSongs;
    if (tab === 'imported') return allSongs.filter(s => s.type === 'imported');
    if (tab === 'recordings') return allSongs.filter(s => s.type === 'recording');
    return allSongs;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('Selected file:', file.name);
      // TODO: Upload file to controller
    }
  }
}
