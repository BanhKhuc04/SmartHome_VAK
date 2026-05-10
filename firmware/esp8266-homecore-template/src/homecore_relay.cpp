#include "homecore_relay.h"
#include "homecore_config.h"
#include "homecore_mqtt.h"

#if ENABLE_RELAY

bool isPulsing = false;
unsigned long pulseStartTime = 0;
unsigned long lastPulseCommandTime = 0;

void set_relay_state(bool on) {
    if (RELAY_ACTIVE_LOW) {
        digitalWrite(RELAY_PIN, on ? LOW : HIGH);
    } else {
        digitalWrite(RELAY_PIN, on ? HIGH : LOW);
    }
}

void relay_setup() {
    pinMode(RELAY_PIN, OUTPUT);
    set_relay_state(false); // Default OFF
}

void relay_loop() {
    if (isPulsing) {
        unsigned long now = millis();
        if (now - pulseStartTime >= PULSE_MS) {
            isPulsing = false;
            set_relay_state(false);
            mqtt_publish(TOPIC_STATE, "pulse_done");
            Serial.println("Pulse complete");
        }
    }
}

void relay_handle_command(String cmd) {
    if (cmd == "on") {
        isPulsing = false;
        set_relay_state(true);
        mqtt_publish(TOPIC_STATE, "on");
        Serial.println("Relay turned ON");
    } 
    else if (cmd == "off") {
        isPulsing = false;
        set_relay_state(false);
        mqtt_publish(TOPIC_STATE, "off");
        Serial.println("Relay turned OFF");
    } 
    else if (cmd == "pulse") {
        unsigned long now = millis();
        if (now - lastPulseCommandTime < PULSE_COOLDOWN_MS && lastPulseCommandTime != 0) {
            Serial.println("Pulse command ignored (cooldown)");
            return;
        }
        lastPulseCommandTime = now;
        
        isPulsing = true;
        pulseStartTime = now;
        set_relay_state(true);
        Serial.println("Relay pulsing...");
    }
    else if (cmd == "status") {
        // Publish current physical state based on pulsing or level
        if (isPulsing) {
            mqtt_publish(TOPIC_STATE, "pulse_active");
        } else {
            bool state = digitalRead(RELAY_PIN) == (RELAY_ACTIVE_LOW ? LOW : HIGH);
            mqtt_publish(TOPIC_STATE, state ? "on" : "off");
        }
    }
}

#else

void relay_setup() {}
void relay_loop() {}
void relay_handle_command(String cmd) {
    // If relay is disabled but we get a status request, just publish unknown or ignore
    if (cmd == "status") {
        mqtt_publish(TOPIC_STATE, "no_relay");
    }
}

#endif
