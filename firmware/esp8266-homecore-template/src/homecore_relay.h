#pragma once
#include <Arduino.h>

void relay_setup();
void relay_loop();
void relay_handle_command(String cmd);
