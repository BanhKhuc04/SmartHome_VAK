#include <Arduino.h>
#include "homecore_config.h"
#include "homecore_mqtt.h"
#include "homecore_discovery.h"
#include "homecore_relay.h"
#include "homecore_sensor.h"

void on_command_received(String payload) {
    // Basic commands
    if (payload == "discovery") {
        publish_discovery();
    } 
    else if (payload == "telemetry") {
        publish_telemetry();
    }
    // Relay commands
    else {
        relay_handle_command(payload);
    }
}

void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\n\n--- HomeCore Nexus Node Booting ---");
    Serial.print("Device ID: ");
    Serial.println(DEVICE_ID);

    relay_setup();
    sensor_setup();
    discovery_setup();
    mqtt_setup(); // Connects WiFi and MQTT
}

void loop() {
    mqtt_loop();
    discovery_loop();
    relay_loop();
    sensor_loop();
}
