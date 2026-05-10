#include "homecore_mqtt.h"
#include "homecore_config.h"
#include "homecore_discovery.h"
#include <ESP8266WiFi.h>

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;

void wifi_connect() {
    if (WiFi.status() == WL_CONNECTED) return;
    
    unsigned long now = millis();
    if (now - lastWifiAttempt < 5000 && lastWifiAttempt != 0) return;
    lastWifiAttempt = now;

    Serial.println("WiFi connecting...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    message.trim();
    message.toLowerCase();
    
    Serial.print("MQTT Received [");
    Serial.print(topic);
    Serial.print("]: ");
    Serial.println(message);

    if (String(topic) == TOPIC_CMD) {
        on_command_received(message);
    }
}

void mqtt_reconnect() {
    if (mqttClient.connected()) return;
    if (WiFi.status() != WL_CONNECTED) return;

    unsigned long now = millis();
    if (now - lastMqttAttempt < 5000 && lastMqttAttempt != 0) return;
    lastMqttAttempt = now;

    Serial.println("MQTT connecting...");
    
    // Set Last Will and Testament (LWT)
    if (mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASS, TOPIC_STATUS, 0, true, "offline")) {
        Serial.println("MQTT connected");
        
        // Publish online status
        mqttClient.publish(TOPIC_STATUS, "online", true);
        
        // Subscribe to command topic
        mqttClient.subscribe(TOPIC_CMD);
        
        // Publish discovery on connect
        publish_discovery();
    } else {
        Serial.print("MQTT failed, rc=");
        Serial.println(mqttClient.state());
    }
}

void mqtt_setup() {
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqtt_callback);
    wifi_connect();
}

void mqtt_loop() {
    if (WiFi.status() != WL_CONNECTED) {
        wifi_connect();
    } else if (!mqttClient.connected()) {
        mqtt_reconnect();
    } else {
        mqttClient.loop();
    }
}

void mqtt_publish(const char* topic, const char* payload, bool retain) {
    if (mqttClient.connected()) {
        mqttClient.publish(topic, payload, retain);
    }
}

bool mqtt_connected() {
    return mqttClient.connected();
}
