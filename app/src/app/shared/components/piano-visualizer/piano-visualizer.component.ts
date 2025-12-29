import { Component, inject, signal, OnDestroy, effect, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { MidiNote } from '@core/services/midi-player.service';

interface FallingNote {
  id: number;
  note: number;
  velocity: number;
  leftPercent: number;
  width: number;
  startTime: number;
  duration: number;
  endTime: number | null; // null = still held
  isFromMidi: boolean;
  track: number; // Track index for hand detection
}

@Component({
  selector: 'app-piano-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visualizer-container" #container>
      <!-- Falling Notes Area -->
      <div class="falling-notes">
        <!-- Zebra stripes for octave divisions -->
        <div class="octave-stripes">
          @for (stripe of octaveStripes; track stripe.index) {
            <div
              class="octave-stripe"
              [class.odd]="stripe.index % 2 === 1"
              [style.left.%]="stripe.left"
              [style.width.%]="stripe.width"
            ></div>
          }
        </div>

        <!-- Measure separator lines -->
        @for (line of measureLines(); track line.time) {
          <div
            class="measure-line"
            [style.top.px]="line.top"
          ></div>
        }

        <!-- Falling notes -->
        @for (note of displayNotes(); track note.id) {
          <div
            class="falling-note"
            [class.midi-note]="note.isFromMidi"
            [style.left.%]="note.leftPercent"
            [style.width.px]="note.width"
            [style.height.px]="getNoteHeight(note)"
            [style.top.px]="getNoteTop(note)"
            [style.backgroundColor]="getNoteColor(note)"
            [style.opacity]="0.7 + (note.velocity / 127) * 0.3"
          ></div>
        }
      </div>

      <!-- Separator line -->
      <div class="separator"></div>

      <!-- Piano Keyboard (bottom) -->
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
      height: 400px;
      background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .falling-notes {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 100px;
      pointer-events: none;
      overflow: hidden;
    }

    .falling-note {
      position: absolute;
      border-radius: 2px 2px 0 0;
    }

    .falling-note.midi-note {
      border-radius: 0 0 2px 2px;
    }

    .octave-stripes {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .octave-stripe {
      position: absolute;
      top: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.02);
    }

    .octave-stripe.odd {
      background: rgba(255, 255, 255, 0.05);
    }

    .measure-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(100, 100, 100, 0.4);
      z-index: 5;
    }

    .separator {
      position: absolute;
      bottom: 100px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(220, 50, 50, 0.6) 20%,
        rgba(255, 80, 80, 1) 50%,
        rgba(220, 50, 50, 0.6) 80%,
        transparent 100%);
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.6);
      z-index: 10;
    }

    .keyboard {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
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

  // Inputs for preview mode (MIDI file playback) - using signal inputs for reactivity
  previewNotes = input<MidiNote[]>([]);
  currentTime = input<number>(0);
  expectedNoteNumbers = input<number[]>([]);
  lookahead = input<number>(4); // seconds to show ahead
  mode = input<'live' | 'preview'>('live');
  trackHands = input<Map<number, 'left' | 'right'>>(new Map()); // Track to hand mapping
  measureDuration = input<number>(2); // Duration of one measure in seconds (default 2 sec for 120bpm 4/4)

  private _fallingNotes = signal<FallingNote[]>([]);
  private _currentTimestamp = signal(Date.now()); // For triggering re-renders
  private noteIdCounter = 0;
  private cleanupInterval: any;
  private animationFrameId: number | null = null;
  private lastProcessedNoteId = -1;
  private activeNoteIds = new Map<number, number>(); // note -> fallingNote id

  // Piano keys (88 keys, A0 to C8)
  keys: { note: number; isBlack: boolean; position: number }[] = [];

  // Octave stripes for zebra pattern (each octave spans 7 white keys)
  octaveStripes: { index: number; left: number; width: number }[] = [];

  // Combine live notes and preview notes
  displayNotes = computed(() => {
    const currentMode = this.mode();
    if (currentMode === 'preview') {
      // Subscribe to currentTime for reactivity in preview mode
      const _ = this.currentTime();
      return this.previewNotesToFalling();
    }
    // Subscribe to timestamp for reactivity in live mode
    const _ = this._currentTimestamp();
    return this._fallingNotes();
  });

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

  // Measure separator lines for preview mode
  measureLines = computed(() => {
    if (this.mode() !== 'preview') return [];

    const currentTimeVal = this.currentTime();
    const lookaheadVal = this.lookahead();
    const measDuration = this.measureDuration();

    if (measDuration <= 0) return [];

    const containerHeight = 300; // Height of falling notes area
    const pixelsPerSecond = containerHeight / lookaheadVal;

    const lines: { time: number; top: number }[] = [];
    const startMeasure = Math.floor((currentTimeVal - 0.5) / measDuration);
    const endMeasure = Math.ceil((currentTimeVal + lookaheadVal) / measDuration);

    for (let m = startMeasure; m <= endMeasure; m++) {
      if (m < 0) continue;
      const measureTime = m * measDuration;
      if (measureTime >= currentTimeVal - 0.5 && measureTime <= currentTimeVal + lookaheadVal) {
        // Use same formula as notes: line is at separator when measureTime == currentTime
        const timeUntilMeasure = measureTime - currentTimeVal;
        const top = containerHeight - (timeUntilMeasure * pixelsPerSecond);
        lines.push({ time: measureTime, top });
      }
    }
    return lines;
  });

  constructor() {
    this.generateKeys();
    this.generateOctaveStripes();

    // Reactive effect - fires when lastMidiNote changes (note on events)
    effect(() => {
      if (this.mode() !== 'live') return;

      const lastNote = this.connectionService.lastMidiNote();
      if (lastNote && lastNote.on && lastNote.timestamp !== this.lastProcessedNoteId) {
        this.lastProcessedNoteId = lastNote.timestamp;
        // Note on - create new falling note
        this.addFallingNote(lastNote.note, lastNote.velocity);
        // Start animation loop when first note is pressed
        this.startAnimationLoop();
      }
    });

    // Reactive effect - watch activeNotes to detect note releases
    effect(() => {
      if (this.mode() !== 'live') return;

      const activeNotes = this.connectionService.activeNotes();
      const now = Date.now();

      // Finalize any notes that are no longer active
      this._fallingNotes.update(notes => {
        let changed = false;
        const updated = notes.map(n => {
          // If note was held but is no longer in activeNotes, finalize it
          if (n.endTime === null && !activeNotes.has(n.note)) {
            changed = true;
            return {
              ...n,
              endTime: now,
              duration: (now - n.startTime) / 1000
            };
          }
          return n;
        });
        return changed ? updated : notes;
      });
    });

    // Cleanup old notes periodically (for live mode)
    this.cleanupInterval = setInterval(() => {
      if (this.mode() !== 'live') return;

      const now = Date.now();
      const animationTime = 2500; // 2.5 seconds for note to travel off screen
      this._fallingNotes.update(notes => {
        const filtered = notes.filter(n => {
          // Keep notes that are still held
          if (n.endTime === null) return true;
          // Keep notes that haven't finished animating after release
          return now - n.endTime < animationTime;
        });

        // Stop animation loop when no notes left
        if (filtered.length === 0) {
          this.stopAnimationLoop();
        }

        return filtered;
      });
    }, 200);
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this._currentTimestamp.set(Date.now());
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

  ngOnDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.stopAnimationLoop();
  }

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

  private generateOctaveStripes(): void {
    const whiteKeyWidth = 100 / 52; // 52 white keys
    // Piano starts at A0 (MIDI 21)
    // A0, B0 = 2 white keys (partial octave)
    // Then full octaves C1-B1, C2-B2, ..., C7-B7 (7 octaves * 7 white keys = 49)
    // C8 = 1 white key

    // First partial octave: A0, B0 (2 white keys)
    this.octaveStripes.push({
      index: 0,
      left: 0,
      width: 2 * whiteKeyWidth
    });

    // Full octaves 1-7 (C1 to B7)
    let currentLeft = 2 * whiteKeyWidth;
    for (let octave = 1; octave <= 7; octave++) {
      this.octaveStripes.push({
        index: octave,
        left: currentLeft,
        width: 7 * whiteKeyWidth
      });
      currentLeft += 7 * whiteKeyWidth;
    }

    // Last partial octave: C8 (1 white key)
    this.octaveStripes.push({
      index: 8,
      left: currentLeft,
      width: 1 * whiteKeyWidth
    });
  }

  private addFallingNote(note: number, velocity: number): void {
    const key = this.keys.find(k => k.note === note);
    if (!key) return;

    const noteId = this.noteIdCounter++;
    const newNote: FallingNote = {
      id: noteId,
      note,
      velocity,
      leftPercent: key.position,
      width: key.isBlack ? 14 : 24,
      startTime: Date.now(),
      duration: 0,
      endTime: null, // Will be set when note is released
      isFromMidi: false,
      track: 0 // Live notes don't have track info
    };

    this.activeNoteIds.set(note, noteId);
    this._fallingNotes.update(notes => [...notes, newNote]);
  }


  // Constants for preview mode rendering
  private readonly CONTAINER_HEIGHT = 300; // Height of falling notes area in pixels

  private getPixelsPerSecond(): number {
    return this.CONTAINER_HEIGHT / this.lookahead();
  }

  private previewNotesToFalling(): FallingNote[] {
    const notes = this.previewNotes();
    const currentTimeVal = this.currentTime();
    const lookaheadVal = this.lookahead();

    if (!notes.length) return [];

    const pixelsPerSecond = this.getPixelsPerSecond();

    // Filter: show notes that are at least partially visible
    // Visible if: note hasn't completely passed AND note has started to appear
    // Note bottom is at separator when note.time == currentTime
    // Note top = note bottom - height
    // Visible when: top < containerHeight AND bottom > 0
    return notes
      .filter(n => {
        const noteEndTime = n.time + n.duration;
        // Note is visible if it hasn't completely passed below and hasn't completely passed above
        // Note passes below when: bottom > containerHeight → timeUntilNote < -duration
        // Note passes above when: top < 0 → timeUntilNote > lookahead + (height/pixelsPerSecond)
        return noteEndTime > currentTimeVal - 0.5 && n.time < currentTimeVal + lookaheadVal;
      })
      .map(n => {
        const key = this.keys.find(k => k.note === n.note);
        if (!key) return null;

        return {
          id: n.time * 1000 + n.note,
          note: n.note,
          velocity: n.velocity,
          leftPercent: key.position,
          width: key.isBlack ? 14 : 24,
          startTime: n.time, // Store in seconds for easier calculations
          duration: n.duration,
          endTime: n.time + n.duration,
          isFromMidi: true,
          track: n.track
        } as FallingNote;
      })
      .filter((n): n is FallingNote => n !== null);
  }

  /**
   * Calculate the top position of a falling note.
   *
   * Preview mode logic:
   * - Notes fall from top (y=0) to bottom (y=containerHeight)
   * - When note.time == currentTime, the BOTTOM of the note touches the separator
   * - Formula: bottomY = containerHeight - (timeUntilNote * pixelsPerSecond)
   *            topY = bottomY - height
   */
  getNoteTop(note: FallingNote): number {
    if (!note.isFromMidi) {
      // Live mode - use reactive timestamp
      const now = this._currentTimestamp();
      const height = this.getNoteHeight(note);
      const pixelsPerSecond = 100; // Fixed speed for live mode

      if (note.endTime === null) {
        // Note is still held - bottom of note is at the separator
        return this.CONTAINER_HEIGHT - height;
      } else {
        // Note released - moves upward from release position
        const timeSinceRelease = (now - note.endTime) / 1000;
        const releasePosition = this.CONTAINER_HEIGHT - height;
        return releasePosition - (timeSinceRelease * pixelsPerSecond);
      }
    }

    // Preview mode - position based on time
    const currentTimeVal = this.currentTime();
    const pixelsPerSecond = this.getPixelsPerSecond();
    const height = this.getNoteHeight(note);

    // timeUntilNote: positive = note is in the future, negative = note has passed
    const timeUntilNote = note.startTime - currentTimeVal;

    // bottomY: where the bottom of the note should be
    // When timeUntilNote = 0, bottomY = containerHeight (at separator)
    // When timeUntilNote = lookahead, bottomY = 0 (at top)
    const bottomY = this.CONTAINER_HEIGHT - (timeUntilNote * pixelsPerSecond);

    // topY = bottomY - height
    return bottomY - height;
  }

  /**
   * Calculate the height of a falling note based on its duration.
   */
  getNoteHeight(note: FallingNote): number {
    if (!note.isFromMidi) {
      // Live mode - height based on how long the note is held
      const now = this._currentTimestamp();
      const pixelsPerSecond = 100; // Fixed speed for live mode
      let durationMs: number;

      if (note.endTime === null) {
        // Still held - grow from startTime to now
        durationMs = now - note.startTime;
      } else {
        // Released - use fixed duration
        durationMs = note.endTime - note.startTime;
      }

      const durationSec = durationMs / 1000;
      return Math.min(Math.max(8, durationSec * pixelsPerSecond), this.CONTAINER_HEIGHT);
    }

    // Preview mode - height based on duration (using consistent pixelsPerSecond)
    const pixelsPerSecond = this.getPixelsPerSecond();
    return Math.max(8, note.duration * pixelsPerSecond);
  }

  isNoteActive(note: number): boolean {
    if (this.mode() === 'preview') {
      // In preview mode, check if note is currently playing
      const now = this.currentTime();
      return this.previewNotes().some(
        n => n.note === note && now >= n.time && now <= n.time + n.duration
      );
    }
    return this.connectionService.activeNotes().has(note);
  }

  isNoteExpected(note: number): boolean {
    return this.expectedNoteNumbers().includes(note);
  }

  getNoteColor(note: FallingNote | number): string {
    // If it's just a number (keyboard key), use rainbow for live mode
    if (typeof note === 'number') {
      const hue = ((note - 21) / 88) * 300; // 0-300 degrees (red to violet)
      return `hsl(${hue}, 80%, 60%)`;
    }

    // For falling notes in preview mode, use hand-based coloring
    if (note.isFromMidi) {
      const hands = this.trackHands();
      const hand = hands.get(note.track);

      // Blue for left hand, orange for right hand
      if (hand === 'left') {
        return 'hsl(210, 90%, 55%)'; // Blue
      } else if (hand === 'right') {
        return 'hsl(30, 90%, 55%)'; // Orange
      }

      // Fallback: determine by note pitch if track info unavailable
      return note.note < 60
        ? 'hsl(210, 90%, 55%)' // Blue for lower notes
        : 'hsl(30, 90%, 55%)'; // Orange for higher notes
    }

    // Live mode - rainbow
    const hue = ((note.note - 21) / 88) * 300;
    return `hsl(${hue}, 80%, 60%)`;
  }

  // Helper method for keyboard keys (always uses rainbow or hand colors based on active notes)
  getKeyColor(noteNumber: number): string | null {
    if (this.mode() === 'preview') {
      // In preview mode, check if note is currently playing and get its color
      const currentTimeVal = this.currentTime();
      const activeNote = this.previewNotes().find(
        n => n.note === noteNumber && currentTimeVal >= n.time && currentTimeVal <= n.time + n.duration
      );
      if (activeNote) {
        const hands = this.trackHands();
        const hand = hands.get(activeNote.track);
        if (hand === 'left') return 'hsl(210, 90%, 55%)';
        if (hand === 'right') return 'hsl(30, 90%, 55%)';
        return activeNote.note < 60 ? 'hsl(210, 90%, 55%)' : 'hsl(30, 90%, 55%)';
      }
      return null;
    }
    // Live mode - rainbow
    const hue = ((noteNumber - 21) / 88) * 300;
    return `hsl(${hue}, 80%, 60%)`;
  }
}
