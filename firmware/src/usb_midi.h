#ifndef USB_MIDI_H
#define USB_MIDI_H

#include <Arduino.h>
#include <usb/usb_host.h>
#include "config.h"

// Callback types for MIDI events
typedef void (*MidiNoteCallback)(uint8_t channel, uint8_t note, uint8_t velocity);
typedef void (*MidiControlChangeCallback)(uint8_t channel, uint8_t controller, uint8_t value);
typedef void (*MidiConnectionCallback)(bool connected);

class USBMidiHost {
public:
    USBMidiHost();

    void begin();
    void task();  // Call in loop()

    bool isConnected() const;
    bool isReady() const;

    // Set callbacks
    void setNoteOnCallback(MidiNoteCallback cb);
    void setNoteOffCallback(MidiNoteCallback cb);
    void setControlChangeCallback(MidiControlChangeCallback cb);
    void setConnectionCallback(MidiConnectionCallback cb);

    // Process incoming MIDI data (called from transfer callback)
    void processMidiData(uint8_t* data, size_t length);

    // Handle device events
    void onDeviceConnected(uint8_t address);
    void onDeviceDisconnected();

private:
    usb_host_client_handle_t _clientHandle;
    usb_device_handle_t _deviceHandle;
    usb_transfer_t* _midiIn[MIDI_IN_BUFFERS];
    usb_transfer_t* _midiOut;

    bool _isMidi;
    bool _isReady;
    bool _connected;

    MidiNoteCallback _noteOnCb;
    MidiNoteCallback _noteOffCb;
    MidiControlChangeCallback _controlChangeCb;
    MidiConnectionCallback _connectionCb;

    void checkInterfaceDescriptor(const void* p);
    void prepareEndpoints(const void* p);
    void parseConfigDescriptor(const usb_config_desc_t* config_desc);
};

extern USBMidiHost* usbMidi;

#endif // USB_MIDI_H
