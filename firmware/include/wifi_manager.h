#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "config.h"

enum class WiFiMode {
    AP,         // Access Point mode
    STATION,    // Connect to existing network
    AP_STA      // Both modes (fallback)
};

class WiFiManager {
public:
    WiFiManager();

    void begin();
    void update();

    // Mode control
    void setMode(WiFiMode mode);
    WiFiMode getMode() const { return _mode; }

    // AP settings
    void setApCredentials(const char* ssid, const char* password);
    const char* getApSsid() const { return _apSsid; }
    IPAddress getApIp() const;

    // Station settings
    void setStaCredentials(const char* ssid, const char* password);
    bool connectToNetwork();
    bool isConnected() const;
    IPAddress getStaIp() const;

    // mDNS
    void setHostname(const char* hostname);
    const char* getHostname() const { return _hostname; }

    // Status
    String getStatusJson() const;
    int8_t getRssi() const;

private:
    WiFiMode _mode;

    // AP settings
    char _apSsid[32];
    char _apPassword[64];

    // Station settings
    char _staSsid[32];
    char _staPassword[64];

    // mDNS
    char _hostname[32];

    // State
    bool _apStarted;
    bool _staConnected;
    unsigned long _lastReconnectAttempt;

    // Private methods
    void startAP();
    void startStation();
    void startMdns();
};

extern WiFiManager wifiManager;

#endif // WIFI_MANAGER_H
