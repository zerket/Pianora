import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';
import { LibraryService, Song } from '@core/services/library.service';
import { MidiPlayerService, LearningMode } from '@core/services/midi-player.service';
import { PianoVisualizerComponent } from '@shared/components/piano-visualizer/piano-visualizer.component';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PianoVisualizerComponent],
  template: `
    <div class="learn-page">
      <h1>{{ i18n.t('learn.title') }}</h1>

      <!-- Song Selection -->
      <section class="song-selection card">
        <label class="select-label">{{ i18n.t('learn.selectSong') }}</label>
        <div class="song-select-wrapper">
          <select
            class="song-select"
            (change)="onSongSelect($event)"
          >
            <option value="" [selected]="!selectedSongId()">-- {{ i18n.t('learn.selectSong') }} --</option>
            @for (song of libraryService.allSongs(); track song.id) {
              <option [value]="song.id" [selected]="selectedSongId() === song.id">
                {{ song.name }}{{ song.artist ? ' - ' + song.artist : '' }}
              </option>
            }
          </select>
          @if (!libraryService.allSongs().length) {
            <a routerLink="/library" class="btn btn-secondary btn-sm">
              {{ i18n.t('learn.browseLibrary') }}
            </a>
          }
        </div>
      </section>

      <!-- Piano Visualizer with Sheet Music -->
      <section class="visualizer-section">
        <app-piano-visualizer
          [mode]="'preview'"
          [previewNotes]="midiPlayer.currentSong()?.allNotes ?? []"
          [currentTime]="midiPlayer.currentTime()"
          [expectedNoteNumbers]="midiPlayer.expectedNotes()"
          [trackHands]="midiPlayer.trackHands()"
        />
      </section>

      <!-- Learning Mode Tabs -->
      <section class="mode-tabs card">
        <div class="tabs-header">
          <span class="tabs-label">{{ i18n.t('learn.learningModes') }}:</span>
          <div class="tabs">
            <button
              class="tab"
              [class.active]="midiPlayer.learningMode() === 'wait'"
              (click)="setMode('wait')"
            >
              {{ i18n.t('learn.waitMode') }}
            </button>
            <button
              class="tab"
              [class.active]="midiPlayer.learningMode() === 'rhythm'"
              (click)="setMode('rhythm')"
            >
              {{ i18n.t('learn.rhythmMode') }}
            </button>
            <button
              class="tab"
              [class.active]="midiPlayer.learningMode() === 'autoplay'"
              (click)="setMode('autoplay')"
            >
              {{ i18n.t('learn.autoScroll') }}
            </button>
          </div>
        </div>

        <!-- Mode Description -->
        <p class="mode-description text-muted">
          @switch (midiPlayer.learningMode()) {
            @case ('wait') { {{ i18n.t('learn.waitModeDesc') }} }
            @case ('rhythm') { {{ i18n.t('learn.rhythmModeDesc') }} }
            @case ('autoplay') { {{ i18n.t('learn.autoScrollDesc') }} }
          }
        </p>
      </section>

      <!-- Progress Bar -->
      <section class="progress-section card">
        <div class="progress-time">
          <span>{{ midiPlayer.formatTime(midiPlayer.currentTime()) }}</span>
          <span>{{ midiPlayer.formatTime(midiPlayer.duration()) }}</span>
        </div>
        <div
          class="progress-bar-wrapper"
          (click)="onProgressClick($event)"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="midiPlayer.progress()"
            ></div>
          </div>
        </div>
      </section>

      <!-- Playback Controls -->
      <section class="playback-controls">
        <button
          class="btn btn-primary btn-lg"
          [disabled]="!midiPlayer.currentSong()"
          (click)="togglePlay()"
        >
          @if (midiPlayer.isPlaying()) {
            <span class="btn-icon">⏸</span> {{ i18n.t('learn.pause') }}
          } @else {
            <span class="btn-icon">▶</span> {{ i18n.t('learn.play') }}
          }
        </button>
        <button
          class="btn btn-secondary"
          [disabled]="!midiPlayer.currentSong()"
          (click)="stop()"
        >
          <span class="btn-icon">⏹</span> {{ i18n.t('learn.stop') }}
        </button>
      </section>

      <!-- Tempo Control -->
      <section class="tempo-control card">
        <label class="tempo-label">
          {{ i18n.t('learn.tempo') }}:
          <span class="tempo-value">{{ Math.round(midiPlayer.playbackSpeed() * 100) }}%</span>
        </label>
        <input
          type="range"
          class="tempo-slider"
          min="0.25"
          max="1.5"
          step="0.05"
          [value]="midiPlayer.playbackSpeed()"
          (input)="onSpeedChange($event)"
        />
        <div class="tempo-marks">
          <span>25%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </section>

      <!-- Waiting Indicator -->
      @if (midiPlayer.isWaiting()) {
        <div class="waiting-indicator">
          <span class="waiting-icon">⏳</span>
          <span>{{ i18n.t('learn.waitingForNotes') }}</span>
        </div>
      }

      <!-- Offline Mode Info -->
      @if (!connectionService.connected()) {
        <div class="offline-info">
          <span class="info-icon">ℹ️</span>
          <div class="info-content">
            <p class="info-title">{{ i18n.t('learn.offlineMode') }}</p>
            <p>{{ i18n.t('learn.offlineModeDesc') }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .learn-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      h1 {
        margin-bottom: var(--spacing-xs);
      }
    }

    .song-selection {
      padding: var(--spacing-md);

      .select-label {
        display: block;
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }

      .song-select-wrapper {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
      }

      .song-select {
        flex: 1;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        font-size: 1rem;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }
    }

    .visualizer-section {
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .mode-tabs {
      padding: var(--spacing-md);

      .tabs-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        flex-wrap: wrap;
        margin-bottom: var(--spacing-sm);
      }

      .tabs-label {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
      }

      .tabs {
        display: flex;
        gap: var(--spacing-xs);
      }

      .tab {
        padding: var(--spacing-xs) var(--spacing-md);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: var(--color-bg-tertiary);
        }

        &.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }
      }

      .mode-description {
        font-size: 0.85rem;
        margin: 0;
      }
    }

    .tempo-control {
      padding: var(--spacing-md);

      .tempo-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }

      .tempo-value {
        font-weight: 600;
        color: var(--color-primary);
      }

      .tempo-slider {
        width: 100%;
        height: 8px;
        background: var(--color-bg-tertiary);
        border-radius: 4px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
        margin: 8px 0;

        &::-webkit-slider-runnable-track {
          height: 8px;
          background: var(--color-bg-tertiary);
          border-radius: 4px;
        }

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--color-primary);
          border-radius: 50%;
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid white;
        }

        &::-moz-range-track {
          height: 8px;
          background: var(--color-bg-tertiary);
          border-radius: 4px;
        }

        &::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--color-primary);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
      }

      .tempo-marks {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: var(--spacing-xs);
      }
    }

    .playback-controls {
      display: flex;
      justify-content: center;
      gap: var(--spacing-md);

      .btn-lg {
        padding: var(--spacing-md) var(--spacing-xl);
        font-size: 1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
      }

      .btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
      }

      .btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1em;
        line-height: 1;
      }
    }

    .progress-section {
      padding: var(--spacing-md);

      .progress-time {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }

      .progress-bar-wrapper {
        cursor: pointer;
        padding: var(--spacing-xs) 0;
        position: relative;
      }

      .progress-bar {
        height: 8px;
        background: var(--color-bg-tertiary);
        border-radius: 4px;
        overflow: visible;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        border-radius: 4px;
        transition: width 0.1s linear;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid var(--color-primary);
        }
      }
    }

    .waiting-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(255, 193, 7, 0.15);
      border: 1px solid rgba(255, 193, 7, 0.4);
      border-radius: var(--radius-md);
      color: var(--color-warning);
      font-size: 0.95rem;
      animation: pulse 1.5s ease-in-out infinite;

      .waiting-icon {
        font-size: 1.2rem;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .offline-info {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: rgba(33, 150, 243, 0.15);
      border: 1px solid rgba(33, 150, 243, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.9rem;
      line-height: 1.6;

      .info-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .info-content {
        flex: 1;

        p {
          margin: 0;
        }

        .info-title {
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
          color: #2196f3;
        }
      }
    }
  `]
})
export class LearnComponent implements OnInit, OnDestroy {
  connectionService = inject(CONNECTION_SERVICE);
  i18n = inject(I18nService);
  libraryService = inject(LibraryService);
  midiPlayer = inject(MidiPlayerService);
  private route = inject(ActivatedRoute);

  Math = Math;

  selectedSongId = signal<string>('');
  private animationFrameId: number | null = null;

  constructor() {
    // Update visualizer when playing
    effect(() => {
      if (this.midiPlayer.isPlaying()) {
        this.startAnimationLoop();
      } else {
        this.stopAnimationLoop();
      }
    });

    // Watch for hotkey events from piano
    effect(() => {
      const hotkey = this.connectionService.lastHotkey();
      if (hotkey && hotkey.action === 'play_pause') {
        // Toggle play/pause if a song is loaded
        if (this.midiPlayer.currentSong()) {
          this.togglePlayPause();
        }
      }
    });
  }

  private togglePlayPause(): void {
    if (this.midiPlayer.isPlaying()) {
      this.midiPlayer.pause();
    } else {
      this.midiPlayer.play();
    }
  }

  ngOnInit(): void {
    // Check for song parameter from URL
    this.route.queryParams.subscribe(async (params) => {
      if (params['song']) {
        const songId = params['song'];
        this.selectedSongId.set(songId);

        // Wait for library to load if needed
        if (this.libraryService.loading()) {
          // Poll until library is loaded
          const checkInterval = setInterval(async () => {
            if (!this.libraryService.loading()) {
              clearInterval(checkInterval);
              await this.loadSong(songId);
            }
          }, 100);
        } else {
          await this.loadSong(songId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.midiPlayer.stop();
    this.stopAnimationLoop();
  }

  async onSongSelect(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const songId = select.value;
    this.selectedSongId.set(songId);

    if (songId) {
      await this.loadSong(songId);
    }
  }

  private async loadSong(songId: string): Promise<void> {
    const song = this.libraryService.allSongs().find(s => s.id === songId);
    if (!song) return;

    try {
      const data = await this.libraryService.getMidiData(song);
      await this.midiPlayer.loadMidi(data);
    } catch (error) {
      console.error('Failed to load song:', error);
    }
  }

  setMode(mode: LearningMode): void {
    this.midiPlayer.setLearningMode(mode);
  }

  onSpeedChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.midiPlayer.setSpeed(parseFloat(input.value));
  }

  async togglePlay(): Promise<void> {
    if (this.midiPlayer.isPlaying()) {
      this.midiPlayer.pause();
    } else {
      await this.midiPlayer.play();
    }
  }

  stop(): void {
    this.midiPlayer.stop();
  }

  onProgressClick(event: MouseEvent): void {
    const wrapper = event.currentTarget as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const time = percent * this.midiPlayer.duration();
    this.midiPlayer.seekTo(time);
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
