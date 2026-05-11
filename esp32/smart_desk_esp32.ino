/*
 * SmartDesk ESP32-CAM Firmware
 * =============================
 * Hardware:
 *   - ESP32-CAM (AI-Thinker module)
 *   - HC-SR04 Ultrasonic Sensor
 *     TRIG → GPIO 12
 *     ECHO → GPIO 13
 *   - Optional: Buzzer → GPIO 14
 *   - Optional: LED   → GPIO 4 (built-in flash LED)
 *
 * ONLY change: WIFI_SSID, WIFI_PASSWORD, API_BASE_URL, USER_ID
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <ESPmDNS.h>

// ─── USER CONFIGURATION ─────────────────────────────────────
const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* API_BASE_URL   = "https://your-backend.onrender.com"; // No trailing slash
const char* USER_ID        = "your-supabase-user-uuid";
const char* DEVICE_HOSTNAME = "smartdesk-cam";
// ─────────────────────────────────────────────────────────────

// Pin definitions
#define TRIG_PIN       12
#define ECHO_PIN       13
#define BUZZER_PIN     14
#define LED_PIN         4   // Flash LED (active HIGH)
#define HAS_BUZZER     false  // Set true if buzzer is wired

// Timing
#define IMAGE_INTERVAL_MS    5000
#define DISTANCE_INTERVAL_MS 3000
#define RECONNECT_INTERVAL_MS 10000

// Camera config (AI-Thinker ESP32-CAM)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastImageTime    = 0;
unsigned long lastDistanceTime = 0;
unsigned long lastReconnect    = 0;

bool cameraReady = false;
bool httpServerStarted = false;
bool mdnsStarted = false;
WebServer server(80);

void ensureNetworkServices();
void handleRoot();
void handleHealth();
void handleCapture();

// ─── SETUP ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[SmartDesk] Booting...");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  if (HAS_BUZZER) pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  initCamera();
  connectWiFi();
  ensureNetworkServices();

  Serial.println("[SmartDesk] Ready.");
}

// ─── LOOP ────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    mdnsStarted = false;
    unsigned long now = millis();
    if (now - lastReconnect > RECONNECT_INTERVAL_MS) {
      lastReconnect = now;
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
      delay(5000);
    }
    return;
  }

  ensureNetworkServices();
  server.handleClient();

  unsigned long now = millis();

  if (now - lastDistanceTime >= DISTANCE_INTERVAL_MS) {
    lastDistanceTime = now;
    float dist = measureDistance();
    if (dist > 0) {
      Serial.printf("[Distance] %.1f cm\n", dist);
      sendDistance(dist);
      if (dist < 20 && HAS_BUZZER) {
        beepBuzzer(3, 100);
      } else if (dist < 40 && HAS_BUZZER) {
        beepBuzzer(1, 200);
      }
    }
  }

  if (now - lastImageTime >= IMAGE_INTERVAL_MS) {
    lastImageTime = now;
    if (cameraReady) {
      captureAndSend();
    }
  }
}

// ─── WIFI ────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Failed to connect. Will retry in loop.");
  }
}

void ensureNetworkServices() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!mdnsStarted && MDNS.begin(DEVICE_HOSTNAME)) {
    MDNS.addService("http", "tcp", 80);
    Serial.printf("[mDNS] Hostname: http://%s.local\n", DEVICE_HOSTNAME);
    mdnsStarted = true;
  } else if (!mdnsStarted) {
    Serial.println("[mDNS] Failed to start.");
  }

  if (!httpServerStarted) {
    server.on("/", HTTP_GET, handleRoot);
    server.on("/capture", HTTP_GET, handleCapture);
    server.on("/health", HTTP_GET, handleHealth);
    server.begin();

    httpServerStarted = true;
    Serial.println("[HTTP] Camera server started on port 80.");
  }
}

void handleRoot() {
  String html =
    "<!doctype html><html><head><meta charset='utf-8'>"
    "<title>SmartDesk ESP32-CAM</title></head><body>"
    "<h2>SmartDesk ESP32-CAM</h2>"
    "<p>Snapshot endpoint: <a href='/capture'>/capture</a></p>"
    "<img src='/capture' style='max-width:100%;height:auto;border-radius:12px' />"
    "</body></html>";
  server.send(200, "text/html", html);
}

void handleHealth() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void handleCapture() {
  if (!cameraReady) {
    server.send(503, "text/plain", "Camera not ready");
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Capture failed");
    return;
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  server.setContentLength(fb->len);
  server.send(200, "image/jpeg", "");
  WiFiClient client = server.client();
  client.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

// ─── CAMERA ──────────────────────────────────────────────────
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA;  // 320x240 — good balance
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[Camera] Init failed: 0x%x\n", err);
    cameraReady = false;
    return;
  }

  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 1);
    s->set_contrast(s, 1);
    s->set_saturation(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 1);
  }

  cameraReady = true;
  Serial.println("[Camera] Initialized OK.");
}

// ─── CAPTURE & SEND IMAGE ────────────────────────────────────
void captureAndSend() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[Camera] Capture failed.");
    return;
  }

  Serial.printf("[Camera] Captured %d bytes. Sending...\n", fb->len);

  // Flash LED briefly during send
  digitalWrite(LED_PIN, HIGH);

  HTTPClient http;
  String url = String(API_BASE_URL) + "/posture/analyze";
  http.begin(url);
  http.setTimeout(15000);

  // Build multipart form manually
  String boundary = "----ESP32Boundary";
  String bodyStart =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"user_id\"\r\n\r\n" +
    String(USER_ID) + "\r\n" +
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"image\"; filename=\"frame.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  String bodyEnd = "\r\n--" + boundary + "--\r\n";

  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  int totalLen = bodyStart.length() + fb->len + bodyEnd.length();
  http.addHeader("Content-Length", String(totalLen));

  // Custom streaming send
  WiFiClient* stream = http.getStreamPtr();
  if (stream) {
    stream->print(bodyStart);
    stream->write(fb->buf, fb->len);
    stream->print(bodyEnd);
  }

  int httpCode = http.POST((uint8_t*)NULL, 0);

  if (httpCode == 200) {
    String resp = http.getString();
    DynamicJsonDocument doc(512);
    if (deserializeJson(doc, resp) == DeserializationError::Ok) {
      const char* posture = doc["posture"];
      bool warning = doc["warning"];
      Serial.printf("[Posture] Result: %s | Warning: %s\n", posture, warning ? "YES" : "no");
      if (warning && HAS_BUZZER) {
        beepBuzzer(2, 150);
      }
    }
  } else {
    Serial.printf("[Posture] HTTP error: %d\n", httpCode);
  }

  digitalWrite(LED_PIN, LOW);
  http.end();
  esp_camera_fb_return(fb);
}

// ─── DISTANCE SENSOR ─────────────────────────────────────────
float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1.0;

  float distance = duration * 0.0343 / 2.0;
  if (distance > 400 || distance < 2) return -1.0; // Out of sensor range

  return distance;
}

void sendDistance(float distanceCm) {
  HTTPClient http;
  String url = String(API_BASE_URL) + "/distance/log";
  http.begin(url);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(128);
  doc["user_id"]     = USER_ID;
  doc["distance_cm"] = distanceCm;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    String resp = http.getString();
    DynamicJsonDocument rDoc(256);
    if (deserializeJson(rDoc, resp) == DeserializationError::Ok) {
      bool safe = rDoc["is_safe"];
      Serial.printf("[Distance] API: %.1f cm — %s\n", distanceCm, safe ? "SAFE" : "WARNING");
    }
  } else {
    Serial.printf("[Distance] HTTP error: %d\n", httpCode);
  }
  http.end();
}

// ─── BUZZER ──────────────────────────────────────────────────
void beepBuzzer(int times, int durationMs) {
  if (!HAS_BUZZER) return;
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(100);
  }
}
