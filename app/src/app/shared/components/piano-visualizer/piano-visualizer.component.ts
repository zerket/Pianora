import { Component, inject, OnDestroy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { MidiNote } from '@core/services/midi-player.service';

@Component({
  selector: 'app-piano-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visualizer-container">
      <!-- Piano Keyboard -->
      <div class="keyboard">
        @for (key of keys; track key.note) {
          <div
            class="key"
            [class.black]="key.isBlack"
            [class.active]="activeNotesSet().has(key.note)"
            [class.expected]="isNoteExpected(key.note)"
            [style.left.%]="key.position"
            [style.background]="activeNoteColors().get(key.note) ?? null"
          ></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .visualizer-container {
      position: relative;
      width: 100%;
      height: 120px;
      background: linear-gradient(180deg, #1a1a2e 0%, #0d0d0d 100%);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .keyboard {
      position: relative;
      flex: 1;
      background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0d0d0d 100%);
      border-top: 3px solid #3a3a3a;
      perspective: 800px;
    }

    .key {
      position: absolute;
      top: 0;
      transition: background-color 0.05s, box-shadow 0.05s, transform 0.03s;
    }

    .key:not(.black) {
      width: 2.38%;
      height: 100%;
      background: linear-gradient(180deg,
        #f8f8f8 0%,
        #ffffff 5%,
        #f5f5f5 50%,
        #e8e8e8 85%,
        #d8d8d8 95%,
        #c0c0c0 100%);
      border-left: 1px solid rgba(255,255,255,0.8);
      border-right: 1px solid #999;
      border-bottom: 6px solid #888;
      border-radius: 0 0 5px 5px;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.3),
        inset 0 -4px 10px rgba(0,0,0,0.15),
        0 4px 6px rgba(0,0,0,0.3),
        0 2px 3px rgba(0,0,0,0.2);
      z-index: 1;
    }

    .key:not(.black).active {
      transform: translateY(3px);
      border-bottom-width: 3px;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.2),
        inset 0 -2px 6px rgba(0,0,0,0.1),
        0 2px 3px rgba(0,0,0,0.2);
    }

    .key:not(.black).expected:not(.active) {
      background: linear-gradient(180deg,
        #ffe57f 0%,
        #ffd700 50%,
        #ffca28 100%);
    }

    .key.black {
      width: 1.5%;
      height: 62%;
      background: linear-gradient(180deg,
        #3a3a3a 0%,
        #2a2a2a 20%,
        #1a1a1a 60%,
        #0a0a0a 90%,
        #000000 100%);
      border-radius: 0 0 4px 4px;
      box-shadow:
        inset 0 0 1px rgba(255,255,255,0.15),
        inset 0 -6px 10px rgba(0,0,0,0.6),
        0 5px 8px rgba(0,0,0,0.7),
        -2px 0 3px rgba(0,0,0,0.3),
        2px 0 3px rgba(0,0,0,0.3);
      z-index: 2;
    }

    .key.black.active {
      transform: translateY(2px);
      box-shadow:
        inset 0 0 1px rgba(255,255,255,0.1),
        inset 0 -3px 6px rgba(0,0,0,0.5),
        0 3px 5px rgba(0,0,0,0.5),
        -1px 0 2px rgba(0,0,0,0.2),
        1px 0 2px rgba(0,0,0,0.2);
    }

    .key.black.expected:not(.active) {
      background: linear-gradient(180deg,
        #ffb300 0%,
        #ffa000 50%,
        #ff8f00 100%);
    }
  `]
})
export class PianoVisualizerComponent implements OnDestroy {
  connectionService = inject(CONNECTION_SERVICE);

  // Inputs for preview mode (MIDI file playback)
  previewNotes = input<MidiNote[]>([]);
  currentTime = input<number>(0);
  expectedNoteNumbers = input<number[]>([]);
  mode = input<'live' | 'preview'>('live');
  trackHands = input<Map<number, 'left' | 'right'>>(new Map());

  // Piano keys (88 keys, A0 to C8)
  keys: { note: number; isBlack: boolean; position: number }[] = [];

  // Active notes for keyboard highlighting (reactive)
  activeNotesSet = computed(() => {
    const currentMode = this.mode();
    if (currentMode === 'preview') {
      const now = this.currentTime();
      const active = new Set<number>();
      for (const n of this.previewNotes()) {
        if (now >= n.time && now <= n.time + n.duration) {
          active.add(n.note);
        }
      }
      return active;
    }
    // Live mode - use connection service
    return this.connectionService.activeNotes();
  });

  // Map of active notes to their colors (for keyboard highlighting)
  activeNoteColors = computed(() => {
    const currentMode = this.mode();
    const colors = new Map<number, string>();

    if (currentMode === 'preview') {
      const now = this.currentTime();
      const hands = this.trackHands();

      for (const n of this.previewNotes()) {
        if (now >= n.time && now <= n.time + n.duration) {
          const hand = hands.get(n.track);
          let color: string;
          if (hand === 'left') {
            color = 'hsl(210, 90%, 55%)'; // Blue
          } else if (hand === 'right') {
            color = 'hsl(30, 90%, 55%)'; // Orange
          } else {
            color = n.note < 60 ? 'hsl(210, 90%, 55%)' : 'hsl(30, 90%, 55%)';
          }
          colors.set(n.note, color);
        }
      }
    } else {
      // Live mode - rainbow colors
      const activeNotes = this.connectionService.activeNotes();
      for (const noteNumber of activeNotes) {
        const hue = ((noteNumber - 21) / 88) * 300;
        colors.set(noteNumber, `hsl(${hue}, 80%, 60%)`);
      }
    }

    return colors;
  });

  constructor() {
    this.generateKeys();
  }

  ngOnDestroy(): void {}

  private generateKeys(): void {
    const whiteKeyWidth = 100 / 52; // 52 white keys
    let whiteKeyIndex = 0;

    for (let note = 21; note <= 108; note++) {
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      if (isBlack) {
        const blackOffset = this.getBlackKeyOffset(noteInOctave);
        this.keys.push({
          note,
          isBlack: true,
          position: (whiteKeyIndex - 1 + blackOffset) * whiteKeyWidth
        });
      } else {
        this.keys.push({
          note,
          isBlack: false,
          position: whiteKeyIndex * whiteKeyWidth
        });
        whiteKeyIndex++;
      }
    }
  }

  private getBlackKeyOffset(noteInOctave: number): number {
    switch (noteInOctave) {
      case 1: return 0.65;  // C#
      case 3: return 0.75;  // D#
      case 6: return 0.6;   // F#
      case 8: return 0.7;   // G#
      case 10: return 0.8;  // A#
      default: return 0.7;
    }
  }

  isNoteExpected(note: number): boolean {
    return this.expectedNoteNumbers().includes(note);
  }
}
