import { Component, inject, signal, effect, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';

interface RisingNote {
  id: number;
  note: number;
  velocity: number;
  x: number;
  startTime: number;
}

@Component({
  selector: 'app-piano-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visualizer-container" #container>
      <!-- Rising Notes -->
      <div class="rising-notes">
        @for (note of risingNotes(); track note.id) {
          <div
            class="rising-note"
            [style.left.px]="note.x"
            [style.backgroundColor]="getNoteColor(note.note)"
            [style.opacity]="note.velocity / 127"
            [style.animationDuration.s]="animationDuration()"
          ></div>
        }
      </div>

      <!-- Piano Keyboard -->
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
    </div>
  `,
  styles: [`
    .visualizer-container {
      position: relative;
      width: 100%;
      height: 300px;
      background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .rising-notes {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 80px;
      pointer-events: none;
    }

    .rising-note {
      position: absolute;
      bottom: 0;
      width: 12px;
      height: 40px;
      border-radius: 6px 6px 0 0;
      animation: rise linear forwards;
      box-shadow: 0 0 10px currentColor;
    }

    @keyframes rise {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-220px);
        opacity: 0;
      }
    }

    .keyboard {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: #1a1a1a;
    }

    .key {
      position: absolute;
      bottom: 0;
      transition: background-color 0.05s;
    }

    .key:not(.black) {
      width: 2.38%;
      height: 100%;
      background: linear-gradient(180deg, #f0f0f0 0%, #d0d0d0 100%);
      border: 1px solid #999;
      border-radius: 0 0 4px 4px;
      z-index: 1;
    }

    .key:not(.black).active {
      background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 100%);
    }

    .key.black {
      width: 1.4%;
      height: 60%;
      background: linear-gradient(180deg, #333 0%, #111 100%);
      border-radius: 0 0 3px 3px;
      z-index: 2;
    }

    .key.black.active {
      background: linear-gradient(180deg, #e040fb 0%, #9c27b0 100%);
    }
  `]
})
export class PianoVisualizerComponent implements OnDestroy {
  connectionService = inject(CONNECTION_SERVICE);

  risingNotes = signal<RisingNote[]>([]);
  animationDuration = signal(2);
  private noteIdCounter = 0;
  private cleanupInterval: any;

  // Piano keys (88 keys, A0 to C8)
  keys: { note: number; isBlack: boolean; position: number }[] = [];

  constructor() {
    this.generateKeys();

    // Watch for new MIDI notes
    effect(() => {
      const lastNote = this.connectionService.lastMidiNote();
      if (lastNote && lastNote.on) {
        console.log('[Visualizer] Adding rising note:', lastNote.note, 'vel:', lastNote.velocity);
        this.addRisingNote(lastNote.note, lastNote.velocity);
      }
    });

    // Cleanup old notes periodically
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const duration = this.animationDuration() * 1000;
      this.risingNotes.update(notes =>
        notes.filter(n => now - n.startTime < duration)
      );
    }, 500);
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
    if (!key) return;

    const containerWidth = 100; // percentage
    const x = (key.position / 100) * window.innerWidth * 0.9; // Approximate

    const newNote: RisingNote = {
      id: this.noteIdCounter++,
      note,
      velocity,
      x: key.position * 3.5, // Scale to container
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
