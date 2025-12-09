#ifndef SETTINGS_MANAGER_H
#define SETTINGS_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include "config.h"

// Settings structure
struct Settings {
    // LED settings
    uint8_t ledBrightness;
    uint8_t ledColor[3];        // RGB
    uint8_t ledCount;
    bool ledReversed;           // Direction of the strip

    // Visualizer settings
    uint16_t fadeTimeMs;
    bool waveEnabled;
    uint8_t waveWidth;
    uint8_t waveSpeed;
    uint8_t waveColor[3];       // RGB
    bool gradientEnabled;

    // Learning settings
    uint8_t hintColor[3];       // RGB
    uint8_t successColor[3];    // RGB
    uint8_t errorColor[3];      // RGB
    uint8_t lookAheadNotes;
    bool splitHandColors;

    // WiFi settings
    uint8_t wifiMode;           // 0=AP, 1=Station, 2=Both
    char staSsid[32];
    char staPassword[64];
    char apSsid[32];
    char apPassword[64];
    char hostname[32];

    // Calibration
    uint8_t firstMidiNote;
    uint8_t firstLedIndex;
    uint8_t lastMidiNote;
    uint8_t lastLedIndex;
    bool calibrated;

    // System
    uint8_t currentMode;
};

class SettingsManager {
public:
    SettingsManager();

    void begin();

    // Load/Save
    bool load();
    bool save();
    void reset();

    // Access
    Settings& get() { return _settings; }
    const Settings& get() const { return _settings; }

    // JSON conversion
    String toJson() const;
    bool fromJson(const char* json);
    bool fromJson(JsonDocument& doc);

    // Individual settings
    void setLedBrightness(uint8_t brightness);
    void setLedColor(uint8_t r, uint8_t g, uint8_t b);
    void setWifiMode(uint8_t mode);
    void setStaCredentials(const char* ssid, const char* password);
    void setCalibration(uint8_t firstNote, uint8_t firstLed, uint8_t lastNote, uint8_t lastLed);

    // Validation
    bool isCalibrated() const { return _settings.calibrated; }

private:
    Settings _settings;

    void setDefaults();
    bool validateSettings();
};

extern SettingsManager settingsManager;

#endif // SETTINGS_MANAGER_H
