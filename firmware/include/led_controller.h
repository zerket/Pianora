#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <FastLED.h>
#include "config.h"

// LED effect modes
enum class LedMode {
    OFF,
    FREE_PLAY,          // Simple on/off with pressed keys
    VISUALIZER,         // Effects, waves, fade
    LEARNING,           // Highlight keys to press
    DEMO,               // Auto playback visualization
    AMBIENT,            // Decorative effects
    FALLING_NOTES       // Notes falling down the strip
};

// Ambient effect types
enum class AmbientEffect {
    STATIC,
    GRADIENT,
    RAINBOW,
    PULSE,
    BREATHING,
    WAVE
};

class LedController {
public:
    LedController();

    void begin();
    void update();

    // Mode control
    void setMode(LedMode mode);
    LedMode getMode() const { return _mode; }

    // Basic controls
    void setBrightness(uint8_t brightness);
    uint8_t getBrightness() const { return _brightness; }
    void setColor(CRGB color);
    CRGB getColor() const { return _baseColor; }

    // Note control (called from MIDI handler)
    void noteOn(uint8_t note, uint8_t velocity);
    void noteOff(uint8_t note);
    void allNotesOff();

    // Learning mode
    void setTargetNotes(const uint8_t* notes, uint8_t count);
    void clearTargetNotes();

    // Visualizer settings
    void setFadeTime(uint16_t ms);
    void setWaveEnabled(bool enabled);
    void setWaveWidth(uint8_t width);
    void setWaveSpeed(uint8_t speed);
    void setWaveColor(CRGB color);

    // Ambient mode
    void setAmbientEffect(AmbientEffect effect);
    void setAmbientSpeed(uint8_t speed);

    // Calibration
    void setCalibration(uint8_t firstNote, uint8_t firstLed, uint8_t lastNote, uint8_t lastLed);
    int noteToLed(uint8_t note) const;

    // Startup animation
    void playStartupAnimation();

    // Status indication
    void showStatus(CRGB color, uint8_t flashes = 1);

private:
    CRGB _leds[LED_COUNT];
    LedMode _mode;
    uint8_t _brightness;
    CRGB _baseColor;

    // Note states
    uint8_t _noteStates[MIDI_NOTE_COUNT];       // Velocity for each note
    uint8_t _noteFade[MIDI_NOTE_COUNT];         // Fade level for each note

    // Learning mode
    uint8_t _targetNotes[10];                    // Max 10 simultaneous target notes
    uint8_t _targetNoteCount;

    // Visualizer settings
    uint16_t _fadeTime;
    bool _waveEnabled;
    uint8_t _waveWidth;
    uint8_t _waveSpeed;
    CRGB _waveColor;

    // Ambient settings
    AmbientEffect _ambientEffect;
    uint8_t _ambientSpeed;
    uint8_t _ambientPhase;

    // Calibration
    uint8_t _firstNote;
    uint8_t _firstLed;
    uint8_t _lastNote;
    uint8_t _lastLed;
    bool _calibrated;

    // Timing
    unsigned long _lastUpdate;

    // Private methods
    void updateFreePlay();
    void updateVisualizer();
    void updateLearning();
    void updateDemo();
    void updateAmbient();
    void updateFallingNotes();

    void applyFade();
    void applyWaveEffect(uint8_t centerLed);
};

extern LedController ledController;

#endif // LED_CONTROLLER_H
