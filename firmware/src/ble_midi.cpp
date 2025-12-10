#include "ble_midi.h"

#if USE_BLE_MIDI

#include <BLEMidi.h>

// Global instance
BleMidiHandler bleMidiHandler;

// Static callbacks for BLE MIDI library
void onBleConnected() {
    DEBUG_PRINTLN("BLE MIDI connected");
    bleMidiHandler._connected = true;
}

void onBleDisconnected() {
    DEBUG_PRINTLN("BLE MIDI disconnected");
    bleMidiHandler._connected = false;
    bleMidiHandler._connectedDeviceName[0] = '\0';
}

void onBleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity, uint16_t timestamp) {
    bleMidiHandler.handleNoteOn(channel, note, velocity);
}

void onBleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity, uint16_t timestamp) {
    bleMidiHandler.handleNoteOff(channel, note, velocity);
}

void onBleControlChange(uint8_t channel, uint8_t control, uint8_t value, uint16_t timestamp) {
    bleMidiHandler.handleControlChange(channel, control, value);
}

BleMidiHandler::BleMidiHandler()
    : _connected(false)
    , _scanning(false)
    , _noteOnCallback(nullptr)
    , _noteOffCallback(nullptr)
    , _controlChangeCallback(nullptr)
{
    _connectedDeviceName[0] = '\0';
}

void BleMidiHandler::begin() {
    DEBUG_PRINTLN("Initializing BLE MIDI...");

    // Initialize BLE MIDI as client (to connect to BLE MIDI devices like keyboards)
    BLEMidiClient.begin(BLE_DEVICE_NAME);

    // Set callbacks
    BLEMidiClient.setOnConnectCallback(onBleConnected);
    BLEMidiClient.setOnDisconnectCallback(onBleDisconnected);
    BLEMidiClient.setNoteOnCallback(onBleNoteOn);
    BLEMidiClient.setNoteOffCallback(onBleNoteOff);
    BLEMidiClient.setControlChangeCallback(onBleControlChange);

    DEBUG_PRINTLN("BLE MIDI initialized");
}

void BleMidiHandler::update() {
    // BLE MIDI library handles updates internally via FreeRTOS tasks
    // No explicit update needed
}

void BleMidiHandler::stop() {
    // Disconnect if connected
    if (_connected) {
        // BLE MIDI library doesn't have explicit disconnect, but we can stop scanning
        _connected = false;
    }
    _scanning = false;
}

void BleMidiHandler::startScan() {
    if (_scanning) return;

    DEBUG_PRINTLN("Starting BLE MIDI scan...");
    _scanning = true;

    // Scan for BLE MIDI devices and connect to first one found
    if (BLEMidiClient.scan()) {
        DEBUG_PRINTLN("BLE MIDI device found, connecting...");
        if (BLEMidiClient.connect()) {
            DEBUG_PRINTLN("Connected to BLE MIDI device");
            // Get device name if available
            strncpy(_connectedDeviceName, "BLE MIDI Device", sizeof(_connectedDeviceName) - 1);
        } else {
            DEBUG_PRINTLN("Failed to connect to BLE MIDI device");
        }
    } else {
        DEBUG_PRINTLN("No BLE MIDI devices found");
    }

    _scanning = false;
}

void BleMidiHandler::stopScan() {
    _scanning = false;
}

void BleMidiHandler::sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    if (_connected) {
        BLEMidiClient.noteOn(channel, note, velocity);
    }
}

void BleMidiHandler::sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    if (_connected) {
        BLEMidiClient.noteOff(channel, note, velocity);
    }
}

void BleMidiHandler::sendControlChange(uint8_t channel, uint8_t control, uint8_t value) {
    if (_connected) {
        BLEMidiClient.controlChange(channel, control, value);
    }
}

void BleMidiHandler::handleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("BLE Note ON: ch=%d note=%d vel=%d\n", channel, note, velocity);

    if (_noteOnCallback) {
        _noteOnCallback(channel, note, velocity);
    }
}

void BleMidiHandler::handleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("BLE Note OFF: ch=%d note=%d\n", channel, note);

    if (_noteOffCallback) {
        _noteOffCallback(channel, note, velocity);
    }
}

void BleMidiHandler::handleControlChange(uint8_t channel, uint8_t control, uint8_t value) {
    DEBUG_PRINTF("BLE CC: ch=%d ctrl=%d val=%d\n", channel, control, value);

    if (_controlChangeCallback) {
        _controlChangeCallback(channel, control, value);
    }
}

#endif // USE_BLE_MIDI
