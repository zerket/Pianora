#ifndef MIDI_HANDLER_H
#define MIDI_HANDLER_H

#include <Arduino.h>
#include "config.h"

#if USE_USB_MIDI
#include <usb/usb_host.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#endif

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

#if USE_USB_MIDI
// MIDI message structure for queue
typedef struct {
    uint8_t status;
    uint8_t channel;
    uint8_t data1;
    uint8_t data2;
} MidiMessage;

// USB MIDI buffer configuration
#define MIDI_IN_BUFFERS     8
#define MIDI_OUT_BUFFERS    8
#define MIDI_OUT_QUEUE_SIZE 16
#endif

class MidiHandler {
public:
    MidiHandler();

    void begin();
    void update();
    void stop();

    // Connection status
    bool isConnected() const { return _connected; }
    bool isReady() const { return _ready; }

    // Callbacks
    void setNoteOnCallback(MidiNoteCallback callback) { _noteOnCallback = callback; }
    void setNoteOffCallback(MidiNoteCallback callback) { _noteOffCallback = callback; }
    void setControlChangeCallback(MidiControlCallback callback) { _controlChangeCallback = callback; }

    // Hotkey detection (two keys pressed simultaneously)
    void setHotkeyCallback(void (*callback)(uint8_t note1, uint8_t note2));
    void setHotkeyNotes(uint8_t note1, uint8_t note2);

    // Statistics
    uint32_t getNotesReceived() const { return _notesReceived; }

#if USE_USB_MIDI
    // USB MIDI OUT functions
    void sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendControlChange(uint8_t channel, uint8_t control, uint8_t value);

    // Called by USB transfer callback
    void handleMidiIn(uint8_t *data, size_t length);
    void handleMidiOutComplete();
#endif

private:
    bool _connected;
    bool _ready;
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

    // MIDI message handling
    void handleMidiMessage(uint8_t status, uint8_t data1, uint8_t data2);
    void checkHotkeys(uint8_t note, bool pressed);

#if USE_USB_MIDI
    // USB Host MIDI
    void processUsbMidiOut();
    bool queueMidiMessage(uint8_t status, uint8_t channel, uint8_t data1, uint8_t data2);
#endif
};

extern MidiHandler midiHandler;

#if USE_USB_MIDI
// USB Host handles (defined in midi_handler.cpp)
extern usb_host_client_handle_t Client_Handle;
extern usb_device_handle_t Device_Handle;

// USB MIDI state (defined in midi_handler.cpp)
extern bool isMIDI;
extern bool isMIDIReady;
extern volatile bool midiOutBusy;
extern usb_transfer_t *MIDIOut;
extern usb_transfer_t *MIDIIn[];
extern QueueHandle_t midiOutQueue;

// USB enumeration callback
void show_config_desc_full(const usb_config_desc_t *config_desc);
#endif

#endif // MIDI_HANDLER_H
