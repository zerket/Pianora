#ifndef MIDI_HANDLER_H
#define MIDI_HANDLER_H

#include <Arduino.h>
#include "config.h"

// MIDI message types
#define MIDI_NOTE_OFF       0x80
#define MIDI_NOTE_ON        0x90
#define MIDI_AFTERTOUCH     0xA0
#define MIDI_CONTROL_CHANGE 0xB0
#define MIDI_PROGRAM_CHANGE 0xC0
#define MIDI_CHANNEL_PRESSURE 0xD0
#define MIDI_PITCH_BEND     0xE0

// Callback types
typedef void (*MidiNoteCallback)(uint8_t channel, uint8_t note, uint8_t velocity);
typedef void (*MidiControlCallback)(uint8_t channel, uint8_t control, uint8_t value);

class MidiHandler {
public:
    MidiHandler();

    void begin();
    void update();

    // Connection status
    bool isConnected() const { return _connected; }

    // Callbacks
    void setNoteOnCallback(MidiNoteCallback callback) { _noteOnCallback = callback; }
    void setNoteOffCallback(MidiNoteCallback callback) { _noteOffCallback = callback; }
    void setControlChangeCallback(MidiControlCallback callback) { _controlChangeCallback = callback; }

    // Hotkey detection (two keys pressed simultaneously)
    void setHotkeyCallback(void (*callback)(uint8_t note1, uint8_t note2));
    void setHotkeyNotes(uint8_t note1, uint8_t note2);

    // Statistics
    uint32_t getNotesReceived() const { return _notesReceived; }

private:
    bool _connected;
    uint32_t _notesReceived;
    unsigned long _lastActivity;

    // Callbacks
    MidiNoteCallback _noteOnCallback;
    MidiNoteCallback _noteOffCallback;
    MidiControlCallback _controlChangeCallback;
    void (*_hotkeyCallback)(uint8_t, uint8_t);

    // Hotkey detection
    uint8_t _hotkeyNote1;
    uint8_t _hotkeyNote2;
    uint8_t _pressedNotes[10];
    uint8_t _pressedNoteCount;

    // USB MIDI parsing
    void processUsbMidi();
    void handleMidiMessage(uint8_t status, uint8_t data1, uint8_t data2);

    // Hotkey handling
    void checkHotkeys(uint8_t note, bool pressed);
};

extern MidiHandler midiHandler;

#endif // MIDI_HANDLER_H
