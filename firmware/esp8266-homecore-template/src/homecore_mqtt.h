#pragma once
#include <Arduino.h>
#include <PubSubClient.h>

void mqtt_setup();
void mqtt_loop();
void mqtt_publish(const char* topic, const char* payload, bool retain = false);
bool mqtt_connected();

// External callback that will be defined in main.cpp to handle incoming commands
extern void on_command_received(String payload);
