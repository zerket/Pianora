import { Component, inject, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';

interface RisingNote {
  id: number;
  note: number;
  velocity: number;
  leftPercent: number;
  startTime: number;
}

@Component({
  selector: 'app-piano-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visualizer-container" #container>
      <!-- Piano Keyboard (top) -->
      <div class="keyboard">
        @for (key of keys; track key.note) {
          <div
            class="key"
            [class.black]="key.isBlack"
            [class.active]="isNoteActive(key.note)"
            [style.left.%]="key.position"
            [style.backgroundColor]="isNoteActive(key.note) ? getNoteColor(key.note) : null"
          ></div>
        }
      </div>

      <!-- Separator line -->
      <div class="separator"></div>

      <!-- Falling Notes -->
      <div class="falling-notes">
        @for (note of risingNotes(); track note.id) {
          <div
            class="falling-note"
            [style.left.%]="note.leftPercent"
            [style.backgroundColor]="getNoteColor(note.note)"
            [style.opacity]="0.7 + (note.velocity / 127) * 0.3"
            [style.animationDuration.s]="animationDuration()"
          ></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .visualizer-container {
      position: relative;
      width: 100%;
      height: 300px;
      background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .keyboard {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 70px;
      background: #2a2a2a;
    }

    .key {
      position: absolute;
      top: 0;
      transition: background-color 0.05s;
    }

    .key:not(.black) {
      width: 2.38%;
      height: 100%;
      background: linear-gradient(180deg, #e8e8e8 0%, #f8f8f8 100%);
      border: 1px solid #888;
      border-top: none;
      border-radius: 0 0 4px 4px;
      z-index: 1;
    }

    .key:not(.black).active {
      background: linear-gradient(180deg, #29b6f6 0%, #4fc3f7 100%);
    }

    .key.black {
      width: 1.4%;
      height: 55%;
      background: linear-gradient(180deg, #111 0%, #333 100%);
      border-radius: 0 0 3px 3px;
      z-index: 2;
      box-shadow: 0 3px 5px rgba(0, 0, 0, 0.5);
    }

    .key.black.active {
      background: linear-gradient(180deg, #9c27b0 0%, #e040fb 100%);
    }

    .separator {
      position: absolute;
      top: 70px;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(100, 100, 150, 0.5) 20%,
        rgba(100, 100, 150, 0.8) 50%,
        rgba(100, 100, 150, 0.5) 80%,
        transparent 100%);
      z-index: 10;
    }

    .falling-notes {
      position: absolute;
      top: 73px;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .falling-note {
      position: absolute;
      top: 0;
      width: 12px;
      height: 40px;
      border-radius: 0 0 6px 6px;
      animation: fall linear forwards;
      box-shadow: 0 0 10px currentColor;
    }

    @keyframes fall {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(220px);
        opacity: 0;
      }
    }
  `]
})
export class PianoVisualizerComponent implements OnDestroy {
  connectionService = inject(CONNECTION_SERVICE);

  risingNotes = signal<RisingNote[]>([]);
  animationDuration = signal(2);
  private noteIdCounter = 0;
  private cleanupInterval: any;
  private lastProcessedNoteId = -1;

  // Piano keys (88 keys, A0 to C8)
  keys: { note: number; isBlack: boolean; position: number }[] = [];

  constructor() {
    this.generateKeys();

    // Reactive effect - fires immediately when lastMidiNote changes
    // This ensures we catch every single note, even during fast playing
    effect(() => {
      const lastNote = this.connectionService.lastMidiNote();
      if (lastNote && lastNote.on && lastNote.timestamp !== this.lastProcessedNoteId) {
        this.lastProcessedNoteId = lastNote.timestamp;
        this.addRisingNote(lastNote.note, lastNote.velocity);
      }
    });

    // Cleanup old notes periodically (separate from note detection)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const duration = this.animationDuration() * 1000;
      this.risingNotes.update(notes =>
        notes.filter(n => now - n.startTime < duration)
      );
    }, 100); // Cleanup every 100ms is sufficient
  }

  ngOnDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private generateKeys(): void {
    const whiteKeyWidth = 100 / 52; // 52 white keys
    let whiteKeyIndex = 0;

    for (let note = 21; note <= 108; note++) {
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      if (isBlack) {
        // Black key position based on previous white key
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
    // Position black keys between white keys
    switch (noteInOctave) {
      case 1: return 0.65;  // C#
      case 3: return 0.75;  // D#
      case 6: return 0.6;   // F#
      case 8: return 0.7;   // G#
      case 10: return 0.8;  // A#
      default: return 0.7;
    }
  }

  private addRisingNote(note: number, velocity: number): void {
    const key = this.keys.find(k => k.note === note);
    if (!key) {
      return;
    }

    const newNote: RisingNote = {
      id: this.noteIdCounter++,
      note,
      velocity,
      leftPercent: key.position,
      startTime: Date.now()
    };

    this.risingNotes.update(notes => [...notes, newNote]);
  }

  isNoteActive(note: number): boolean {
    return this.connectionService.activeNotes().has(note);
  }

  getNoteColor(note: number): string {
    // Color based on note position (rainbow across keyboard)
    const hue = ((note - 21) / 88) * 300; // 0-300 degrees (red to violet)
    return `hsl(${hue}, 80%, 60%)`;
  }
}
