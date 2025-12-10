#include "rtp_midi.h"

#if USE_RTP_MIDI

#include <WiFi.h>
#include <AppleMIDI.h>

// Global instance
RtpMidiHandler rtpMidiHandler;

// Create AppleMIDI instance
APPLEMIDI_CREATE_DEFAULTSESSION_INSTANCE();

// Reference to handler for callbacks
static RtpMidiHandler* _instance = nullptr;

RtpMidiHandler::RtpMidiHandler()
    : _connected(false)
    , _sessionCount(0)
    , _noteOnCallback(nullptr)
    , _noteOffCallback(nullptr)
    , _controlChangeCallback(nullptr)
{
    _instance = this;
}

void RtpMidiHandler::begin() {
    DEBUG_PRINTLN("Initializing RTP MIDI (AppleMIDI)...");

    // Start AppleMIDI session
    MIDI.begin(MIDI_CHANNEL_OMNI);

    // Session name for mDNS discovery
    AppleMIDI.setName(RTP_SESSION_NAME);

    // Connection handlers
    AppleMIDI.setHandleConnected([](const APPLEMIDI_NAMESPACE::ssrc_t& ssrc, const char* name) {
        if (_instance) {
            _instance->handleConnected(ssrc, name);
        }
    });

    AppleMIDI.setHandleDisconnected([](const APPLEMIDI_NAMESPACE::ssrc_t& ssrc) {
        if (_instance) {
            _instance->handleDisconnected(ssrc);
        }
    });

    // MIDI message handlers
    MIDI.setHandleNoteOn([](byte channel, byte note, byte velocity) {
        if (_instance) {
            _instance->handleNoteOn(channel, note, velocity);
        }
    });

    MIDI.setHandleNoteOff([](byte channel, byte note, byte velocity) {
        if (_instance) {
            _instance->handleNoteOff(channel, note, velocity);
        }
    });

    MIDI.setHandleControlChange([](byte channel, byte control, byte value) {
        if (_instance) {
            _instance->handleControlChange(channel, control, value);
        }
    });

    DEBUG_PRINTF("RTP MIDI initialized on port %d\n", RTP_MIDI_PORT);
    DEBUG_PRINTF("Session name: %s\n", RTP_SESSION_NAME);
}

void RtpMidiHandler::update() {
    // Read incoming MIDI messages
    MIDI.read();
}

void RtpMidiHandler::stop() {
    _connected = false;
    _sessionCount = 0;
}

void RtpMidiHandler::sendNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    if (_connected) {
        MIDI.sendNoteOn(note, velocity, channel);
    }
}

void RtpMidiHandler::sendNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    if (_connected) {
        MIDI.sendNoteOff(note, velocity, channel);
    }
}

void RtpMidiHandler::sendControlChange(uint8_t channel, uint8_t control, uint8_t value) {
    if (_connected) {
        MIDI.sendControlChange(control, value, channel);
    }
}

void RtpMidiHandler::handleConnected(uint32_t ssrc, const char* name) {
    _sessionCount++;
    _connected = true;
    DEBUG_PRINTF("RTP MIDI connected: %s (ssrc: %u)\n", name, ssrc);
}

void RtpMidiHandler::handleDisconnected(uint32_t ssrc) {
    if (_sessionCount > 0) {
        _sessionCount--;
    }
    if (_sessionCount == 0) {
        _connected = false;
    }
    DEBUG_PRINTF("RTP MIDI disconnected (ssrc: %u)\n", ssrc);
}

void RtpMidiHandler::handleNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("RTP Note ON: ch=%d note=%d vel=%d\n", channel, note, velocity);

    if (velocity == 0) {
        // Note On with velocity 0 = Note Off
        handleNoteOff(channel, note, velocity);
        return;
    }

    if (_noteOnCallback) {
        _noteOnCallback(channel, note, velocity);
    }
}

void RtpMidiHandler::handleNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("RTP Note OFF: ch=%d note=%d\n", channel, note);

    if (_noteOffCallback) {
        _noteOffCallback(channel, note, velocity);
    }
}

void RtpMidiHandler::handleControlChange(uint8_t channel, uint8_t control, uint8_t value) {
    DEBUG_PRINTF("RTP CC: ch=%d ctrl=%d val=%d\n", channel, control, value);

    if (_controlChangeCallback) {
        _controlChangeCallback(channel, control, value);
    }
}

#endif // USE_RTP_MIDI
