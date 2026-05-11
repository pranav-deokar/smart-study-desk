# ESP32-CAM Firmware — SmartDesk

## Required Libraries (install via Arduino IDE Library Manager)

- ArduinoJson (v6.x by Benoit Blanchon)
- ESP32 board support: https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

## Board Settings in Arduino IDE

| Setting         | Value              |
|-----------------|--------------------|
| Board           | AI-Thinker ESP32-CAM |
| Upload Speed    | 115200             |
| Flash Frequency | 80MHz              |
| Flash Mode      | QIO                |
| Partition Scheme| Huge APP (3MB No OTA) |
| Port            | Your COM/tty port  |

## Hardware Wiring

```
ESP32-CAM         HC-SR04
─────────         ───────
GPIO 12  ───────→ TRIG
GPIO 13  ←─────── ECHO
3.3V/5V  ───────→ VCC
GND      ───────→ GND

Optional Buzzer:
GPIO 14  ───────→ Buzzer (+)
GND      ───────→ Buzzer (-)

To upload code:
IO0 (GPIO0) ──── GND  (hold during upload, release after)
```

## Upload Steps

1. Wire IO0 to GND
2. Connect USB-TTL programmer (3.3V logic)
3. Press RESET on board
4. Upload from Arduino IDE
5. After upload: disconnect IO0 from GND, press RESET again

## Configuration (top of .ino file)

```cpp
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* API_BASE_URL  = "https://your-backend.onrender.com";
const char* USER_ID       = "your-user-uuid-from-supabase";
```

## What it does

- Captures JPEG image every 5 seconds and POSTs to `/posture/analyze`
- Measures distance every 3 seconds and POSTs to `/distance/log`
- Optional buzzer alerts for bad posture or close distance
- Reconnects WiFi automatically if disconnected
