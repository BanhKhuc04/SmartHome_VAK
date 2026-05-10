#include "homecore_discovery.h"
#include "homecore_config.h"
#include "homecore_mqtt.h"
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>

unsigned long lastDiscoveryTime = 0;
const unsigned long DISCOVERY_INTERVAL = 10 * 60 * 1000; // 10 minutes

void publish_discovery() {
    if (!mqtt_connected()) return;

    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;
    doc["name"] = DEVICE_NAME;
    doc["type"] = DEVICE_TYPE;
    doc["platform"] = "ESP8266";
    doc["ip"] = WiFi.localIP().toString();
    doc["firmware"] = "1.0.0";

    // Parse DEVICE_CAPABILITIES string as JSON array
    StaticJsonDocument<128> capDoc;
    DeserializationError error = deserializeJson(capDoc, DEVICE_CAPABILITIES);
    if (!error) {
        doc["capabilities"] = capDoc.as<JsonArray>();
    } else {
        JsonArray caps = doc.createNestedArray("capabilities");
        caps.add("unknown");
    }

    JsonObject topics = doc.createNestedObject("topics");
    topics["cmd"] = TOPIC_CMD;
    topics["state"] = TOPIC_STATE;
    topics["status"] = TOPIC_STATUS;
    topics["telemetry"] = TOPIC_TELEMETRY;

    String payload;
    serializeJson(doc, payload);

    // Publish as retained message
    mqtt_publish(TOPIC_DISCOVERY, payload.c_str(), true);
    
    lastDiscoveryTime = millis();
    Serial.println("Discovery published.");
}

void discovery_setup() {
    // Initial discovery is handled by mqtt_reconnect() on connect
}

void discovery_loop() {
    unsigned long now = millis();
    if (now - lastDiscoveryTime >= DISCOVERY_INTERVAL) {
        publish_discovery();
    }
}
