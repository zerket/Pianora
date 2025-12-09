#include "midi_handler.h"
#include "USB.h"
#include "USBMIDI.h"

// Global instance
MidiHandler midiHandler;

// USB MIDI instance
USBMIDI usbMidi;

MidiHandler::MidiHandler()
    : _connected(false)
    , _notesReceived(0)
    , _lastActivity(0)
    , _noteOnCallback(nullptr)
    , _noteOffCallback(nullptr)
    , _controlChangeCallback(nullptr)
    , _hotkeyCallback(nullptr)
    , _hotkeyNote1(0)
    , _hotkeyNote2(0)
    , _pressedNoteCount(0)
{
    memset(_pressedNotes, 0, sizeof(_pressedNotes));
}

void MidiHandler::begin() {
    // Initialize USB
    USB.begin();

    // Initialize USB MIDI
    usbMidi.begin();

    DEBUG_PRINTLN("USB MIDI initialized");
}

void MidiHandler::update() {
    processUsbMidi();

    // Update connection status based on activity
    unsigned long now = millis();
    if (_lastActivity > 0 && now - _lastActivity > 5000) {
        if (_connected) {
            _connected = false;
            DEBUG_PRINTLN("MIDI disconnected (timeout)");
        }
    }
}

void MidiHandler::setHotkeyCallback(void (*callback)(uint8_t, uint8_t)) {
    _hotkeyCallback = callback;
}

void MidiHandler::setHotkeyNotes(uint8_t note1, uint8_t note2) {
    _hotkeyNote1 = note1;
    _hotkeyNote2 = note2;
}

void MidiHandler::processUsbMidi() {
    midiEventPacket_t packet;

    // Read all available MIDI packets
    while (usbMidi.readPacket(&packet)) {
        if (!_connected) {
            _connected = true;
            DEBUG_PRINTLN("MIDI connected");
        }
        _lastActivity = millis();

        // Extract MIDI message from packet
        // USB MIDI packet format: [cable/code, status, data1, data2]
        uint8_t status = packet.byte1;
        uint8_t data1 = packet.byte2;
        uint8_t data2 = packet.byte3;

        handleMidiMessage(status, data1, data2);
    }
}

void MidiHandler::handleMidiMessage(uint8_t status, uint8_t data1, uint8_t data2) {
    uint8_t messageType = status & 0xF0;
    uint8_t channel = status & 0x0F;

    switch (messageType) {
        case MIDI_NOTE_ON:
            if (data2 > 0) {
                // Note On
                _notesReceived++;
                checkHotkeys(data1, true);
                if (_noteOnCallback) {
                    _noteOnCallback(channel, data1, data2);
                }
            } else {
                // Note On with velocity 0 = Note Off
                checkHotkeys(data1, false);
                if (_noteOffCallback) {
                    _noteOffCallback(channel, data1, data2);
                }
            }
            break;

        case MIDI_NOTE_OFF:
            checkHotkeys(data1, false);
            if (_noteOffCallback) {
                _noteOffCallback(channel, data1, data2);
            }
            break;

        case MIDI_CONTROL_CHANGE:
            if (_controlChangeCallback) {
                _controlChangeCallback(channel, data1, data2);
            }
            break;

        // Ignore other message types for now
        default:
            break;
    }
}

void MidiHandler::checkHotkeys(uint8_t note, bool pressed) {
    if (!_hotkeyCallback || _hotkeyNote1 == 0 || _hotkeyNote2 == 0) {
        return;
    }

    if (pressed) {
        // Add note to pressed list
        if (_pressedNoteCount < 10) {
            _pressedNotes[_pressedNoteCount++] = note;
        }

        // Check if hotkey combination is pressed
        bool hasNote1 = false;
        bool hasNote2 = false;

        for (uint8_t i = 0; i < _pressedNoteCount; i++) {
            if (_pressedNotes[i] == _hotkeyNote1) hasNote1 = true;
            if (_pressedNotes[i] == _hotkeyNote2) hasNote2 = true;
        }

        if (hasNote1 && hasNote2) {
            _hotkeyCallback(_hotkeyNote1, _hotkeyNote2);
        }
    } else {
        // Remove note from pressed list
        for (uint8_t i = 0; i < _pressedNoteCount; i++) {
            if (_pressedNotes[i] == note) {
                // Shift remaining notes
                for (uint8_t j = i; j < _pressedNoteCount - 1; j++) {
                    _pressedNotes[j] = _pressedNotes[j + 1];
                }
                _pressedNoteCount--;
                break;
            }
        }
    }
}
