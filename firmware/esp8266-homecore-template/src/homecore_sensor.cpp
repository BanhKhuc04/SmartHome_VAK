#include "homecore_sensor.h"
#include "homecore_config.h"
#include "homecore_mqtt.h"
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>

#if ENABLE_DHT
#include <DHT.h>
DHT dht(DHT_PIN, DHT_TYPE);
#endif

unsigned long lastTelemetryTime = 0;

void sensor_setup() {
#if ENABLE_DHT
    dht.begin();
#endif
}

void publish_telemetry() {
    if (!mqtt_connected()) return;

    StaticJsonDocument<256> doc;
    
    // Core system telemetry
    doc["rssi"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();

    // DHT sensor data
#if ENABLE_DHT
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    if (!isnan(t)) doc["temperature"] = serialized(String(t, 1));
    if (!isnan(h)) doc["humidity"] = serialized(String(h, 1));
#endif

    // Placeholders for BME280 etc. can be added here
#if ENABLE_BME280
    // doc["temperature"] = bme.readTemperature();
    // doc["humidity"] = bme.readHumidity();
    // doc["pressure"] = bme.readPressure() / 100.0F;
#endif

    String payload;
    serializeJson(doc, payload);

    mqtt_publish(TOPIC_TELEMETRY, payload.c_str());
    lastTelemetryTime = millis();
    Serial.println("Telemetry published.");
}

void sensor_loop() {
    unsigned long now = millis();
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        publish_telemetry();
    }
}
