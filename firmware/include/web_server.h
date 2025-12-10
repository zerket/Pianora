#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "config.h"

// WebSocket message types
namespace WsMessageType {
    // From controller to app
    constexpr const char* MIDI_NOTE = "midi_note";
    constexpr const char* STATUS = "status";
    constexpr const char* CALIBRATION_STEP = "calibration_step";
    constexpr const char* RECORDING_DATA = "recording_data";
    constexpr const char* ERROR = "error";

    // From app to controller
    constexpr const char* SET_MODE = "set_mode";
    constexpr const char* SET_SETTINGS = "set_settings";
    constexpr const char* START_CALIBRATION = "start_calibration";
    constexpr const char* CALIBRATION_INPUT = "calibration_input";
    constexpr const char* PLAY_SONG = "play_song";
    constexpr const char* STOP_SONG = "stop_song";
    constexpr const char* START_RECORDING = "start_recording";
    constexpr const char* STOP_RECORDING = "stop_recording";
    constexpr const char* GET_STATUS = "get_status";
    constexpr const char* GET_SETTINGS = "get_settings";
    constexpr const char* GET_FILES = "get_files";
}

class WebServer {
public:
    WebServer();

    void begin();
    void update();

    // WebSocket broadcast
    void broadcastMidiNote(uint8_t note, uint8_t velocity, bool isNoteOn);
    void broadcastStatus();
    void broadcastCalibrationStep(uint8_t step, uint8_t ledIndex);
    void broadcastError(const char* message);

    // Client count
    uint8_t getClientCount() const;

    // Get underlying server (for ElegantOTA)
    AsyncWebServer& getServer() { return _server; }

private:
    AsyncWebServer _server;
    AsyncWebSocket _ws;

    unsigned long _lastStatusBroadcast;

    // HTTP handlers
    void setupRoutes();
    void handleGetStatus(AsyncWebServerRequest* request);
    void handleGetSettings(AsyncWebServerRequest* request);
    void handlePostSettings(AsyncWebServerRequest* request, uint8_t* data, size_t len);
    void handleGetFiles(AsyncWebServerRequest* request);
    void handleUploadFile(AsyncWebServerRequest* request, const String& filename,
                          size_t index, uint8_t* data, size_t len, bool final);
    void handleDeleteFile(AsyncWebServerRequest* request);
    void handleOtaUpdate(AsyncWebServerRequest* request, const String& filename,
                         size_t index, uint8_t* data, size_t len, bool final);

    // WebSocket handlers
    void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
                   AwsEventType type, void* arg, uint8_t* data, size_t len);
    void handleWsMessage(AsyncWebSocketClient* client, uint8_t* data, size_t len);

    // Message processing
    void processSetMode(JsonDocument& doc);
    void processSetSettings(JsonDocument& doc);
    void processStartCalibration(JsonDocument& doc);
    void processCalibrationInput(JsonDocument& doc);
    void processPlaySong(JsonDocument& doc);
    void processStopSong(JsonDocument& doc);
    void processStartRecording(JsonDocument& doc);
    void processStopRecording(JsonDocument& doc);

    // Helpers
    String createJsonMessage(const char* type, JsonDocument& payload);
};

extern WebServer webServer;

#endif // WEB_SERVER_H
