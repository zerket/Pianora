#include "settings_manager.h"

// Global instance
SettingsManager settingsManager;

SettingsManager::SettingsManager() {
    setDefaults();
}

void SettingsManager::begin() {
    // Ensure directories exist
    if (!LittleFS.exists(SONGS_DIR)) {
        LittleFS.mkdir(SONGS_DIR);
    }
    if (!LittleFS.exists(RECORDINGS_DIR)) {
        LittleFS.mkdir(RECORDINGS_DIR);
    }
}

bool SettingsManager::load() {
    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file) {
        DEBUG_PRINTLN("Config file not found, using defaults");
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        DEBUG_PRINTF("Failed to parse config: %s\n", error.c_str());
        return false;
    }

    return fromJson(doc);
}

bool SettingsManager::save() {
    File file = LittleFS.open(CONFIG_FILE, "w");
    if (!file) {
        DEBUG_PRINTLN("Failed to open config file for writing");
        return false;
    }

    file.print(toJson());
    file.close();

    DEBUG_PRINTLN("Settings saved");
    return true;
}

void SettingsManager::reset() {
    setDefaults();
    DEBUG_PRINTLN("Settings reset to defaults");
}

void SettingsManager::setDefaults() {
    // LED settings
    _settings.ledBrightness = LED_DEFAULT_BRIGHTNESS;
    _settings.ledColor[0] = 255;
    _settings.ledColor[1] = 255;
    _settings.ledColor[2] = 255;
    _settings.ledCount = LED_COUNT;
    _settings.ledReversed = false;

    // Visualizer settings
    _settings.fadeTimeMs = 200;
    _settings.waveEnabled = false;
    _settings.waveWidth = 3;
    _settings.waveSpeed = 50;
    _settings.waveColor[0] = 0;
    _settings.waveColor[1] = 0;
    _settings.waveColor[2] = 255;
    _settings.gradientEnabled = false;

    // Learning settings
    _settings.hintColor[0] = 0;
    _settings.hintColor[1] = 255;
    _settings.hintColor[2] = 0;
    _settings.successColor[0] = 0;
    _settings.successColor[1] = 0;
    _settings.successColor[2] = 255;
    _settings.errorColor[0] = 255;
    _settings.errorColor[1] = 0;
    _settings.errorColor[2] = 0;
    _settings.lookAheadNotes = 2;
    _settings.splitHandColors = false;

    // WiFi settings
    _settings.wifiMode = 0; // AP mode
    memset(_settings.staSsid, 0, sizeof(_settings.staSsid));
    memset(_settings.staPassword, 0, sizeof(_settings.staPassword));
    strncpy(_settings.apSsid, WIFI_AP_SSID, sizeof(_settings.apSsid));
    strncpy(_settings.apPassword, WIFI_AP_PASSWORD, sizeof(_settings.apPassword));
    strncpy(_settings.hostname, MDNS_HOSTNAME, sizeof(_settings.hostname));

    // Calibration
    _settings.firstMidiNote = MIDI_NOTE_MIN;
    _settings.firstLedIndex = 0;
    _settings.lastMidiNote = MIDI_NOTE_MAX;
    _settings.lastLedIndex = LED_COUNT - 1;
    _settings.calibrated = false;

    // System
    _settings.currentMode = 1; // FREE_PLAY
}

String SettingsManager::toJson() const {
    JsonDocument doc;

    // LED
    JsonObject led = doc["led"].to<JsonObject>();
    led["brightness"] = _settings.ledBrightness;
    JsonArray ledColor = led["color"].to<JsonArray>();
    ledColor.add(_settings.ledColor[0]);
    ledColor.add(_settings.ledColor[1]);
    ledColor.add(_settings.ledColor[2]);
    led["count"] = _settings.ledCount;
    led["reversed"] = _settings.ledReversed;

    // Visualizer
    JsonObject vis = doc["visualizer"].to<JsonObject>();
    vis["fadeTime"] = _settings.fadeTimeMs;
    vis["waveEnabled"] = _settings.waveEnabled;
    vis["waveWidth"] = _settings.waveWidth;
    vis["waveSpeed"] = _settings.waveSpeed;
    JsonArray waveColor = vis["waveColor"].to<JsonArray>();
    waveColor.add(_settings.waveColor[0]);
    waveColor.add(_settings.waveColor[1]);
    waveColor.add(_settings.waveColor[2]);
    vis["gradient"] = _settings.gradientEnabled;

    // Learning
    JsonObject learn = doc["learning"].to<JsonObject>();
    JsonArray hintColor = learn["hintColor"].to<JsonArray>();
    hintColor.add(_settings.hintColor[0]);
    hintColor.add(_settings.hintColor[1]);
    hintColor.add(_settings.hintColor[2]);
    JsonArray successColor = learn["successColor"].to<JsonArray>();
    successColor.add(_settings.successColor[0]);
    successColor.add(_settings.successColor[1]);
    successColor.add(_settings.successColor[2]);
    JsonArray errorColor = learn["errorColor"].to<JsonArray>();
    errorColor.add(_settings.errorColor[0]);
    errorColor.add(_settings.errorColor[1]);
    errorColor.add(_settings.errorColor[2]);
    learn["lookAhead"] = _settings.lookAheadNotes;
    learn["splitHands"] = _settings.splitHandColors;

    // WiFi
    JsonObject wifi = doc["wifi"].to<JsonObject>();
    wifi["mode"] = _settings.wifiMode;
    wifi["staSsid"] = _settings.staSsid;
    wifi["staPassword"] = ""; // Don't expose password
    wifi["apSsid"] = _settings.apSsid;
    wifi["apPassword"] = ""; // Don't expose password
    wifi["hostname"] = _settings.hostname;

    // Calibration
    JsonObject cal = doc["calibration"].to<JsonObject>();
    cal["firstNote"] = _settings.firstMidiNote;
    cal["firstLed"] = _settings.firstLedIndex;
    cal["lastNote"] = _settings.lastMidiNote;
    cal["lastLed"] = _settings.lastLedIndex;
    cal["calibrated"] = _settings.calibrated;

    // System
    doc["currentMode"] = _settings.currentMode;

    String result;
    serializeJson(doc, result);
    return result;
}

bool SettingsManager::fromJson(const char* json) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, json);

    if (error) {
        return false;
    }

    return fromJson(doc);
}

bool SettingsManager::fromJson(JsonDocument& doc) {
    // LED
    if (doc.containsKey("led")) {
        JsonObject led = doc["led"];
        if (led.containsKey("brightness")) _settings.ledBrightness = led["brightness"];
        if (led.containsKey("color")) {
            JsonArray c = led["color"];
            _settings.ledColor[0] = c[0];
            _settings.ledColor[1] = c[1];
            _settings.ledColor[2] = c[2];
        }
        if (led.containsKey("count")) _settings.ledCount = led["count"];
        if (led.containsKey("reversed")) _settings.ledReversed = led["reversed"];
    }

    // Visualizer
    if (doc.containsKey("visualizer")) {
        JsonObject vis = doc["visualizer"];
        if (vis.containsKey("fadeTime")) _settings.fadeTimeMs = vis["fadeTime"];
        if (vis.containsKey("waveEnabled")) _settings.waveEnabled = vis["waveEnabled"];
        if (vis.containsKey("waveWidth")) _settings.waveWidth = vis["waveWidth"];
        if (vis.containsKey("waveSpeed")) _settings.waveSpeed = vis["waveSpeed"];
        if (vis.containsKey("waveColor")) {
            JsonArray c = vis["waveColor"];
            _settings.waveColor[0] = c[0];
            _settings.waveColor[1] = c[1];
            _settings.waveColor[2] = c[2];
        }
        if (vis.containsKey("gradient")) _settings.gradientEnabled = vis["gradient"];
    }

    // Learning
    if (doc.containsKey("learning")) {
        JsonObject learn = doc["learning"];
        if (learn.containsKey("hintColor")) {
            JsonArray c = learn["hintColor"];
            _settings.hintColor[0] = c[0];
            _settings.hintColor[1] = c[1];
            _settings.hintColor[2] = c[2];
        }
        if (learn.containsKey("successColor")) {
            JsonArray c = learn["successColor"];
            _settings.successColor[0] = c[0];
            _settings.successColor[1] = c[1];
            _settings.successColor[2] = c[2];
        }
        if (learn.containsKey("errorColor")) {
            JsonArray c = learn["errorColor"];
            _settings.errorColor[0] = c[0];
            _settings.errorColor[1] = c[1];
            _settings.errorColor[2] = c[2];
        }
        if (learn.containsKey("lookAhead")) _settings.lookAheadNotes = learn["lookAhead"];
        if (learn.containsKey("splitHands")) _settings.splitHandColors = learn["splitHands"];
    }

    // WiFi
    if (doc.containsKey("wifi")) {
        JsonObject wifi = doc["wifi"];
        if (wifi.containsKey("mode")) _settings.wifiMode = wifi["mode"];
        if (wifi.containsKey("staSsid")) {
            strncpy(_settings.staSsid, wifi["staSsid"], sizeof(_settings.staSsid) - 1);
        }
        if (wifi.containsKey("staPassword") && strlen(wifi["staPassword"]) > 0) {
            strncpy(_settings.staPassword, wifi["staPassword"], sizeof(_settings.staPassword) - 1);
        }
        if (wifi.containsKey("apSsid")) {
            strncpy(_settings.apSsid, wifi["apSsid"], sizeof(_settings.apSsid) - 1);
        }
        if (wifi.containsKey("apPassword") && strlen(wifi["apPassword"]) > 0) {
            strncpy(_settings.apPassword, wifi["apPassword"], sizeof(_settings.apPassword) - 1);
        }
        if (wifi.containsKey("hostname")) {
            strncpy(_settings.hostname, wifi["hostname"], sizeof(_settings.hostname) - 1);
        }
    }

    // Calibration
    if (doc.containsKey("calibration")) {
        JsonObject cal = doc["calibration"];
        if (cal.containsKey("firstNote")) _settings.firstMidiNote = cal["firstNote"];
        if (cal.containsKey("firstLed")) _settings.firstLedIndex = cal["firstLed"];
        if (cal.containsKey("lastNote")) _settings.lastMidiNote = cal["lastNote"];
        if (cal.containsKey("lastLed")) _settings.lastLedIndex = cal["lastLed"];
        if (cal.containsKey("calibrated")) _settings.calibrated = cal["calibrated"];
    }

    // System
    if (doc.containsKey("currentMode")) {
        _settings.currentMode = doc["currentMode"];
    }

    return validateSettings();
}

void SettingsManager::setLedBrightness(uint8_t brightness) {
    _settings.ledBrightness = brightness;
}

void SettingsManager::setLedColor(uint8_t r, uint8_t g, uint8_t b) {
    _settings.ledColor[0] = r;
    _settings.ledColor[1] = g;
    _settings.ledColor[2] = b;
}

void SettingsManager::setWifiMode(uint8_t mode) {
    _settings.wifiMode = mode;
}

void SettingsManager::setStaCredentials(const char* ssid, const char* password) {
    strncpy(_settings.staSsid, ssid, sizeof(_settings.staSsid) - 1);
    strncpy(_settings.staPassword, password, sizeof(_settings.staPassword) - 1);
}

void SettingsManager::setCalibration(uint8_t firstNote, uint8_t firstLed,
                                      uint8_t lastNote, uint8_t lastLed) {
    _settings.firstMidiNote = firstNote;
    _settings.firstLedIndex = firstLed;
    _settings.lastMidiNote = lastNote;
    _settings.lastLedIndex = lastLed;
    _settings.calibrated = true;
}

bool SettingsManager::validateSettings() {
    // Validate ranges
    if (_settings.ledBrightness > 255) _settings.ledBrightness = 255;
    if (_settings.ledCount > LED_COUNT) _settings.ledCount = LED_COUNT;
    if (_settings.waveWidth > 20) _settings.waveWidth = 20;
    if (_settings.lookAheadNotes > 10) _settings.lookAheadNotes = 10;
    if (_settings.wifiMode > 2) _settings.wifiMode = 0;
    if (_settings.currentMode > 6) _settings.currentMode = 1;

    return true;
}
