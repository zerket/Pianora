#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <Arduino.h>
#include <FastLED.h>
#include "config.h"

class LEDController {
public:
    LEDController();

    void begin();
    void update();  // Call in loop() for animations/fading

    // MIDI event handlers
    void noteOn(uint8_t note, uint8_t velocity);
    void noteOff(uint8_t note);
    void allNotesOff();

    // Mode control
    void setMode(LEDMode mode);
    LEDMode getMode() const;

    // Settings
    void setBrightness(uint8_t brightness);
    uint8_t getBrightness() const;

    void setHue(uint8_t hue);
    uint8_t getHue() const;

    void setSaturation(uint8_t saturation);
    void setFadeRate(uint8_t rate);

    // LED strip direction
    void setReversed(bool reversed);
    bool isReversed() const;

    // Split mode colors
    void setSplitPosition(uint8_t position);  // 0-87 (key index)
    void setLeftColor(uint8_t hue, uint8_t sat, uint8_t val);
    void setRightColor(uint8_t hue, uint8_t sat, uint8_t val);

    // Utility
    void blackout();
    void showColor(CRGB color);
    void playStartupAnimation();  // Rainbow wave on boot
    void setLedDirect(uint16_t index, CRGB color);  // Direct LED access
    int16_t noteToLed(uint8_t note);  // Map MIDI note to LED index

    // Splash mode
    void setSplashEnabled(bool enabled);
    bool isSplashEnabled() const;

    // Hotkey controls
    void adjustBrightness(int16_t delta);  // +/- brightness
    void cycleMode();                       // Cycle through modes
    void toggleEnabled();                   // Toggle LED on/off
    bool isEnabled() const;

    // Learning mode
    void setExpectedNotes(const uint8_t* notes, uint8_t count);
    void clearExpectedNotes();
    void setGuideColor(uint8_t hue, uint8_t sat, uint8_t val);
    void setSuccessColor(uint8_t hue, uint8_t sat, uint8_t val);
    void setErrorColor(uint8_t hue, uint8_t sat, uint8_t val);

    // Background layer
    void setBackgroundEnabled(bool enabled);
    bool isBackgroundEnabled() const;
    void setBackgroundColor(uint8_t hue, uint8_t sat, uint8_t val);
    void setBackgroundBrightness(uint8_t brightness);

    // Hue shift for chords
    void setHueShiftEnabled(bool enabled);
    bool isHueShiftEnabled() const;
    void setHueShiftAmount(uint8_t amount);       // How much to shift hue (default 10)
    void setChordWindowMs(uint16_t windowMs);     // Chord detection window (default 600ms)

    // Ambient animations
    void setAmbientAnimation(uint8_t animation);  // 0=Rainbow, 1=SineWave, 2=Sparkle
    uint8_t getAmbientAnimation() const;
    void setAnimationSpeed(uint8_t speed);        // Animation speed (1-255)
    uint8_t getAnimationSpeed() const;

private:
    bool _enabled;
    CRGB _leds[NUM_LEDS];
    bool _keysOn[NUM_PIANO_KEYS];
    uint8_t _keyVelocity[NUM_PIANO_KEYS];
    uint8_t _keyHue[NUM_PIANO_KEYS];

    LEDMode _mode;
    uint8_t _brightness;
    uint8_t _hue;
    uint8_t _saturation;
    uint8_t _fadeRate;
    bool _reversed;  // LED strip direction

    // Split mode settings
    uint8_t _splitPosition;
    CHSV _leftColor;
    CHSV _rightColor;

    // Random mode - current random hue
    uint8_t _randomHue;

    // Learning mode
    static const uint8_t MAX_EXPECTED_NOTES = 10;
    uint8_t _expectedNotes[MAX_EXPECTED_NOTES];
    uint8_t _expectedCount;
    CHSV _guideColor;    // Color for notes to be pressed (golden)
    CHSV _successColor;  // Color for correctly pressed notes (green)
    CHSV _errorColor;    // Color for wrong notes (red)

    // Background layer
    bool _bgEnabled;
    CHSV _bgColor;
    uint8_t _bgBrightness;

    // Chord detection / Hue shift
    bool _hueShiftEnabled;
    uint8_t _hueShiftAmount;    // How much to shift hue per chord note
    uint16_t _chordWindowMs;    // Time window for chord detection
    unsigned long _lastNoteTime;
    uint8_t _currentChordHue;   // Current shifted hue within chord

    // Splash effect
    struct SplashEffect {
        uint8_t centerKey;      // Key that triggered the splash
        uint8_t width;          // Current splash width (in LEDs)
        uint8_t maxWidth;       // Maximum width based on velocity
        uint8_t brightness;     // Current brightness (fading)
        uint8_t hue;            // Color hue
        bool active;            // Is this splash active
    };
    static const uint8_t MAX_SPLASHES = 16;
    SplashEffect _splashes[MAX_SPLASHES];
    bool _splashEnabled;

    // Timing
    unsigned long _lastFadeTime;
    static const unsigned long FADE_INTERVAL = 20;  // ms

    // Ambient animations
    uint8_t _ambientAnimation;    // 0=Rainbow, 1=SineWave, 2=Sparkle
    uint8_t _animationSpeed;      // Speed 1-255 (higher = faster)
    uint8_t _animationOffset;     // Current animation position/phase

    // Helper methods
    uint8_t mapNoteToKeyIndex(uint8_t midiNote);
    void setKeyLEDs(uint8_t keyIndex, CRGB color);
    CRGB getColorForKey(uint8_t keyIndex, uint8_t velocity);
    void fade();

    // Splash helpers
    void addSplash(uint8_t keyIndex, uint8_t velocity);
    void updateSplash();
    uint8_t velocityToSplashWidth(uint8_t velocity);

    // Ambient animation helpers
    void updateAmbient();
    void animateRainbow();
    void animateSineWave();
    void animateSparkle();
};

extern LEDController* ledController;

#endif // LED_CONTROLLER_H
