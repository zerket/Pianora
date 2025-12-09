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
#include "config.h"
#include "led_controller.h"
#include "midi_handler.h"
#include "wifi_manager.h"
#include "web_server.h"
#include "settings_manager.h"

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

// ============================================================================
// Setup
// ============================================================================

void setup() {
    // Serial for debugging
    Serial.begin(115200);
    delay(1000);

    DEBUG_PRINTLN("\n\n");
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("   Piano-LED v" PIANO_LED_VERSION);
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN();

    // Initialize LittleFS
    DEBUG_PRINT("Initializing LittleFS... ");
    if (!LittleFS.begin(true)) {
        DEBUG_PRINTLN("FAILED!");
    } else {
        DEBUG_PRINTLN("OK");
    }

    // Load settings
    DEBUG_PRINT("Loading settings... ");
    settingsManager.begin();
    if (settingsManager.load()) {
        DEBUG_PRINTLN("OK");
    } else {
        DEBUG_PRINTLN("Using defaults");
    }

    // Initialize LED controller
    DEBUG_PRINT("Initializing LEDs... ");
    ledController.begin();
    DEBUG_PRINTLN("OK");

    // Play startup animation
    ledController.playStartupAnimation();

    // Initialize WiFi
    DEBUG_PRINT("Initializing WiFi... ");
    wifiManager.begin();
    DEBUG_PRINTLN("OK");

    // Initialize web server
    DEBUG_PRINT("Starting web server... ");
    webServer.begin();
    DEBUG_PRINTLN("OK");

    // Initialize MIDI handler
    DEBUG_PRINT("Initializing MIDI... ");
    midiHandler.begin();
    midiHandler.setNoteOnCallback(onMidiNoteOn);
    midiHandler.setNoteOffCallback(onMidiNoteOff);
    midiHandler.setHotkeyCallback(onHotkey);
    DEBUG_PRINTLN("OK");

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
    // Process MIDI input
    midiHandler.update();

    // Update LED effects
    ledController.update();

    // Update WiFi (reconnection, etc.)
    wifiManager.update();

    // Update web server (status broadcast, cleanup)
    webServer.update();

    // Small delay to prevent watchdog issues
    yield();
}
