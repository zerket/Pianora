#include "led_controller.h"

// Global instance
LedController ledController;

LedController::LedController()
    : _mode(LedMode::FREE_PLAY)
    , _brightness(LED_DEFAULT_BRIGHTNESS)
    , _baseColor(CRGB::White)
    , _targetNoteCount(0)
    , _fadeTime(200)
    , _waveEnabled(false)
    , _waveWidth(3)
    , _waveSpeed(50)
    , _waveColor(CRGB::Blue)
    , _ambientEffect(AmbientEffect::RAINBOW)
    , _ambientSpeed(50)
    , _ambientPhase(0)
    , _splitPoint(60)               // Middle C (C4)
    , _splitLeftColor(CRGB::Red)
    , _splitRightColor(CRGB::Blue)
    , _firstNote(MIDI_NOTE_MIN)
    , _firstLed(0)
    , _lastNote(MIDI_NOTE_MAX)
    , _lastLed(LED_COUNT - 1)
    , _calibrated(false)
    , _lastUpdate(0)
{
    memset(_noteStates, 0, sizeof(_noteStates));
    memset(_noteFade, 0, sizeof(_noteFade));
    memset(_targetNotes, 0, sizeof(_targetNotes));

    // Initialize random hues for each note
    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        _noteHues[i] = random8();
    }
}

void LedController::begin() {
    FastLED.addLeds<LED_TYPE, LED_PIN, LED_COLOR_ORDER>(_leds, LED_COUNT);
    FastLED.setBrightness(_brightness);
    FastLED.clear();
    FastLED.show();
}

void LedController::update() {
    unsigned long now = millis();
    if (now - _lastUpdate < LED_UPDATE_INTERVAL) {
        return;
    }
    _lastUpdate = now;

    switch (_mode) {
        case LedMode::OFF:
            FastLED.clear();
            break;
        case LedMode::FREE_PLAY:
            updateFreePlay();
            break;
        case LedMode::VISUALIZER:
            updateVisualizer();
            break;
        case LedMode::LEARNING:
            updateLearning();
            break;
        case LedMode::DEMO:
            updateDemo();
            break;
        case LedMode::AMBIENT:
            updateAmbient();
            break;
        case LedMode::FALLING_NOTES:
            updateFallingNotes();
            break;
        case LedMode::SPLIT:
            updateSplit();
            break;
        case LedMode::VELOCITY:
            updateVelocity();
            break;
        case LedMode::RANDOM:
            updateRandom();
            break;
    }

    FastLED.show();
}

void LedController::setMode(LedMode mode) {
    _mode = mode;
    FastLED.clear();

    // Reset states when changing mode
    memset(_noteFade, 0, sizeof(_noteFade));
}

void LedController::setBrightness(uint8_t brightness) {
    _brightness = brightness;
    FastLED.setBrightness(brightness);
}

void LedController::setColor(CRGB color) {
    _baseColor = color;
}

void LedController::noteOn(uint8_t note, uint8_t velocity) {
    if (note < MIDI_NOTE_MIN || note > MIDI_NOTE_MAX) return;

    uint8_t index = note - MIDI_NOTE_MIN;
    _noteStates[index] = velocity;
    _noteFade[index] = 255;
}

void LedController::noteOff(uint8_t note) {
    if (note < MIDI_NOTE_MIN || note > MIDI_NOTE_MAX) return;

    uint8_t index = note - MIDI_NOTE_MIN;
    _noteStates[index] = 0;
    // Fade will be applied in update loop
}

void LedController::allNotesOff() {
    memset(_noteStates, 0, sizeof(_noteStates));
}

void LedController::setTargetNotes(const uint8_t* notes, uint8_t count) {
    _targetNoteCount = min(count, (uint8_t)10);
    memcpy(_targetNotes, notes, _targetNoteCount);
}

void LedController::clearTargetNotes() {
    _targetNoteCount = 0;
}

void LedController::setFadeTime(uint16_t ms) {
    _fadeTime = ms;
}

void LedController::setWaveEnabled(bool enabled) {
    _waveEnabled = enabled;
}

void LedController::setWaveWidth(uint8_t width) {
    _waveWidth = width;
}

void LedController::setWaveSpeed(uint8_t speed) {
    _waveSpeed = speed;
}

void LedController::setWaveColor(CRGB color) {
    _waveColor = color;
}

void LedController::setAmbientEffect(AmbientEffect effect) {
    _ambientEffect = effect;
    _ambientPhase = 0;
}

void LedController::setAmbientSpeed(uint8_t speed) {
    _ambientSpeed = speed;
}

void LedController::setSplitPoint(uint8_t note) {
    _splitPoint = constrain(note, MIDI_NOTE_MIN, MIDI_NOTE_MAX);
}

void LedController::setSplitLeftColor(CRGB color) {
    _splitLeftColor = color;
}

void LedController::setSplitRightColor(CRGB color) {
    _splitRightColor = color;
}

void LedController::setCalibration(uint8_t firstNote, uint8_t firstLed,
                                    uint8_t lastNote, uint8_t lastLed) {
    _firstNote = firstNote;
    _firstLed = firstLed;
    _lastNote = lastNote;
    _lastLed = lastLed;
    _calibrated = true;
}

int LedController::noteToLed(uint8_t note) const {
    if (!_calibrated) {
        // Default linear mapping
        return map(note, MIDI_NOTE_MIN, MIDI_NOTE_MAX, 0, LED_COUNT - 1);
    }

    if (note < _firstNote || note > _lastNote) {
        return -1; // Out of range
    }

    // Linear interpolation between calibration points
    return map(note, _firstNote, _lastNote, _firstLed, _lastLed);
}

void LedController::playStartupAnimation() {
    // Rainbow wave animation (left to right, then right to left)
    const int waveWidth = 20;
    const int delayMs = 5;

    // Left to right
    for (int pos = -waveWidth; pos < LED_COUNT + waveWidth; pos++) {
        FastLED.clear();
        for (int i = 0; i < waveWidth; i++) {
            int led = pos + i;
            if (led >= 0 && led < LED_COUNT) {
                uint8_t hue = map(i, 0, waveWidth, 0, 255);
                _leds[led] = CHSV(hue, 255, 255);
            }
        }
        FastLED.show();
        delay(delayMs);
    }

    // Right to left
    for (int pos = LED_COUNT + waveWidth; pos > -waveWidth; pos--) {
        FastLED.clear();
        for (int i = 0; i < waveWidth; i++) {
            int led = pos - i;
            if (led >= 0 && led < LED_COUNT) {
                uint8_t hue = map(i, 0, waveWidth, 0, 255);
                _leds[led] = CHSV(hue, 255, 255);
            }
        }
        FastLED.show();
        delay(delayMs);
    }

    FastLED.clear();
    FastLED.show();
}

void LedController::showStatus(CRGB color, uint8_t flashes) {
    for (uint8_t i = 0; i < flashes; i++) {
        fill_solid(_leds, LED_COUNT, color);
        FastLED.show();
        delay(100);
        FastLED.clear();
        FastLED.show();
        delay(100);
    }
}

// ============================================================================
// Private update methods
// ============================================================================

void LedController::updateFreePlay() {
    FastLED.clear();

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteStates[i] > 0) {
            int led = noteToLed(i + MIDI_NOTE_MIN);
            if (led >= 0 && led < LED_COUNT) {
                // Scale color by velocity
                CRGB color = _baseColor;
                color.nscale8(_noteStates[i] * 2);
                _leds[led] = color;
            }
        }
    }
}

void LedController::updateVisualizer() {
    // Apply fade to all notes
    applyFade();

    FastLED.clear();

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteFade[i] > 0) {
            int led = noteToLed(i + MIDI_NOTE_MIN);
            if (led >= 0 && led < LED_COUNT) {
                CRGB color = _baseColor;
                color.nscale8(_noteFade[i]);
                _leds[led] = color;

                // Apply wave effect if enabled
                if (_waveEnabled && _noteStates[i] > 0) {
                    applyWaveEffect(led);
                }
            }
        }
    }
}

void LedController::updateLearning() {
    FastLED.clear();

    // Show target notes (keys to press)
    for (uint8_t i = 0; i < _targetNoteCount; i++) {
        int led = noteToLed(_targetNotes[i]);
        if (led >= 0 && led < LED_COUNT) {
            _leds[led] = CRGB::Green; // Hint color
        }
    }

    // Show pressed notes
    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteStates[i] > 0) {
            int led = noteToLed(i + MIDI_NOTE_MIN);
            if (led >= 0 && led < LED_COUNT) {
                // Check if this is a target note
                bool isTarget = false;
                for (uint8_t j = 0; j < _targetNoteCount; j++) {
                    if (_targetNotes[j] == i + MIDI_NOTE_MIN) {
                        isTarget = true;
                        break;
                    }
                }

                if (isTarget) {
                    _leds[led] = CRGB::Blue; // Success color
                } else {
                    _leds[led] = CRGB::Red;  // Error color
                }
            }
        }
    }
}

void LedController::updateDemo() {
    // TODO: Implement demo mode (playback from MIDI file)
    // For now, just show ambient
    updateAmbient();
}

void LedController::updateAmbient() {
    _ambientPhase += _ambientSpeed / 10;

    switch (_ambientEffect) {
        case AmbientEffect::STATIC:
            fill_solid(_leds, LED_COUNT, _baseColor);
            break;

        case AmbientEffect::GRADIENT:
            fill_gradient_RGB(_leds, LED_COUNT, CRGB::Red, CRGB::Blue);
            break;

        case AmbientEffect::RAINBOW:
            fill_rainbow(_leds, LED_COUNT, _ambientPhase, 255 / LED_COUNT);
            break;

        case AmbientEffect::PULSE:
            {
                uint8_t brightness = beatsin8(_ambientSpeed, 50, 255);
                fill_solid(_leds, LED_COUNT, _baseColor);
                FastLED.setBrightness(brightness);
            }
            break;

        case AmbientEffect::BREATHING:
            {
                uint8_t breath = beatsin8(_ambientSpeed / 2, 0, 255);
                CRGB color = _baseColor;
                color.nscale8(breath);
                fill_solid(_leds, LED_COUNT, color);
            }
            break;

        case AmbientEffect::WAVE:
            {
                for (int i = 0; i < LED_COUNT; i++) {
                    uint8_t wave = sin8(i * 5 + _ambientPhase);
                    CRGB color = _baseColor;
                    color.nscale8(wave);
                    _leds[i] = color;
                }
            }
            break;
    }
}

void LedController::updateFallingNotes() {
    // TODO: Implement falling notes effect
    // This requires coordination with the app for timing
    FastLED.clear();
}

void LedController::updateSplit() {
    FastLED.clear();

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteStates[i] > 0) {
            uint8_t note = i + MIDI_NOTE_MIN;
            int led = noteToLed(note);

            if (led >= 0 && led < LED_COUNT) {
                // Choose color based on split point
                CRGB color = (note < _splitPoint) ? _splitLeftColor : _splitRightColor;
                // Scale by velocity
                color.nscale8(_noteStates[i] * 2);
                _leds[led] = color;
            }
        }
    }
}

void LedController::updateVelocity() {
    // Apply fade
    applyFade();

    FastLED.clear();

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteFade[i] > 0) {
            int led = noteToLed(i + MIDI_NOTE_MIN);
            if (led >= 0 && led < LED_COUNT) {
                // Map velocity to hue: low velocity = cool colors (blue), high = warm (red)
                uint8_t hue = map(_noteStates[i], 0, 127, 160, 0); // Blue to Red
                CRGB color = CHSV(hue, 255, _noteFade[i]);
                _leds[led] = color;
            }
        }
    }
}

void LedController::updateRandom() {
    // Apply fade
    applyFade();

    FastLED.clear();

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteFade[i] > 0) {
            int led = noteToLed(i + MIDI_NOTE_MIN);
            if (led >= 0 && led < LED_COUNT) {
                // Use stored random hue for this note
                CRGB color = CHSV(_noteHues[i], 255, _noteFade[i]);
                _leds[led] = color;
            }
        }
    }
}

void LedController::applyFade() {
    // Calculate fade step based on fade time and update interval
    uint8_t fadeStep = (_fadeTime > 0)
        ? max(1, 255 * LED_UPDATE_INTERVAL / _fadeTime)
        : 255;

    for (uint8_t i = 0; i < MIDI_NOTE_COUNT; i++) {
        if (_noteStates[i] == 0 && _noteFade[i] > 0) {
            // Note released, apply fade
            if (_noteFade[i] > fadeStep) {
                _noteFade[i] -= fadeStep;
            } else {
                _noteFade[i] = 0;
            }
        } else if (_noteStates[i] > 0) {
            // Note pressed, full brightness
            _noteFade[i] = 255;
        }
    }
}

void LedController::applyWaveEffect(uint8_t centerLed) {
    for (int i = 1; i <= _waveWidth; i++) {
        uint8_t intensity = 255 - (255 * i / _waveWidth);

        // Left side
        int leftLed = centerLed - i;
        if (leftLed >= 0) {
            CRGB color = _waveColor;
            color.nscale8(intensity);
            _leds[leftLed] += color;
        }

        // Right side
        int rightLed = centerLed + i;
        if (rightLed < LED_COUNT) {
            CRGB color = _waveColor;
            color.nscale8(intensity);
            _leds[rightLed] += color;
        }
    }
}
