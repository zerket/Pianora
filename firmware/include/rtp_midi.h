#ifndef RTP_MIDI_H
#define RTP_MIDI_H

#include <Arduino.h>
#include "config.h"

#if USE_RTP_MIDI

// Callback types
typedef void (*RtpMidiNoteCallback)(uint8_t channel, uint8_t note, uint8_t velocity);
typedef void (*RtpMidiControlCallback)(uint8_t channel, uint8_t control, uint8_t value);

class RtpMidiHandler {
public:
    RtpMidiHandler();

    void begin();
    void update();
    void stop();

    // Connection status
    bool isConnected() const { return _connected; }
    uint8_t getSessionCount() const { return _sessionCount; }

    // Callbacks
    void setNoteOnCallback(RtpMidiNoteCallback callback) { _noteOnCallback = callback; }
    void setNoteOffCallback(RtpMidiNoteCallback callback) { _noteOffCallback = callback; }
    void setControlChangeCallback(RtpMidiControlCallback callback) { _controlChangeCallback = callback; }

    // Send MIDI (for forwarding from other sources)
    void sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity);
    void sendControlChange(uint8_t channel, uint8_t control, uint8_t value);

private:
    bool _connected;
    uint8_t _sessionCount;

    // Callbacks
    RtpMidiNoteCallback _noteOnCallback;
    RtpMidiNoteCallback _noteOffCallback;
    RtpMidiControlCallback _controlChangeCallback;

    // Internal handlers
    void handleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity);
    void handleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity);
    void handleControlChange(uint8_t channel, uint8_t control, uint8_t value);
    void handleConnected(uint32_t ssrc, const char* name);
    void handleDisconnected(uint32_t ssrc);
};

extern RtpMidiHandler rtpMidiHandler;

#endif // USE_RTP_MIDI

#endif // RTP_MIDI_H
