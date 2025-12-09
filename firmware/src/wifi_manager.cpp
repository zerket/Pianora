#include "wifi_manager.h"

// Global instance
WiFiManager wifiManager;

WiFiManager::WiFiManager()
    : _mode(WiFiMode::AP)
    , _apStarted(false)
    , _staConnected(false)
    , _lastReconnectAttempt(0)
{
    strncpy(_apSsid, WIFI_AP_SSID, sizeof(_apSsid));
    strncpy(_apPassword, WIFI_AP_PASSWORD, sizeof(_apPassword));
    strncpy(_hostname, MDNS_HOSTNAME, sizeof(_hostname));
    memset(_staSsid, 0, sizeof(_staSsid));
    memset(_staPassword, 0, sizeof(_staPassword));
}

void WiFiManager::begin() {
    WiFi.setHostname(_hostname);

    switch (_mode) {
        case WiFiMode::AP:
            startAP();
            break;
        case WiFiMode::STATION:
            startStation();
            break;
        case WiFiMode::AP_STA:
            WiFi.mode(WIFI_AP_STA);
            startAP();
            startStation();
            break;
    }

    startMdns();
}

void WiFiManager::update() {
    // Handle Station mode reconnection
    if (_mode == WiFiMode::STATION || _mode == WiFiMode::AP_STA) {
        if (strlen(_staSsid) > 0 && !WiFi.isConnected()) {
            unsigned long now = millis();
            if (now - _lastReconnectAttempt > 30000) { // Retry every 30 seconds
                _lastReconnectAttempt = now;
                DEBUG_PRINTLN("Attempting WiFi reconnection...");
                WiFi.reconnect();
            }
        }

        // Update connection status
        bool connected = WiFi.isConnected();
        if (connected != _staConnected) {
            _staConnected = connected;
            if (connected) {
                DEBUG_PRINT("WiFi connected, IP: ");
                DEBUG_PRINTLN(WiFi.localIP());
            } else {
                DEBUG_PRINTLN("WiFi disconnected");
            }
        }
    }
}

void WiFiManager::setMode(WiFiMode mode) {
    _mode = mode;
}

void WiFiManager::setApCredentials(const char* ssid, const char* password) {
    strncpy(_apSsid, ssid, sizeof(_apSsid) - 1);
    strncpy(_apPassword, password, sizeof(_apPassword) - 1);
}

IPAddress WiFiManager::getApIp() const {
    return WiFi.softAPIP();
}

void WiFiManager::setStaCredentials(const char* ssid, const char* password) {
    strncpy(_staSsid, ssid, sizeof(_staSsid) - 1);
    strncpy(_staPassword, password, sizeof(_staPassword) - 1);
}

bool WiFiManager::connectToNetwork() {
    if (strlen(_staSsid) == 0) {
        DEBUG_PRINTLN("No WiFi SSID configured");
        return false;
    }

    DEBUG_PRINTF("Connecting to WiFi: %s\n", _staSsid);

    WiFi.begin(_staSsid, _staPassword);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_STA_TIMEOUT) {
        delay(100);
        DEBUG_PRINT(".");
    }
    DEBUG_PRINTLN();

    if (WiFi.status() == WL_CONNECTED) {
        _staConnected = true;
        DEBUG_PRINT("Connected! IP: ");
        DEBUG_PRINTLN(WiFi.localIP());
        return true;
    } else {
        DEBUG_PRINTLN("Connection failed");
        return false;
    }
}

bool WiFiManager::isConnected() const {
    return WiFi.isConnected();
}

IPAddress WiFiManager::getStaIp() const {
    return WiFi.localIP();
}

void WiFiManager::setHostname(const char* hostname) {
    strncpy(_hostname, hostname, sizeof(_hostname) - 1);
}

String WiFiManager::getStatusJson() const {
    String json = "{";
    json += "\"mode\":\"" + String(_mode == WiFiMode::AP ? "AP" : (_mode == WiFiMode::STATION ? "STA" : "AP_STA")) + "\",";
    json += "\"ap_ssid\":\"" + String(_apSsid) + "\",";
    json += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
    json += "\"sta_connected\":" + String(_staConnected ? "true" : "false") + ",";
    if (_staConnected) {
        json += "\"sta_ssid\":\"" + String(_staSsid) + "\",";
        json += "\"sta_ip\":\"" + WiFi.localIP().toString() + "\",";
        json += "\"rssi\":" + String(WiFi.RSSI());
    } else {
        json += "\"sta_ssid\":\"\",";
        json += "\"sta_ip\":\"\",";
        json += "\"rssi\":0";
    }
    json += "}";
    return json;
}

int8_t WiFiManager::getRssi() const {
    return WiFi.RSSI();
}

void WiFiManager::startAP() {
    DEBUG_PRINTF("Starting AP: %s\n", _apSsid);

    WiFi.softAP(_apSsid, _apPassword, WIFI_AP_CHANNEL, false, WIFI_AP_MAX_CONN);
    _apStarted = true;

    DEBUG_PRINT("AP IP: ");
    DEBUG_PRINTLN(WiFi.softAPIP());
}

void WiFiManager::startStation() {
    if (strlen(_staSsid) > 0) {
        connectToNetwork();
    }
}

void WiFiManager::startMdns() {
    if (MDNS.begin(_hostname)) {
        MDNS.addService("http", "tcp", HTTP_PORT);
        DEBUG_PRINTF("mDNS started: http://%s.local\n", _hostname);
    } else {
        DEBUG_PRINTLN("mDNS failed to start");
    }
}
