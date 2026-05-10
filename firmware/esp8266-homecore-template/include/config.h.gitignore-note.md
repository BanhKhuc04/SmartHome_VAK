# `.gitignore` Note

The file `include/config.h` is ignored by Git to prevent accidentally committing your Wi-Fi and MQTT passwords.

**To configure your device:**
1. Copy `include/config.example.h` and rename it to `include/config.h`.
2. Edit `include/config.h` and enter your specific Wi-Fi credentials, MQTT passwords, and pin configurations.
3. Your local changes in `config.h` will not be tracked by Git.
