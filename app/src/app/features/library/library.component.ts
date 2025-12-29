import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@core/services/i18n.service';
import { LibraryService, Song } from '@core/services/library.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="library-page">
      <!-- Header with Import button -->
      <div class="library-header">
        <h1>{{ i18n.t('library.title') }}</h1>
        <label class="btn btn-secondary import-btn">
          {{ i18n.t('library.import') }}
          <input
            type="file"
            accept=".mid,.midi"
            (change)="onFileSelected($event)"
            hidden
          />
        </label>
      </div>

      <!-- Search Bar -->
      <div class="search-bar">
        <input
          type="text"
          class="search-input"
          [placeholder]="i18n.t('library.searchPlaceholder')"
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
        />
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab() === 'all'"
          (click)="activeTab.set('all')"
        >
          {{ i18n.t('library.all') }}
          <span class="tab-count">{{ libraryService.allSongs().length }}</span>
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'imported'"
          (click)="activeTab.set('imported')"
        >
          {{ i18n.t('library.imported') }}
          <span class="tab-count">{{ libraryService.importedSongs().length }}</span>
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'recordings'"
          (click)="activeTab.set('recordings')"
        >
          {{ i18n.t('library.recordings') }}
          <span class="tab-count">{{ libraryService.recordings().length }}</span>
        </button>
      </div>

      <!-- Loading state -->
      @if (libraryService.loading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <p>{{ i18n.t('common.loading') }}</p>
        </div>
      } @else {
        <!-- Songs List -->
        <div class="songs-list">
          @if (filteredSongs().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">🎵</span>
              <p>{{ i18n.t('library.noSongs') }}</p>
              <p class="text-muted">{{ i18n.t('library.noSongsDesc') }}</p>
            </div>
          } @else {
            @for (song of filteredSongs(); track song.id) {
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
                  <button
                    class="btn btn-icon"
                    [title]="i18n.t('library.play')"
                    (click)="playSong(song)"
                  >▶️</button>
                  <button
                    class="btn btn-icon"
                    [title]="i18n.t('library.learnSong')"
                    (click)="learnSong(song)"
                  >📖</button>
                  @if (song.type !== 'builtin') {
                    <button
                      class="btn btn-icon btn-delete"
                      [title]="i18n.t('library.delete')"
                      (click)="deleteSong(song)"
                    >🗑️</button>
                  }
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Storage Info -->
      <div class="storage-info">
        <div class="storage-bar">
          <div
            class="storage-used"
            [style.width.%]="libraryService.storagePercent()"
          ></div>
        </div>
        <p class="storage-text">
          {{ libraryService.formattedStorageUsed() }} / {{ libraryService.formattedTotalStorage() }} {{ i18n.t('library.storageUsed') }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .library-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .library-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h1 {
        margin: 0;
      }
    }

    .import-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .search-bar {
      margin-bottom: var(--spacing-sm);
    }

    .search-input {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 1rem;
      transition: border-color var(--transition-fast);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-accent);
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
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

    .tab-count {
      background: var(--color-bg-primary);
      padding: 2px 6px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      min-width: 20px;
      text-align: center;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl);
      gap: var(--spacing-md);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-bg-tertiary);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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
      flex: 1;
      min-width: 0;
    }

    .song-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .song-details {
      flex: 1;
      min-width: 0;

      h3 {
        font-size: 1rem;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .song-artist {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .song-actions {
      display: flex;
      gap: var(--spacing-xs);
      flex-shrink: 0;
    }

    .btn-icon {
      padding: var(--spacing-xs);
      min-width: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-delete:hover {
      background-color: rgba(244, 67, 54, 0.2);
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
  libraryService = inject(LibraryService);
  private router = inject(Router);

  activeTab = signal<'all' | 'imported' | 'recordings'>('all');
  searchQuery = signal('');

  filteredSongs = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    let songs: Song[];
    switch (tab) {
      case 'all':
        songs = this.libraryService.allSongs();
        break;
      case 'imported':
        songs = this.libraryService.importedSongs();
        break;
      case 'recordings':
        songs = this.libraryService.recordings();
        break;
      default:
        songs = this.libraryService.allSongs();
    }

    if (!query) return songs;

    return songs.filter(song =>
      song.name.toLowerCase().includes(query) ||
      (song.artist?.toLowerCase().includes(query) ?? false)
    );
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      try {
        await this.libraryService.importMidiFile(file);
        // Switch to imported tab to show the new file
        this.activeTab.set('imported');
      } catch (error) {
        console.error('Failed to import file:', error);
      }
    }
    // Reset input
    input.value = '';
  }

  playSong(song: Song): void {
    // Navigate to learn page with song selected
    this.router.navigate(['/learn'], { queryParams: { song: song.id } });
  }

  learnSong(song: Song): void {
    this.router.navigate(['/learn'], { queryParams: { song: song.id } });
  }

  async deleteSong(song: Song): Promise<void> {
    if (confirm(this.i18n.t('library.confirmDelete'))) {
      try {
        await this.libraryService.deleteSong(song.id);
      } catch (error) {
        console.error('Failed to delete song:', error);
      }
    }
  }
}
