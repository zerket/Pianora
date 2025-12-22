#include "web_server.h"
#include "settings_manager.h"
#include "led_controller.h"
#include "midi_handler.h"
#include "wifi_manager.h"
#include <LittleFS.h>
#include <Update.h>

#if USE_BLE_MIDI
#include "ble_midi.h"
#endif

#if USE_RTP_MIDI
#include "rtp_midi.h"
#endif

// Global instance
PianoraWebServer webServer;

PianoraWebServer::PianoraWebServer()
    : _server(HTTP_PORT)
    , _ws("/ws")
    , _lastStatusBroadcast(0)
{
}

void PianoraWebServer::begin() {
    // Setup WebSocket
    _ws.onEvent([this](AsyncWebSocket* server, AsyncWebSocketClient* client,
                       AwsEventType type, void* arg, uint8_t* data, size_t len) {
        this->onWsEvent(server, client, type, arg, data, len);
    });
    _server.addHandler(&_ws);

    // Setup routes
    setupRoutes();

    // Start server
    _server.begin();
    DEBUG_PRINTLN("Web server started");
}

void PianoraWebServer::update() {
    // Cleanup old WebSocket clients
    _ws.cleanupClients();

    // Periodic status broadcast
    unsigned long now = millis();
    if (now - _lastStatusBroadcast > STATUS_UPDATE_INTERVAL) {
        _lastStatusBroadcast = now;
        if (_ws.count() > 0) {
            broadcastStatus();
        }
    }
}

void PianoraWebServer::setupRoutes() {
    // Serve static files from LittleFS (PWA)
    _server.serveStatic("/", LittleFS, "/www/").setDefaultFile("index.html");

    // API: Get status
    _server.on("/api/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleGetStatus(request);
    });

    // API: Get settings
    _server.on("/api/settings", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleGetSettings(request);
    });

    // API: Update settings
    _server.on("/api/settings", HTTP_POST,
        [](AsyncWebServerRequest* request) {},
        nullptr,
        [this](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
            handlePostSettings(request, data, len);
        }
    );

    // API: Get file list
    _server.on("/api/files", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleGetFiles(request);
    });

    // API: Delete file
    _server.on("/api/files", HTTP_DELETE, [this](AsyncWebServerRequest* request) {
        handleDeleteFile(request);
    });

    // API: Upload file
    _server.on("/api/upload", HTTP_POST,
        [](AsyncWebServerRequest* request) {
            request->send(200, "application/json", "{\"success\":true}");
        },
        [this](AsyncWebServerRequest* request, const String& filename, size_t index,
               uint8_t* data, size_t len, bool final) {
            handleUploadFile(request, filename, index, data, len, final);
        }
    );

    // API: OTA Update
    _server.on("/api/update", HTTP_POST,
        [](AsyncWebServerRequest* request) {
            bool success = !Update.hasError();
            request->send(200, "application/json",
                success ? "{\"success\":true}" : "{\"success\":false,\"error\":\"Update failed\"}");
            if (success) {
                delay(1000);
                ESP.restart();
            }
        },
        [this](AsyncWebServerRequest* request, const String& filename, size_t index,
               uint8_t* data, size_t len, bool final) {
            handleOtaUpdate(request, filename, index, data, len, final);
        }
    );

    // API: Restart
    _server.on("/api/restart", HTTP_POST, [](AsyncWebServerRequest* request) {
        request->send(200, "application/json", "{\"success\":true}");
        delay(500);
        ESP.restart();
    });

    // API: Factory reset
    _server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest* request) {
        settingsManager.reset();
        settingsManager.save();
        request->send(200, "application/json", "{\"success\":true}");
        delay(500);
        ESP.restart();
    });

    // 404 handler
    _server.onNotFound([](AsyncWebServerRequest* request) {
        request->send(404, "application/json", "{\"error\":\"Not found\"}");
    });
}

void PianoraWebServer::handleGetStatus(AsyncWebServerRequest* request) {
    JsonDocument doc;

    doc["version"] = PIANO_LED_VERSION;
    doc["uptime"] = millis() / 1000;
    doc["midi_connected"] = midiHandler.isConnected();
    doc["notes_received"] = midiHandler.getNotesReceived();
    doc["mode"] = static_cast<int>(ledController.getMode());
    doc["brightness"] = ledController.getBrightness();
    doc["ws_clients"] = _ws.count();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["calibrated"] = settingsManager.isCalibrated();

    // WiFi status
    JsonObject wifi = doc["wifi"].to<JsonObject>();
    wifi["ap_ip"] = wifiManager.getApIp().toString();
    wifi["sta_connected"] = wifiManager.isConnected();
    if (wifiManager.isConnected()) {
        wifi["sta_ip"] = wifiManager.getStaIp().toString();
        wifi["rssi"] = wifiManager.getRssi();
    }

    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
}

void PianoraWebServer::handleGetSettings(AsyncWebServerRequest* request) {
    request->send(200, "application/json", settingsManager.toJson());
}

void PianoraWebServer::handlePostSettings(AsyncWebServerRequest* request, uint8_t* data, size_t len) {
    // Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
    }

    // Update settings
    if (settingsManager.fromJson(doc)) {
        settingsManager.save();

        // Apply settings
        Settings& s = settingsManager.get();
        ledController.setBrightness(s.ledBrightness);
        ledController.setColor(CRGB(s.ledColor[0], s.ledColor[1], s.ledColor[2]));

        request->send(200, "application/json", "{\"success\":true}");
    } else {
        request->send(400, "application/json", "{\"error\":\"Failed to apply settings\"}");
    }
}

void PianoraWebServer::handleGetFiles(AsyncWebServerRequest* request) {
    JsonDocument doc;
    JsonArray files = doc["files"].to<JsonArray>();

    // List songs directory
    File root = LittleFS.open(SONGS_DIR);
    if (root && root.isDirectory()) {
        File file = root.openNextFile();
        while (file) {
            JsonObject f = files.add<JsonObject>();
            f["name"] = String(file.name());
            f["size"] = file.size();
            f["type"] = "song";
            file = root.openNextFile();
        }
    }

    // List recordings directory
    root = LittleFS.open(RECORDINGS_DIR);
    if (root && root.isDirectory()) {
        File file = root.openNextFile();
        while (file) {
            JsonObject f = files.add<JsonObject>();
            f["name"] = String(file.name());
            f["size"] = file.size();
            f["type"] = "recording";
            file = root.openNextFile();
        }
    }

    // File system info
    doc["total"] = LittleFS.totalBytes();
    doc["used"] = LittleFS.usedBytes();
    doc["free"] = LittleFS.totalBytes() - LittleFS.usedBytes();

    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
}

void PianoraWebServer::handleUploadFile(AsyncWebServerRequest* request, const String& filename,
                                  size_t index, uint8_t* data, size_t len, bool final) {
    static File uploadFile;

    if (index == 0) {
        // Start of upload
        String path = String(SONGS_DIR) + "/" + filename;
        DEBUG_PRINTF("Upload start: %s\n", path.c_str());
        uploadFile = LittleFS.open(path, "w");
    }

    if (uploadFile) {
        uploadFile.write(data, len);
    }

    if (final) {
        // End of upload
        if (uploadFile) {
            uploadFile.close();
            DEBUG_PRINTF("Upload complete: %s (%d bytes)\n", filename.c_str(), index + len);
        }
    }
}

void PianoraWebServer::handleDeleteFile(AsyncWebServerRequest* request) {
    if (!request->hasParam("path")) {
        request->send(400, "application/json", "{\"error\":\"Missing path parameter\"}");
        return;
    }

    String path = request->getParam("path")->value();

    if (LittleFS.remove(path)) {
        request->send(200, "application/json", "{\"success\":true}");
    } else {
        request->send(404, "application/json", "{\"error\":\"File not found\"}");
    }
}

void PianoraWebServer::handleOtaUpdate(AsyncWebServerRequest* request, const String& filename,
                                 size_t index, uint8_t* data, size_t len, bool final) {
    if (index == 0) {
        DEBUG_PRINTF("OTA Update start: %s\n", filename.c_str());
        if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
            Update.printError(Serial);
        }
    }

    if (Update.write(data, len) != len) {
        Update.printError(Serial);
    }

    if (final) {
        if (Update.end(true)) {
            DEBUG_PRINTF("OTA Update complete: %d bytes\n", index + len);
        } else {
            Update.printError(Serial);
        }
    }
}

// ============================================================================
// WebSocket handlers
// ============================================================================

void PianoraWebServer::onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
                          AwsEventType type, void* arg, uint8_t* data, size_t len) {
    switch (type) {
        case WS_EVT_CONNECT:
            DEBUG_PRINTF("WebSocket client #%u connected from %s\n",
                client->id(), client->remoteIP().toString().c_str());
            // Send initial status
            broadcastStatus();
            break;

        case WS_EVT_DISCONNECT:
            DEBUG_PRINTF("WebSocket client #%u disconnected\n", client->id());
            break;

        case WS_EVT_DATA:
            {
                AwsFrameInfo* info = (AwsFrameInfo*)arg;
                if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
                    handleWsMessage(client, data, len);
                }
            }
            break;

        case WS_EVT_ERROR:
            DEBUG_PRINTF("WebSocket error #%u: %s\n", client->id(), (char*)data);
            break;

        default:
            break;
    }
}

void PianoraWebServer::handleWsMessage(AsyncWebSocketClient* client, uint8_t* data, size_t len) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
        DEBUG_PRINTLN("WebSocket: Invalid JSON received");
        return;
    }

    const char* type = doc["type"];
    if (!type) {
        DEBUG_PRINTLN("WebSocket: Missing message type");
        return;
    }

    DEBUG_PRINTF("WebSocket message: %s\n", type);

    if (strcmp(type, WsMessageType::SET_MODE) == 0) {
        processSetMode(doc);
    } else if (strcmp(type, WsMessageType::SET_SETTINGS) == 0) {
        processSetSettings(doc);
    } else if (strcmp(type, WsMessageType::START_CALIBRATION) == 0) {
        processStartCalibration(doc);
    } else if (strcmp(type, WsMessageType::CALIBRATION_INPUT) == 0) {
        processCalibrationInput(doc);
    } else if (strcmp(type, WsMessageType::PLAY_SONG) == 0) {
        processPlaySong(doc);
    } else if (strcmp(type, WsMessageType::STOP_SONG) == 0) {
        processStopSong(doc);
    } else if (strcmp(type, WsMessageType::START_RECORDING) == 0) {
        processStartRecording(doc);
    } else if (strcmp(type, WsMessageType::STOP_RECORDING) == 0) {
        processStopRecording(doc);
    } else if (strcmp(type, WsMessageType::GET_STATUS) == 0) {
        broadcastStatus();
    }
}

// ============================================================================
// Broadcast methods
// ============================================================================

void PianoraWebServer::broadcastMidiNote(uint8_t note, uint8_t velocity, bool isNoteOn) {
    if (_ws.count() == 0) return;

    JsonDocument doc;
    doc["type"] = WsMessageType::MIDI_NOTE;
    doc["note"] = note;
    doc["velocity"] = velocity;
    doc["on"] = isNoteOn;

    String message;
    serializeJson(doc, message);
    _ws.textAll(message);
}

void PianoraWebServer::broadcastStatus() {
    if (_ws.count() == 0) return;

    JsonDocument doc;
    doc["type"] = WsMessageType::STATUS;
    doc["midi_connected"] = midiHandler.isConnected();
    doc["mode"] = static_cast<int>(ledController.getMode());
    doc["brightness"] = ledController.getBrightness();
    doc["calibrated"] = settingsManager.isCalibrated();

    // BLE MIDI status
    #if USE_BLE_MIDI
    doc["ble_connected"] = bleMidiHandler.isConnected();
    #else
    doc["ble_connected"] = false;
    #endif

    // RTP MIDI status
    #if USE_RTP_MIDI
    doc["rtp_connected"] = rtpMidiHandler.isConnected();
    #else
    doc["rtp_connected"] = false;
    #endif

    // Feature flags
    JsonObject features = doc["features"].to<JsonObject>();
    #if USE_ELEGANT_OTA
    features["elegant_ota"] = true;
    #else
    features["elegant_ota"] = false;
    #endif

    #if USE_BLE_MIDI
    features["ble_midi"] = true;
    #else
    features["ble_midi"] = false;
    #endif

    #if USE_RTP_MIDI
    features["rtp_midi"] = true;
    #else
    features["rtp_midi"] = false;
    #endif

    String message;
    serializeJson(doc, message);
    _ws.textAll(message);
}

void PianoraWebServer::broadcastCalibrationStep(uint8_t step, uint8_t ledIndex) {
    if (_ws.count() == 0) return;

    JsonDocument doc;
    doc["type"] = WsMessageType::CALIBRATION_STEP;
    doc["step"] = step;
    doc["led_index"] = ledIndex;

    String message;
    serializeJson(doc, message);
    _ws.textAll(message);
}

void PianoraWebServer::broadcastError(const char* message) {
    if (_ws.count() == 0) return;

    JsonDocument doc;
    doc["type"] = WsMessageType::ERROR;
    doc["message"] = message;

    String msg;
    serializeJson(doc, msg);
    _ws.textAll(msg);
}

uint8_t PianoraWebServer::getClientCount() const {
    return _ws.count();
}

// ============================================================================
// Message processors
// ============================================================================

void PianoraWebServer::processSetMode(JsonDocument& doc) {
    if (doc["payload"].containsKey("mode")) {
        int mode = doc["payload"]["mode"];
        ledController.setMode(static_cast<LedMode>(mode));
        DEBUG_PRINTF("Mode set to: %d\n", mode);
    }
}

void PianoraWebServer::processSetSettings(JsonDocument& doc) {
    JsonObject payload = doc["payload"];

    if (payload.containsKey("brightness")) {
        ledController.setBrightness(payload["brightness"]);
    }

    if (payload.containsKey("color")) {
        JsonArray color = payload["color"];
        ledController.setColor(CRGB(color[0], color[1], color[2]));
    }

    if (payload.containsKey("fadeTime")) {
        ledController.setFadeTime(payload["fadeTime"]);
    }

    if (payload.containsKey("waveEnabled")) {
        ledController.setWaveEnabled(payload["waveEnabled"]);
    }

    if (payload.containsKey("waveWidth")) {
        ledController.setWaveWidth(payload["waveWidth"]);
    }

    // Split mode settings
    if (payload.containsKey("splitPoint")) {
        ledController.setSplitPoint(payload["splitPoint"]);
    }

    if (payload.containsKey("splitLeftColor")) {
        JsonArray color = payload["splitLeftColor"];
        ledController.setSplitLeftColor(CRGB(color[0], color[1], color[2]));
    }

    if (payload.containsKey("splitRightColor")) {
        JsonArray color = payload["splitRightColor"];
        ledController.setSplitRightColor(CRGB(color[0], color[1], color[2]));
    }
}

void PianoraWebServer::processStartCalibration(JsonDocument& doc) {
    // TODO: Implement calibration state machine
    DEBUG_PRINTLN("Calibration started");
    broadcastCalibrationStep(0, 0);
}

void PianoraWebServer::processCalibrationInput(JsonDocument& doc) {
    // TODO: Handle calibration input
    uint8_t note = doc["payload"]["note"];
    DEBUG_PRINTF("Calibration input: note %d\n", note);
}

void PianoraWebServer::processPlaySong(JsonDocument& doc) {
    // TODO: Implement song playback
    const char* filename = doc["payload"]["filename"];
    DEBUG_PRINTF("Play song: %s\n", filename);
}

void PianoraWebServer::processStopSong(JsonDocument& doc) {
    // TODO: Stop playback
    DEBUG_PRINTLN("Stop song");
}

void PianoraWebServer::processStartRecording(JsonDocument& doc) {
    // TODO: Start recording
    DEBUG_PRINTLN("Recording started");
}

void PianoraWebServer::processStopRecording(JsonDocument& doc) {
    // TODO: Stop recording and save
    DEBUG_PRINTLN("Recording stopped");
}
