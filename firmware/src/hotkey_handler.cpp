#include "hotkey_handler.h"
#include "led_controller.h"

// Global pointer - initialized in setup() to avoid static initialization issues
HotkeyHandler* hotkeyHandler = nullptr;

HotkeyHandler::HotkeyHandler() : _pressedCount(0) {
    memset(_pressedNotes, 0, sizeof(_pressedNotes));
    memset(_pressedTimes, 0, sizeof(_pressedTimes));
}

void HotkeyHandler::noteOn(uint8_t note, uint8_t velocity) {
    // Check if already in list
    for (uint8_t i = 0; i < _pressedCount; i++) {
        if (_pressedNotes[i] == note) {
            return;  // Already pressed
        }
    }

    // Add to pressed list
    if (_pressedCount < MAX_PRESSED) {
        _pressedNotes[_pressedCount] = note;
        _pressedTimes[_pressedCount] = millis();
        _pressedCount++;
    }
}

void HotkeyHandler::noteOff(uint8_t note) {
    // Remove from pressed list
    for (uint8_t i = 0; i < _pressedCount; i++) {
        if (_pressedNotes[i] == note) {
            // Shift remaining notes
            for (uint8_t j = i; j < _pressedCount - 1; j++) {
                _pressedNotes[j] = _pressedNotes[j + 1];
                _pressedTimes[j] = _pressedTimes[j + 1];
            }
            _pressedCount--;
            break;
        }
    }
}

bool HotkeyHandler::isActivationNote(uint8_t note) {
    return (note == HOTKEY_A0 || note == HOTKEY_B0);
}

bool HotkeyHandler::isActivationPressed() {
    bool hasA0 = false, hasB0 = false;
    uint32_t now = millis();

    for (uint8_t i = 0; i < _pressedCount; i++) {
        // Check if key has been held long enough
        if (now - _pressedTimes[i] >= HOLD_TIME_MS) {
            if (_pressedNotes[i] == HOTKEY_A0) hasA0 = true;
            if (_pressedNotes[i] == HOTKEY_B0) hasB0 = true;
        }
    }

    return hasA0 && hasB0;
}

bool HotkeyHandler::checkHotkey() {
    if (!isActivationPressed()) return false;

    // Look for action key (any key that's not A0 or B0)
    for (uint8_t i = 0; i < _pressedCount; i++) {
        uint8_t note = _pressedNotes[i];

        if (note != HOTKEY_A0 && note != HOTKEY_B0) {
            executeHotkey(note);
            return true;
        }
    }
    return false;
}

uint8_t HotkeyHandler::getHueForNote(uint8_t note) {
    switch (note) {
        case HOTKEY_COLOR_C4: return HOTKEY_HUE_RED;
        case HOTKEY_COLOR_D4: return HOTKEY_HUE_ORANGE;
        case HOTKEY_COLOR_E4: return HOTKEY_HUE_YELLOW;
        case HOTKEY_COLOR_F4: return HOTKEY_HUE_GREEN;
        case HOTKEY_COLOR_G4: return HOTKEY_HUE_CYAN;
        case HOTKEY_COLOR_A4: return HOTKEY_HUE_BLUE;
        case HOTKEY_COLOR_B4: return HOTKEY_HUE_VIOLET;
        default: return 255;  // Invalid
    }
}

void HotkeyHandler::flashConfirmation() {
    // Flash first 5 LEDs green at 30% brightness (less harsh on eyes)
    ledController->blackout();
    for (int i = 0; i < 5; i++) {
        ledController->setLedDirect(i, CHSV(96, 255, 76));  // Green, 30% brightness
    }
    FastLED.show();
    delay(150);
    ledController->blackout();
}

void HotkeyHandler::flashBrightnessLevel() {
    // Показать уровень яркости количеством диодов (0-20)
    // 100% = 20 диодов, 5% = 1 диод, 0% = 0 диодов
    uint8_t brightness = ledController->getBrightness();

    // Вычисляем количество диодов: brightness / 255 * 20
    uint8_t ledCount = (brightness * 20 + 127) / 255;  // Округление
    if (brightness > 0 && ledCount == 0) ledCount = 1;  // Минимум 1 диод если яркость > 0

    ledController->blackout();
    for (uint8_t i = 0; i < ledCount; i++) {
        ledController->setLedDirect(i, CHSV(96, 255, 76));  // Зелёный, 30% яркости
    }
    FastLED.show();
    delay(200);
    ledController->blackout();
}

void HotkeyHandler::flashWaveWidth() {
    // Показать ширину волны количеством диодов (1-6)
    uint8_t width = ledController->getWaveStaticWidth();

    ledController->blackout();
    for (uint8_t i = 0; i < width; i++) {
        ledController->setLedDirect(i, CHSV(160, 255, 76));  // Голубой, 30% яркости
    }
    FastLED.show();
    delay(200);
    ledController->blackout();
}

void HotkeyHandler::executeHotkey(uint8_t actionNote) {
    switch (actionNote) {
        case HOTKEY_POINT_MODE:
            // Point mode: disable splash
            ledController->setMode(MODE_FREE_PLAY);
            ledController->setSplashEnabled(false);
            flashConfirmation();
            break;

        case HOTKEY_SPLASH_MODE:
            // Splash mode: enable splash effect
            ledController->setMode(MODE_FREE_PLAY);
            ledController->setSplashEnabled(true);
            flashConfirmation();
            break;

        case HOTKEY_BRIGHTNESS_UP:
            // Увеличить яркость на 5% (13 из 255)
            ledController->adjustBrightness(13);
            flashBrightnessLevel();
            break;

        case HOTKEY_BRIGHTNESS_DOWN:
            // Уменьшить яркость на 5% (13 из 255)
            ledController->adjustBrightness(-13);
            flashBrightnessLevel();
            break;

        case HOTKEY_RANDOM_MODE:
            // Режим случайных цветов
            ledController->setMode(MODE_RANDOM);
            ledController->setSplashEnabled(false);
            flashConfirmation();
            break;

        case HOTKEY_VELOCITY_MODE:
            // Режим velocity - цвет зависит от силы нажатия
            ledController->setMode(MODE_VELOCITY);
            ledController->setSplashEnabled(false);
            flashConfirmation();
            break;

        case HOTKEY_RAINBOW_MODE:
            // Режим радуга - градиент от A0 до C8
            ledController->setMode(MODE_VISUALIZER);
            ledController->setSplashEnabled(false);
            flashConfirmation();
            break;

        case HOTKEY_WAVE_VELOCITY:
            // Переключить Wave Velocity режим
            ledController->setWaveVelocityMode(!ledController->isWaveVelocityMode());
            flashConfirmation();
            break;

        case HOTKEY_WAVE_WIDTH_DEC:
            // Уменьшить ширину волны
            ledController->adjustWaveWidth(-1);
            flashWaveWidth();
            break;

        case HOTKEY_WAVE_WIDTH_INC:
            // Увеличить ширину волны
            ledController->adjustWaveWidth(1);
            flashWaveWidth();
            break;

        case HOTKEY_TOGGLE_LED:
            // Toggle LED on/off
            ledController->toggleEnabled();
            if (ledController->isEnabled()) {
                flashConfirmation();
            }
            break;

        case HOTKEY_PLAY_PAUSE:
            // Play/pause - notify app via WebSocket
            onHotkeyPlayPause();
            flashConfirmation();
            break;

        case HOTKEY_COLOR_C4:
        case HOTKEY_COLOR_D4:
        case HOTKEY_COLOR_E4:
        case HOTKEY_COLOR_F4:
        case HOTKEY_COLOR_G4:
        case HOTKEY_COLOR_A4:
        case HOTKEY_COLOR_B4:
            // Color change - show on first 5 LEDs only
            {
                uint8_t hue = getHueForNote(actionNote);
                if (hue != 255) {
                    ledController->setHue(hue);
                    // Show the new color on first 5 LEDs at 30% brightness
                    ledController->blackout();
                    for (int i = 0; i < 5; i++) {
                        ledController->setLedDirect(i, CHSV(hue, 255, 76));
                    }
                    FastLED.show();
                    delay(150);
                    ledController->blackout();
                }
            }
            break;

        default:
            // Unknown action key - ignore
            break;
    }
}
