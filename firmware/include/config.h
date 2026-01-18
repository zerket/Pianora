#ifndef PIANORA_CONFIG_H
#define PIANORA_CONFIG_H

// ============== Hardware Pins ==============
#define LED_PIN             18      // WS2812B data pin
#define USB_DP_PIN          20      // USB D+ (native ESP32-S3)
#define USB_DM_PIN          19      // USB D- (native ESP32-S3)

// ============== LED Configuration ==============
#define NUM_LEDS            176     // 88 keys * 2 LEDs per key
#define NUM_PIANO_KEYS      88
#define LEDS_PER_KEY        2
#define LED_BRIGHTNESS      128     // Default brightness (0-255)
#define LED_MAX_POWER_MW    5000    // Max power in milliwatts

// ============== MIDI Configuration ==============
#define LOWEST_MIDI_NOTE    21      // A0
#define HIGHEST_MIDI_NOTE   108     // C8
#define MAX_VELOCITY        127

// ============== Feature Flags ==============
#define USE_ELEGANT_OTA     1
#define USE_BLE_MIDI        1
#define USE_USB_MIDI        1
#define USE_LED_STRIP       1

// ============== LED Modes ==============
enum LEDMode {
    MODE_FREE_PLAY = 0,     // Simple note highlight
    MODE_VELOCITY = 1,      // Color based on velocity
    MODE_SPLIT = 2,         // Two-color keyboard split
    MODE_RANDOM = 3,        // Random colors per note
    MODE_VISUALIZER = 4,    // Splash/fade effects
    MODE_AMBIENT = 5,       // Decorative effects
    MODE_LEARNING = 6,      // Learning mode hints
    MODE_DEMO = 7,          // Auto-play demos
    MODE_KIDS_RAINBOW = 8   // Kids mode - rainbow by octave
};

// ============== Default Settings ==============
#define DEFAULT_BRIGHTNESS  128     // 50% - safe for eyes
#define DEFAULT_HUE         0       // White/neutral
#define DEFAULT_SATURATION  0       // White (no color) for default

// ============== USB MIDI Buffers ==============
#define MIDI_IN_BUFFERS     8       // Number of IN transfer buffers

// ============== Calibration ==============
enum CalibrationState {
    CALIB_IDLE = 0,
    CALIB_WAIT_FIRST_KEY = 1,
    CALIB_WAIT_LAST_KEY = 2,
    CALIB_COMPLETE = 3
};

struct CalibrationData {
    uint8_t firstNote;      // MIDI note number of first (lowest) key
    uint8_t lastNote;       // MIDI note number of last (highest) key
    uint8_t firstLed;       // LED index for first key
    uint8_t lastLed;        // LED index for last key
    bool calibrated;        // Has calibration been done?
};

// ============== Recording ==============
#define MAX_RECORDING_NOTES 1000    // ~5 minutes of playing
#define RECORDING_TIMEOUT_MS 300000 // 5 minutes max

struct RecordedNote {
    uint32_t timestamp;     // Milliseconds from recording start
    uint8_t note;           // MIDI note number
    uint8_t velocity;       // 0 = note off, 1-127 = note on
};

struct RecordingState {
    bool isRecording;
    uint32_t startTime;
    uint16_t noteCount;
    RecordedNote notes[MAX_RECORDING_NOTES];
};

#endif // PIANORA_CONFIG_H
