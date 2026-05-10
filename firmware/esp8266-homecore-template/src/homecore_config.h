#pragma once

// Try to include the user's config file.
// If this fails, the user hasn't copied include/config.example.h to include/config.h yet!
#include "../include/config.h"

// Define default topics based on DEVICE_ID
#define TOPIC_ROOT "homelab/device/" DEVICE_ID

#define TOPIC_CMD       TOPIC_ROOT "/cmd"
#define TOPIC_STATE     TOPIC_ROOT "/state"
#define TOPIC_STATUS    TOPIC_ROOT "/status"
#define TOPIC_TELEMETRY TOPIC_ROOT "/telemetry"

#define TOPIC_DISCOVERY "homelab/discovery"
