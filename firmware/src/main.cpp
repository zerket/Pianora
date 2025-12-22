/**
 * Piano-LED Firmware
 *
 * Main entry point for ESP32-S3 based piano LED visualizer.
 *
 * Hardware:
 *   - ESP32-S3-WROOM-1-N16R8
 *   - WS2812B LED strip (144 LEDs)
 *   - USB MIDI input (piano)
 *
 * Features:
 *   - Real-time MIDI to LED visualization
 *   - Multiple visualization modes
 *   - WiFi AP/Station for PWA connection
 *   - WebSocket for real-time communication
 *   - LittleFS for settings and files storage
 */

#include <Arduino.h>
#include <LittleFS.h>
#include "config.h"
#include "led_controller.h"
#include "midi_handler.h"
#include "wifi_manager.h"
#include "web_server.h"
#include "settings_manager.h"

// Very early debug output (before global constructors complete)
// This runs BEFORE setup() and can help diagnose early crashes
__attribute__((constructor(101)))
void earlyDebug() {
    // Note: Serial may not be ready here, but we try anyway
    // This helps identify if crash is in global constructors
}

#if USE_BLE_MIDI
#include "ble_midi.h"
#endif

#if USE_RTP_MIDI
#include "rtp_midi.h"
#endif

#if USE_ELEGANT_OTA
#include <ElegantOTA.h>
#endif

// ============================================================================
// Global instances (defined in respective .cpp files)
// ============================================================================
// LedController ledController;
// MidiHandler midiHandler;
// WiFiManager wifiManager;
// WebServer webServer;
// SettingsManager settingsManager;

// ============================================================================
// MIDI Callbacks
// ============================================================================

void onMidiNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("Note ON: ch=%d note=%d vel=%d\n", channel, note, velocity);

    // Update LED
    ledController.noteOn(note, velocity);

    // Broadcast to connected clients
    webServer.broadcastMidiNote(note, velocity, true);
}

void onMidiNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    DEBUG_PRINTF("Note OFF: ch=%d note=%d\n", channel, note);

    // Update LED
    ledController.noteOff(note);

    // Broadcast to connected clients
    webServer.broadcastMidiNote(note, velocity, false);
}

void onHotkey(uint8_t note1, uint8_t note2) {
    DEBUG_PRINTF("Hotkey pressed: %d + %d\n", note1, note2);

    // TODO: Implement hotkey actions
    // Example: brightness up/down, mode switch, etc.
}

#if USE_BLE_MIDI
// BLE MIDI Callbacks - forward to same handlers as USB MIDI
void onBleMidiNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    onMidiNoteOn(channel, note, velocity);

    // Forward to RTP MIDI if connected
    #if USE_RTP_MIDI
    rtpMidiHandler.sendNoteOn(channel, note, velocity);
    #endif
}

void onBleMidiNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    onMidiNoteOff(channel, note, velocity);

    // Forward to RTP MIDI if connected
    #if USE_RTP_MIDI
    rtpMidiHandler.sendNoteOff(channel, note, velocity);
    #endif
}
#endif

#if USE_RTP_MIDI
// RTP MIDI Callbacks
void onRtpMidiNoteOn(uint8_t channel, uint8_t note, uint8_t velocity) {
    onMidiNoteOn(channel, note, velocity);
}

void onRtpMidiNoteOff(uint8_t channel, uint8_t note, uint8_t velocity) {
    onMidiNoteOff(channel, note, velocity);
}
#endif

// ============================================================================
// Setup
// ============================================================================

void setup() {
    // Serial for debugging - FIRST THING
    Serial.begin(115200);

    // Immediate output to confirm we reached setup()
    Serial.println("\n\n[BOOT] Serial initialized");
    Serial.flush();

    delay(1000);  // Shorter delay for first test
    Serial.println("[BOOT] After delay");
    Serial.flush();

    DEBUG_PRINTLN("\n");
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("   Pianora v" PIANO_LED_VERSION);
    DEBUG_PRINTLN("   ESP32-S3 Piano LED Controller");
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN();

    // Initialize LittleFS
    Serial.println("[BOOT] Starting LittleFS...");
    Serial.flush();
    if (!LittleFS.begin(true)) {
        Serial.println("[BOOT] LittleFS FAILED!");
    } else {
        Serial.println("[BOOT] LittleFS OK");
    }
    Serial.flush();

    // Load settings
    Serial.println("[BOOT] Loading settings...");
    Serial.flush();
    settingsManager.begin();
    if (settingsManager.load()) {
        Serial.println("[BOOT] Settings OK");
    } else {
        Serial.println("[BOOT] Settings: Using defaults");
    }
    Serial.flush();

    // Initialize LED controller
    Serial.println("[BOOT] Starting LEDs...");
    Serial.flush();
    ledController.begin();
    Serial.println("[BOOT] LEDs OK");
    Serial.flush();

    // Play startup animation
    Serial.println("[BOOT] Playing animation...");
    Serial.flush();
    ledController.playStartupAnimation();
    Serial.println("[BOOT] Animation done");
    Serial.flush();

    // Initialize WiFi
    Serial.println("[BOOT] Starting WiFi...");
    Serial.flush();
    wifiManager.begin();
    Serial.println("[BOOT] WiFi OK");
    Serial.flush();

    // Initialize web server
    Serial.println("[BOOT] Starting web server...");
    Serial.flush();
    webServer.begin();
    Serial.println("[BOOT] Web server OK");
    Serial.flush();

    // Initialize USB MIDI handler (before WiFi for USB Host priority)
    #if USE_USB_MIDI
    DEBUG_PRINT("Initializing USB MIDI Host... ");
    midiHandler.begin();
    midiHandler.setNoteOnCallback(onMidiNoteOn);
    midiHandler.setNoteOffCallback(onMidiNoteOff);
    midiHandler.setHotkeyCallback(onHotkey);
    DEBUG_PRINTLN("OK");
    #else
    DEBUG_PRINTLN("USB MIDI: Disabled");
    #endif

    #if USE_BLE_MIDI
    // Initialize BLE MIDI
    DEBUG_PRINT("Initializing BLE MIDI... ");
    bleMidiHandler.begin();
    bleMidiHandler.setNoteOnCallback(onBleMidiNoteOn);
    bleMidiHandler.setNoteOffCallback(onBleMidiNoteOff);
    DEBUG_PRINTLN("OK");
    #endif

    #if USE_RTP_MIDI
    // Initialize RTP MIDI (AppleMIDI)
    DEBUG_PRINT("Initializing RTP MIDI... ");
    rtpMidiHandler.begin();
    rtpMidiHandler.setNoteOnCallback(onRtpMidiNoteOn);
    rtpMidiHandler.setNoteOffCallback(onRtpMidiNoteOff);
    DEBUG_PRINTLN("OK");
    #endif

    #if USE_ELEGANT_OTA
    // Initialize ElegantOTA
    DEBUG_PRINT("Initializing OTA... ");
    ElegantOTA.begin(&webServer.getServer());
    DEBUG_PRINTLN("OK");
    #endif

    // Apply settings
    Settings& s = settingsManager.get();
    ledController.setBrightness(s.ledBrightness);
    ledController.setColor(CRGB(s.ledColor[0], s.ledColor[1], s.ledColor[2]));

    if (s.calibrated) {
        ledController.setCalibration(s.firstMidiNote, s.firstLedIndex,
                                     s.lastMidiNote, s.lastLedIndex);
    }

    // Status indication
    if (wifiManager.getMode() == WiFiMode::AP) {
        ledController.showStatus(CRGB::Blue); // AP mode ready
    } else if (wifiManager.isConnected()) {
        ledController.showStatus(CRGB::Green); // Connected to network
    }

    // Check if calibration is needed
    if (!s.calibrated) {
        DEBUG_PRINTLN("\n*** Calibration required! ***");
        DEBUG_PRINTLN("Connect to WiFi and open the app to calibrate.\n");
    }

    DEBUG_PRINTLN();
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTF("   WiFi AP: %s\n", wifiManager.getApSsid());
    DEBUG_PRINTF("   IP: %s\n", wifiManager.getApIp().toString().c_str());
    DEBUG_PRINTF("   http://%s.local\n", wifiManager.getHostname());
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN();
    DEBUG_PRINTLN("Ready!");
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    // Process USB MIDI input
    #if USE_USB_MIDI
    midiHandler.update();
    #endif

    #if USE_BLE_MIDI
    // Process BLE MIDI
    bleMidiHandler.update();
    #endif

    #if USE_RTP_MIDI
    // Process RTP MIDI (AppleMIDI)
    rtpMidiHandler.update();
    #endif

    // Update LED effects
    ledController.update();

    // Update WiFi (reconnection, etc.)
    wifiManager.update();

    // Update web server (status broadcast, cleanup)
    webServer.update();

    #if USE_ELEGANT_OTA
    // Handle OTA updates
    ElegantOTA.loop();
    #endif

    // Small delay to prevent watchdog issues
    yield();
}
