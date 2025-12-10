#ifndef BLE_MIDI_H
#define BLE_MIDI_H

#include <Arduino.h>
#include "config.h"

#if USE_BLE_MIDI

// Callback types
typedef void (*BleMidiNoteCallback)(uint8_t channel, uint8_t note, uint8_t velocity);
typedef void (*BleMidiControlCallback)(uint8_t channel, uint8_t control, uint8_t value);

class BleMidiHandler {
public:
    BleMidiHandler();

    void begin();
    void update();
    void stop();

    // Connection status
    bool isConnected() const { return _connected; }
    bool isScanning() const { return _scanning; }
    const char* getConnectedDeviceName() const { return _connectedDeviceName; }

    // Scan for BLE MIDI devices
    void startScan();
    void stopScan();

    // Callbacks
    void setNoteOnCallback(BleMidiNoteCallback callback) { _noteOnCallback = callback; }
    void setNoteOffCallback(BleMidiNoteCallback callback) { _noteOffCallback = callback; }
    void setControlChangeCallback(BleMidiControlCallback callback) { _controlChangeCallback = callback; }

    // Send MIDI (for forwarding to RTP MIDI)
    void sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendControlChange(uint8_t channel, uint8_t control, uint8_t value);

private:
    bool _connected;
    bool _scanning;
    char _connectedDeviceName[32];

    // Callbacks
    BleMidiNoteCallback _noteOnCallback;
    BleMidiNoteCallback _noteOffCallback;
    BleMidiControlCallback _controlChangeCallback;

    // Internal handlers (called by static callbacks)
    void handleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity);
    void handleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity);
    void handleControlChange(uint8_t channel, uint8_t control, uint8_t value);

    // Allow static callbacks to access instance
    friend void onBleConnected();
    friend void onBleDisconnected();
    friend void onBleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity, uint16_t timestamp);
    friend void onBleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity, uint16_t timestamp);
    friend void onBleControlChange(uint8_t channel, uint8_t control, uint8_t value, uint16_t timestamp);
};

extern BleMidiHandler bleMidiHandler;

#endif // USE_BLE_MIDI

#endif // BLE_MIDI_H
