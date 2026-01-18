import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CONNECTION_SERVICE, RecordingData } from '@core/services/connection.provider';
import { I18nService } from '@core/services/i18n.service';
import { LibraryService, Song } from '@core/services/library.service';
import { MidiPlayerService } from '@core/services/midi-player.service';
import { LedMode } from '@core/models/settings.model';
import { TranslationKeys } from '@core/i18n/types';
import { PianoVisualizerComponent } from '@shared/components/piano-visualizer/piano-visualizer.component';

interface ModeOption {
  mode: LedMode;
  labelKey: keyof TranslationKeys;
  icon: string;
  descKey: keyof TranslationKeys;
}

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule, FormsModule, PianoVisualizerComponent],
  template: `
    <div class="play-page">
      <h1>{{ i18n.t('play.title') }}</h1>

      <!-- Piano Visualizer - always visible -->
      <app-piano-visualizer></app-piano-visualizer>

      <!-- Mode Selection -->
      <section class="modes-section">
        <h2>{{ i18n.t('play.selectMode') }}</h2>
        <div class="modes-grid">
          @for (option of modeOptions; track option.mode) {
            <button
              class="mode-card"
              [class.active]="currentMode() === option.mode"
              (click)="selectMode(option.mode)"
            >
              <span class="mode-icon">{{ option.icon }}</span>
              <span class="mode-label">{{ i18n.t(option.labelKey) }}</span>
              <span class="mode-description">{{ i18n.t(option.descKey) }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Quick Settings -->
      <section class="settings-section card">
        <h2>{{ i18n.t('play.quickSettings') }}</h2>

        <div class="setting-row">
          <label>{{ i18n.t('play.brightness') }}</label>
          <div class="setting-control">
            <input
              type="range"
              min="0"
              max="255"
              [ngModel]="brightness()"
              (ngModelChange)="setBrightness($event)"
            />
            <span class="setting-value">{{ brightness() }}</span>
          </div>
        </div>

        <div class="setting-row">
          <label>{{ i18n.t('play.color') }}</label>
          <div class="setting-control">
            <input
              type="color"
              [ngModel]="colorHex()"
              (ngModelChange)="setColor($event)"
              class="color-picker"
            />
          </div>
        </div>

        @if (currentMode() === LedMode.VISUALIZER) {
          <div class="setting-row">
            <label>{{ i18n.t('play.fadeTime') }}</label>
            <div class="setting-control">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                [ngModel]="fadeTime()"
                (ngModelChange)="setFadeTime($event)"
              />
              <span class="setting-value">{{ fadeTime() }}{{ i18n.t('common.ms') }}</span>
            </div>
          </div>

          <div class="setting-row">
            <label>{{ i18n.t('play.waveEffect') }}</label>
            <div class="setting-control">
              <label class="toggle">
                <input
                  type="checkbox"
                  [ngModel]="waveEnabled()"
                  (ngModelChange)="setWaveEnabled($event)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          @if (waveEnabled()) {
            <div class="setting-row">
              <label>{{ i18n.t('play.waveWidth') }}</label>
              <div class="setting-control">
                <input
                  type="range"
                  min="1"
                  max="10"
                  [ngModel]="waveWidth()"
                  (ngModelChange)="setWaveWidth($event)"
                />
                <span class="setting-value">{{ waveWidth() }} {{ i18n.t('common.leds') }}</span>
              </div>
            </div>
          }
        }
      </section>

      <!-- Split Mode Settings -->
      @if (currentMode() === LedMode.SPLIT) {
        <section class="settings-section card">
          <h2>{{ i18n.t('play.split.title') }}</h2>

          <div class="setting-row">
            <label>{{ i18n.t('play.split.splitPoint') }}</label>
            <div class="setting-control">
              <input
                type="range"
                min="0"
                max="87"
                [ngModel]="splitPoint()"
                (ngModelChange)="setSplitPoint($event)"
              />
              <span class="setting-value">{{ getNoteName(splitPoint() + 21) }}</span>
            </div>
          </div>

          <div class="setting-row">
            <label>{{ i18n.t('play.split.leftColor') }}</label>
            <input
              type="color"
              [ngModel]="leftColorHex()"
              (ngModelChange)="setLeftColor($event)"
              class="color-picker"
            />
          </div>

          <div class="setting-row">
            <label>{{ i18n.t('play.split.rightColor') }}</label>
            <input
              type="color"
              [ngModel]="rightColorHex()"
              (ngModelChange)="setRightColor($event)"
              class="color-picker"
            />
          </div>
        </section>
      }

      <!-- Effects (for Free Play, Visualizer) -->
      @if (currentMode() === LedMode.FREE_PLAY || currentMode() === LedMode.VISUALIZER) {
        <section class="settings-section card">
          <h2>{{ i18n.t('play.effects.title') }}</h2>

          <!-- Background Layer -->
          <div class="setting-row">
            <label>{{ i18n.t('play.effects.background') }}</label>
            <label class="toggle">
              <input
                type="checkbox"
                [ngModel]="backgroundEnabled()"
                (ngModelChange)="setBackgroundEnabled($event)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          @if (backgroundEnabled()) {
            <div class="setting-row">
              <label>{{ i18n.t('play.effects.bgColor') }}</label>
              <input
                type="color"
                [ngModel]="bgColorHex()"
                (ngModelChange)="setBackgroundColor($event)"
                class="color-picker"
              />
            </div>

            <div class="setting-row">
              <label>{{ i18n.t('play.effects.bgBrightness') }}</label>
              <div class="setting-control">
                <input
                  type="range"
                  min="0"
                  max="64"
                  [ngModel]="backgroundBrightness()"
                  (ngModelChange)="setBackgroundBrightness($event)"
                />
                <span class="setting-value">{{ backgroundBrightness() }}</span>
              </div>
            </div>
          }

          <!-- Hue Shift -->
          <div class="setting-row">
            <label>{{ i18n.t('play.effects.hueShift') }}</label>
            <label class="toggle">
              <input
                type="checkbox"
                [ngModel]="hueShiftEnabled()"
                (ngModelChange)="setHueShiftEnabled($event)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          @if (hueShiftEnabled()) {
            <div class="setting-row">
              <label>{{ i18n.t('play.effects.shiftAmount') }}</label>
              <div class="setting-control">
                <input
                  type="range"
                  min="1"
                  max="50"
                  [ngModel]="hueShiftAmount()"
                  (ngModelChange)="setHueShiftAmount($event)"
                />
                <span class="setting-value">{{ hueShiftAmount() }}</span>
              </div>
            </div>
          }
        </section>
      }

      <!-- Recording Controls -->
      <section class="settings-section card">
        <h2>{{ i18n.t('play.recording.title') }}</h2>

        <div class="recording-controls">
          @if (!connectionService.isRecording()) {
            <button class="btn btn-primary record-btn" (click)="startRecording()">
              <span class="record-icon">⏺</span>
              {{ i18n.t('play.recording.start') }}
            </button>
          } @else {
            <button class="btn btn-danger record-btn recording" (click)="stopRecording()">
              <span class="stop-icon">⏹</span>
              {{ i18n.t('play.recording.stop') }}
            </button>
            <span class="recording-status">
              {{ i18n.t('play.recording.inProgress') }}: {{ connectionService.recordingNotes() }} notes
            </span>
          }
        </div>

        @if (lastRecordingData()) {
          <div class="recording-result">
            <p>Recorded {{ lastRecordingData()!.totalNotes }} notes ({{ formatDuration(lastRecordingData()!.durationMs) }})</p>
            <div class="recording-actions">
              <button class="btn btn-primary" (click)="saveRecording()">Save to Library</button>
              <button class="btn btn-secondary" (click)="discardRecording()">Discard</button>
            </div>
          </div>
        }
      </section>

      <!-- Demo Mode Controls -->
      @if (currentMode() === LedMode.DEMO) {
        <section class="settings-section card">
          <h2>{{ i18n.t('play.demo.title') }}</h2>

          <!-- Song Selection -->
          @if (!selectedSong()) {
            <div class="song-selector">
              <p class="hint-text">{{ i18n.t('play.demo.selectSongHint') }}</p>
              <button class="btn btn-primary" (click)="toggleSongList()">
                {{ i18n.t('play.demo.chooseSong') }}
              </button>
            </div>
          } @else {
            <div class="selected-song">
              <div class="song-info">
                <span class="song-name">{{ selectedSong()!.name }}</span>
                @if (selectedSong()!.artist) {
                  <span class="song-artist">{{ selectedSong()!.artist }}</span>
                }
              </div>
              <button class="btn btn-secondary btn-sm" (click)="clearSelectedSong()">
                {{ i18n.t('play.demo.changeSong') }}
              </button>
            </div>

            <!-- Playback Controls -->
            <div class="playback-controls">
              @if (!midiPlayer.isPlaying()) {
                <button class="btn btn-primary playback-btn" (click)="playDemo()">
                  <span class="icon">▶</span>
                  {{ i18n.t('learn.play') }}
                </button>
              } @else {
                <button class="btn btn-secondary playback-btn" (click)="pauseDemo()">
                  <span class="icon">⏸</span>
                  {{ i18n.t('learn.pause') }}
                </button>
              }
              <button class="btn btn-secondary playback-btn" (click)="stopDemo()" [disabled]="!midiPlayer.currentSong()">
                <span class="icon">⏹</span>
                {{ i18n.t('learn.stop') }}
              </button>
            </div>

            <!-- Progress Bar -->
            @if (midiPlayer.currentSong()) {
              <div class="progress-section">
                <div class="progress-bar" (click)="seekDemo($event)">
                  <div class="progress-fill" [style.width.%]="midiPlayer.progress()"></div>
                </div>
                <div class="time-display">
                  <span>{{ midiPlayer.formatTime(midiPlayer.currentTime()) }}</span>
                  <span>{{ midiPlayer.formatTime(midiPlayer.duration()) }}</span>
                </div>
              </div>

              <!-- Tempo Control -->
              <div class="tempo-control">
                <label class="tempo-label">
                  {{ i18n.t('play.demo.tempo') }}:
                  <span class="tempo-value">{{ Math.round(midiPlayer.playbackSpeed() * 100) }}%</span>
                </label>
                <input
                  type="range"
                  class="tempo-slider"
                  min="0.25"
                  max="1.5"
                  step="0.05"
                  [value]="midiPlayer.playbackSpeed()"
                  (input)="onDemoSpeedChange($event)"
                />
                <div class="tempo-marks">
                  <span>25%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>
            }
          }

          <!-- Song List Modal -->
          @if (showSongList()) {
            <div class="song-list-overlay" (click)="toggleSongList()">
              <div class="song-list-modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>{{ i18n.t('play.demo.chooseSong') }}</h3>
                  <button class="close-btn" (click)="toggleSongList()">×</button>
                </div>
                <div class="song-list">
                  @if (libraryService.loading()) {
                    <p class="loading">{{ i18n.t('common.loading') }}</p>
                  } @else if (libraryService.allSongs().length === 0) {
                    <p class="no-songs">{{ i18n.t('library.noSongs') }}</p>
                  } @else {
                    @for (song of libraryService.allSongs(); track song.id) {
                      <button class="song-item" (click)="selectSong(song)">
                        <span class="song-type-badge" [attr.data-type]="song.type">
                          {{ getSongTypeIcon(song.type) }}
                        </span>
                        <div class="song-details">
                          <span class="song-name">{{ song.name }}</span>
                          @if (song.artist) {
                            <span class="song-artist">{{ song.artist }}</span>
                          }
                        </div>
                      </button>
                    }
                  }
                </div>
              </div>
            </div>
          }
        </section>
      }

      <!-- Active Notes Display -->
      @if (connectionService.activeNotes().size > 0) {
        <section class="active-notes card">
          <h3>{{ i18n.t('play.activeNotes') }}</h3>
          <div class="notes-display">
            @for (note of activeNotesArray(); track note) {
              <span class="note-badge">{{ getNoteName(note) }}</span>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .play-page {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      h1 {
        margin-bottom: var(--spacing-sm);
      }
    }

    .modes-section h2,
    .settings-section h2 {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .modes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
    }

    .mode-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      background-color: var(--color-bg-secondary);
      border: 2px solid transparent;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      cursor: pointer;
      color: var(--color-text-primary);

      &:hover {
        background-color: var(--color-bg-tertiary);
      }

      &.active {
        border-color: var(--color-accent);
        background-color: var(--color-bg-tertiary);
      }
    }

    .mode-icon {
      font-size: 2rem;
      color: white;
    }

    .mode-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: white;
    }

    .mode-description {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-align: center;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);

      label {
        font-size: 0.9rem;
        white-space: nowrap;
      }
    }

    .setting-control {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex: 1;
      max-width: 200px;

      input[type="range"] {
        flex: 1;
      }
    }

    .setting-value {
      min-width: 60px;
      text-align: right;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .color-picker {
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      background: none;

      &::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      &::-webkit-color-swatch {
        border: none;
        border-radius: var(--radius-md);
      }
    }

    .active-notes {
      h3 {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }
    }

    .notes-display {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .note-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      background-color: var(--color-accent);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .recording-controls {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .record-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--radius-md);
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all var(--transition-fast);

      .record-icon {
        color: #ff4444;
        font-size: 1.2rem;
      }

      .stop-icon {
        font-size: 1.2rem;
      }

      &.recording {
        animation: pulse 1.5s infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .recording-status {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .recording-result {
      margin-top: var(--spacing-md);
      padding: var(--spacing-md);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);

      p {
        margin-bottom: var(--spacing-md);
        color: var(--color-text-primary);
      }
    }

    .recording-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 0.8;
      }

      &.btn-primary {
        background-color: var(--color-accent);
        color: white;
      }

      &.btn-secondary {
        background-color: var(--color-bg-secondary);
        color: var(--color-text-primary);
      }

      &.btn-danger {
        background-color: #dc3545;
        color: white;
      }

      &.btn-sm {
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: 0.8rem;
      }
    }

    /* Demo Mode Styles */
    .song-selector {
      text-align: center;
      padding: var(--spacing-md);

      .hint-text {
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-md);
      }
    }

    .selected-song {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm);
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
    }

    .song-info {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .song-name {
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .song-artist {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
      }
    }

    .playback-controls {
      display: flex;
      justify-content: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .playback-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      min-width: 100px;
      justify-content: center;

      .icon {
        font-size: 1rem;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .progress-bar {
      height: 8px;
      background-color: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
      overflow: hidden;
      cursor: pointer;
    }

    .progress-fill {
      height: 100%;
      background-color: var(--color-accent);
      transition: width 0.1s linear;
    }

    .time-display {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }

    /* Tempo Control */
    .tempo-control {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-bg-tertiary);

      .tempo-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-sm);
      }

      .tempo-value {
        font-weight: 600;
        color: var(--color-accent);
      }

      .tempo-slider {
        width: 100%;
        height: 6px;
        background: var(--color-bg-tertiary);
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--color-accent);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        &::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--color-accent);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }

      .tempo-marks {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: var(--color-text-muted);
        margin-top: var(--spacing-xs);
      }
    }

    /* Song List Modal */
    .song-list-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--spacing-md);
    }

    .song-list-modal {
      background-color: var(--color-bg-primary);
      border-radius: var(--radius-lg);
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--color-bg-tertiary);

      h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--color-text-secondary);
        cursor: pointer;
        padding: 0;
        line-height: 1;

        &:hover {
          color: var(--color-text-primary);
        }
      }
    }

    .song-list {
      overflow-y: auto;
      padding: var(--spacing-sm);
      max-height: 400px;

      .loading, .no-songs {
        text-align: center;
        color: var(--color-text-secondary);
        padding: var(--spacing-lg);
      }
    }

    .song-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--color-bg-secondary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      margin-bottom: var(--spacing-xs);
      text-align: left;
      color: var(--color-text-primary);
      transition: background-color var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-tertiary);
      }
    }

    .song-type-badge {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      background-color: var(--color-bg-tertiary);

      &[data-type="builtin"] {
        background-color: rgba(74, 144, 226, 0.2);
      }

      &[data-type="imported"] {
        background-color: rgba(80, 200, 120, 0.2);
      }

      &[data-type="recording"] {
        background-color: rgba(255, 107, 107, 0.2);
      }
    }

    .song-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;

      .song-name {
        font-weight: 500;
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .song-artist {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  `]
})
export class PlayComponent {
  connectionService = inject(CONNECTION_SERVICE);
  libraryService = inject(LibraryService);
  midiPlayer = inject(MidiPlayerService);
  i18n = inject(I18nService);
  LedMode = LedMode;
  Math = Math;

  // Recording state
  lastRecordingData = signal<RecordingData | null>(null);

  // Demo mode state
  selectedSong = signal<Song | null>(null);
  showSongList = signal(false);

  constructor() {
    // Watch for recording data from connection service
    effect(() => {
      const data = this.connectionService.recordingData();
      if (data && data.totalNotes > 0) {
        this.lastRecordingData.set(data);
      }
    });

    // Watch for hotkey events from piano
    effect(() => {
      const hotkey = this.connectionService.lastHotkey();
      if (hotkey && hotkey.action === 'play_pause') {
        // Only handle if in Demo mode and a song is selected
        if (this.currentMode() === LedMode.DEMO && this.selectedSong()) {
          this.togglePlayPause();
        }
      }
    });

    // Set autoplay mode for demo
    this.midiPlayer.setLearningMode('autoplay');
  }

  private togglePlayPause(): void {
    if (this.midiPlayer.isPlaying()) {
      this.midiPlayer.pause();
    } else {
      this.midiPlayer.play();
    }
  }

  // Local state
  brightness = signal(128);
  colorHex = signal('#ffffff');
  fadeTime = signal(200);
  waveEnabled = signal(false);
  waveWidth = signal(3);

  // Split mode settings
  splitPoint = signal(44);  // Middle of keyboard (key index 0-87)
  leftColorHex = signal('#ff0000');  // Red
  rightColorHex = signal('#00ffff');  // Cyan

  // Background layer settings
  backgroundEnabled = signal(false);
  bgColorHex = signal('#00a0ff');  // Cyan-blue
  backgroundBrightness = signal(32);

  // Hue shift settings
  hueShiftEnabled = signal(false);
  hueShiftAmount = signal(10);

  currentMode = signal(LedMode.FREE_PLAY);

  modeOptions: ModeOption[] = [
    {
      mode: LedMode.FREE_PLAY,
      labelKey: 'play.mode.freePlay',
      icon: '🎹',
      descKey: 'play.mode.freePlayDesc'
    },
    {
      mode: LedMode.VELOCITY,
      labelKey: 'play.mode.velocity',
      icon: '💪',
      descKey: 'play.mode.velocityDesc'
    },
    {
      mode: LedMode.SPLIT,
      labelKey: 'play.mode.split',
      icon: '↔️',
      descKey: 'play.mode.splitDesc'
    },
    {
      mode: LedMode.RANDOM,
      labelKey: 'play.mode.random',
      icon: '🎲',
      descKey: 'play.mode.randomDesc'
    },
    {
      mode: LedMode.VISUALIZER,
      labelKey: 'play.mode.visualizer',
      icon: '✨',
      descKey: 'play.mode.visualizerDesc'
    },
    {
      mode: LedMode.AMBIENT,
      labelKey: 'play.mode.ambient',
      icon: '🌈',
      descKey: 'play.mode.ambientDesc'
    },
    {
      mode: LedMode.DEMO,
      labelKey: 'play.mode.demo',
      icon: '🎵',
      descKey: 'play.mode.demoDesc'
    }
  ];

  activeNotesArray() {
    return Array.from(this.connectionService.activeNotes());
  }

  selectMode(mode: LedMode): void {
    this.currentMode.set(mode);
    this.connectionService.setMode(mode);
  }

  setBrightness(value: number): void {
    this.brightness.set(value);
    this.connectionService.setSettings({ brightness: value });
  }

  setColor(hex: string): void {
    this.colorHex.set(hex);
    const rgb = this.hexToRgb(hex);
    if (rgb) {
      this.connectionService.setSettings({ color: rgb });
    }
  }

  setFadeTime(value: number): void {
    this.fadeTime.set(value);
    this.connectionService.setSettings({ fadeTime: value });
  }

  setWaveEnabled(value: boolean): void {
    this.waveEnabled.set(value);
    this.connectionService.setSettings({ waveEnabled: value });
  }

  setWaveWidth(value: number): void {
    this.waveWidth.set(value);
    this.connectionService.setSettings({ waveWidth: value });
  }

  getNoteName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  // Split mode methods
  setSplitPoint(value: number): void {
    this.splitPoint.set(value);
    this.connectionService.send('set_split', { splitPoint: value });
  }

  setLeftColor(hex: string): void {
    this.leftColorHex.set(hex);
    const hue = this.hexToHue(hex);
    this.connectionService.send('set_split', { leftHue: hue, leftSat: 255 });
  }

  setRightColor(hex: string): void {
    this.rightColorHex.set(hex);
    const hue = this.hexToHue(hex);
    this.connectionService.send('set_split', { rightHue: hue, rightSat: 255 });
  }

  // Background layer methods
  setBackgroundEnabled(enabled: boolean): void {
    this.backgroundEnabled.set(enabled);
    this.connectionService.send('set_background', { enabled });
  }

  setBackgroundColor(hex: string): void {
    this.bgColorHex.set(hex);
    const hue = this.hexToHue(hex);
    this.connectionService.send('set_background', {
      enabled: this.backgroundEnabled(),
      hue,
      saturation: 255,
      brightness: this.backgroundBrightness()
    });
  }

  setBackgroundBrightness(value: number): void {
    this.backgroundBrightness.set(value);
    this.connectionService.send('set_background', {
      enabled: this.backgroundEnabled(),
      brightness: value
    });
  }

  // Hue shift methods
  setHueShiftEnabled(enabled: boolean): void {
    this.hueShiftEnabled.set(enabled);
    this.connectionService.send('set_hue_shift', { enabled });
  }

  setHueShiftAmount(value: number): void {
    this.hueShiftAmount.set(value);
    this.connectionService.send('set_hue_shift', {
      enabled: this.hueShiftEnabled(),
      amount: value
    });
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : null;
  }

  private hexToHue(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(x => x / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return Math.round(h * 255);
  }

  // Recording methods
  startRecording(): void {
    this.lastRecordingData.set(null);
    this.connectionService.startRecording();
  }

  stopRecording(): void {
    this.connectionService.stopRecording();
  }

  saveRecording(): void {
    const data = this.lastRecordingData();
    if (!data) return;

    const name = prompt(this.i18n.t('play.recording.namePrompt')) || `Recording ${new Date().toLocaleString()}`;
    this.libraryService.saveRecording(name, data);
    this.lastRecordingData.set(null);
  }

  discardRecording(): void {
    this.lastRecordingData.set(null);
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Demo mode methods
  toggleSongList(): void {
    this.showSongList.update(v => !v);
  }

  async selectSong(song: Song): Promise<void> {
    this.selectedSong.set(song);
    this.showSongList.set(false);

    // Load the song
    try {
      const data = await this.libraryService.getMidiData(song);
      await this.midiPlayer.loadMidi(data);
    } catch (error) {
      console.error('Failed to load song:', error);
    }
  }

  clearSelectedSong(): void {
    this.midiPlayer.stop();
    this.selectedSong.set(null);
  }

  async playDemo(): Promise<void> {
    if (!this.selectedSong()) return;
    await this.midiPlayer.play();
  }

  pauseDemo(): void {
    this.midiPlayer.pause();
  }

  stopDemo(): void {
    this.midiPlayer.stop();
  }

  seekDemo(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const time = percent * this.midiPlayer.duration();
    this.midiPlayer.seekTo(time);
  }

  onDemoSpeedChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.midiPlayer.setSpeed(parseFloat(input.value));
  }

  getSongTypeIcon(type: 'builtin' | 'imported' | 'recording'): string {
    switch (type) {
      case 'builtin': return '📚';
      case 'imported': return '📁';
      case 'recording': return '🎤';
    }
  }
}
