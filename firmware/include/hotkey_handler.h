#ifndef HOTKEY_HANDLER_H
#define HOTKEY_HANDLER_H

#include <Arduino.h>

// Activation notes (both must be pressed) - A0 and B0
#define HOTKEY_A0 21
#define HOTKEY_B0 23

// Mode selection notes (C3-G3)
#define HOTKEY_POINT_MODE    48  // C3 - Точечный режим (один LED на клавишу)
#define HOTKEY_SPLASH_MODE   50  // D3 - Волна (растекающийся свет)
#define HOTKEY_RANDOM_MODE   52  // E3 - Случайные цвета
#define HOTKEY_VELOCITY_MODE 53  // F3 - Цвет зависит от силы нажатия
#define HOTKEY_RAINBOW_MODE  55  // G3 - Радуга (градиент A0-C8)

// Control hotkeys
#define HOTKEY_BRIGHTNESS_DOWN  49  // C#3 - Уменьшить яркость
#define HOTKEY_BRIGHTNESS_UP    51  // D#3 - Увеличить яркость
#define HOTKEY_WAVE_VELOCITY    54  // F#3 - Переключить Wave Velocity on/off
#define HOTKEY_WAVE_WIDTH_DEC   56  // G#3 - Уменьшить ширину волны
#define HOTKEY_WAVE_WIDTH_INC   58  // A#3 - Увеличить ширину волны
#define HOTKEY_TOGGLE_LED       57  // A3 - Включить/выключить LED
#define HOTKEY_PLAY_PAUSE       59  // B3 - Play/pause (режим обучения)

// Color selection notes (C4-B4 for 7 rainbow colors)
#define HOTKEY_COLOR_C4 60  // Red
#define HOTKEY_COLOR_D4 62  // Orange
#define HOTKEY_COLOR_E4 64  // Yellow
#define HOTKEY_COLOR_F4 65  // Green
#define HOTKEY_COLOR_G4 67  // Cyan
#define HOTKEY_COLOR_A4 69  // Blue
#define HOTKEY_COLOR_B4 71  // Violet

// Rainbow hue values (0-255 HSV)
#define HOTKEY_HUE_RED    0
#define HOTKEY_HUE_ORANGE 32
#define HOTKEY_HUE_YELLOW 64
#define HOTKEY_HUE_GREEN  96
#define HOTKEY_HUE_CYAN   128
#define HOTKEY_HUE_BLUE   160
#define HOTKEY_HUE_VIOLET 192

class HotkeyHandler {
public:
    HotkeyHandler();

    // Call on every MIDI note event
    void noteOn(uint8_t note, uint8_t velocity);
    void noteOff(uint8_t note);

    // Check if current note combination triggers a hotkey
    // Returns true if hotkey was activated (caller should suppress normal LED behavior)
    bool checkHotkey();

    // Check if a note is part of activation combo (A1 or B1)
    bool isActivationNote(uint8_t note);

private:
    static const uint8_t MAX_PRESSED = 10;
    static const uint32_t HOLD_TIME_MS = 500;  // Keys must be held for at least 500ms

    uint8_t _pressedNotes[MAX_PRESSED];
    uint32_t _pressedTimes[MAX_PRESSED];
    uint8_t _pressedCount;

    bool isActivationPressed();
    void executeHotkey(uint8_t actionNote);
    uint8_t getHueForNote(uint8_t note);
    void flashConfirmation();
    void flashBrightnessLevel();  // Показать уровень яркости (0-20 диодов)
    void flashWaveWidth();        // Показать ширину волны (1-6 диодов)
};

extern HotkeyHandler* hotkeyHandler;

// Callback for hotkey events that need to be sent to the app
extern void onHotkeyPlayPause();

#endif // HOTKEY_HANDLER_H
