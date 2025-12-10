#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// Piano-LED Configuration
// ============================================================================

// --- Version ---
#ifndef PIANO_LED_VERSION
#define PIANO_LED_VERSION "0.2.0"
#endif

// --- Feature Flags ---
#define USE_ELEGANT_OTA     1   // Enable ElegantOTA web updates
#define USE_BLE_MIDI        1   // Enable Bluetooth MIDI
#define USE_RTP_MIDI        1   // Enable WiFi MIDI (AppleMIDI/rtpMIDI)

// --- LED Strip ---
#define LED_PIN             48          // GPIO for WS2812B data
#define LED_COUNT           144         // Number of LEDs (adjustable)
#define LED_TYPE            WS2812B
#define LED_COLOR_ORDER     GRB
#define LED_MAX_BRIGHTNESS  255         // Max brightness (0-255)
#define LED_DEFAULT_BRIGHTNESS 128      // Default brightness

// --- MIDI ---
#define MIDI_NOTE_MIN       21          // A0 (lowest piano key)
#define MIDI_NOTE_MAX       108         // C8 (highest piano key)
#define MIDI_NOTE_COUNT     88          // Standard piano keys

// --- WiFi AP Mode ---
#ifndef WIFI_AP_SSID
#define WIFI_AP_SSID        "Pianora"
#endif
#ifndef WIFI_AP_PASSWORD
#define WIFI_AP_PASSWORD    "pianora123"
#endif
#define WIFI_AP_CHANNEL     1
#define WIFI_AP_MAX_CONN    4

// --- WiFi Station Mode ---
#define WIFI_STA_TIMEOUT    10000       // Connection timeout (ms)

// --- Web Server ---
#define HTTP_PORT           80
#define WS_PORT             81          // WebSocket port (or same as HTTP)
#define WS_MAX_CLIENTS      4

// --- mDNS ---
#define MDNS_HOSTNAME       "pianora"

// --- Bluetooth MIDI ---
#define BLE_DEVICE_NAME     "Pianora-BLE"
#define BLE_SCAN_TIMEOUT    5           // Seconds to scan for BLE devices

// --- RTP MIDI (AppleMIDI) ---
#define RTP_MIDI_PORT       5004        // Default rtpMIDI port
#define RTP_SESSION_NAME    "Pianora"

// --- File System ---
#define CONFIG_FILE         "/config.json"
#define CALIBRATION_FILE    "/calibration.json"
#define SONGS_DIR           "/songs"
#define RECORDINGS_DIR      "/recordings"

// --- Timings ---
#define LED_UPDATE_INTERVAL 16          // ~60 FPS (ms)
#define STATUS_UPDATE_INTERVAL 1000     // Status broadcast interval (ms)
#define MIDI_POLL_INTERVAL  1           // MIDI polling (ms)

// --- Debug ---
#define DEBUG_SERIAL        1           // Enable serial debug output
#if DEBUG_SERIAL
    #define DEBUG_PRINT(x)      Serial.print(x)
    #define DEBUG_PRINTLN(x)    Serial.println(x)
    #define DEBUG_PRINTF(...)   Serial.printf(__VA_ARGS__)
#else
    #define DEBUG_PRINT(x)
    #define DEBUG_PRINTLN(x)
    #define DEBUG_PRINTF(...)
#endif

#endif // CONFIG_H
