/*
  GreenCrop NodeMCU MQTT Firmware

  Board: NodeMCU 1.0 (ESP-12E Module)
  Libraries:
    - ESP8266WiFi
    - PubSubClient

  Important:
    - This version uses RX/GPIO3 as pinFloat.
    - Do not use Serial.begin() or Serial Monitor while RX is connected.
    - Relay outputs are active-low: LOW = ON, HIGH = OFF.
*/

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ==================================================
// 1. Wi-Fi
// ==================================================
const char* WIFI_SSID = "Aongjiw600_2.4G";
const char* WIFI_PASSWORD = "aongangnepjiw";

// ==================================================
// 2. MQTT + GreenCrop pairing identity
// ==================================================
const char* MQTT_SERVER = "7f5983ba29c642f395377d55999a95ed.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "GreenCropnat";
const char* MQTT_PASSWORD = "GreenCropnat123456";
const char* TOPIC_CONTROL = "smartfarm/control";
const char* TOPIC_SENSORS = "smartfarm/sensors";
const char* TOPIC_DEBUG = "smartfarm/debug";
const char* PROJECT_NAME = "GreenCrop NAT IoT";
const char* DEVICE_ID = "GREENCROP01";
const char* DEVICE_LABEL = "GreenCrop WLS Pump 01";
const char* PAIRING_CODE = "123456";
const char* DEFAULT_TENANT_ID = "public";
const uint16_t MQTT_BUFFER_SIZE = 512;

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ==================================================
// 3. Input pins - logic ล่าสุด
// ==================================================
int pinWLS1 = D1;     // Water Level Sensor 1 ตัวล่าง
int pinWLS2 = D6;     // Water Level Sensor 2 ตัวบน
int pinFloat = 3;     // ลูกลอย ใช้ RX/GPIO3
int pinStart = D2;    // ปุ่ม Start แบบ NO
int pinStop = D5;     // ปุ่ม Stop แบบ NC

// ==================================================
// 4. Output pins - logic ล่าสุด
// ==================================================
int relayPump1 = D4;  // ปั๊ม 1
int relayPump2 = D0;  // ปั๊ม 2 + ไฟเหลือง
int relayGreen = D7;  // ไฟเขียว
int relayRed = D3;    // ไฟแดง
int pinISD = D8;      // เสียง ISD1820 P-L

// ==================================================
// 5. Machine state
// ==================================================
int pump2Status = 0;      // 0 = ปั๊ม 2 ดับ, 1 = ปั๊ม 2 ทำงาน
bool isLocked = false;    // Safety interlock

bool webStartCommand = false;
bool webStopCommand = false;

bool isDevicePaired = false;
String activeTenantId = DEFAULT_TENANT_ID;

unsigned long pump2StartedAtMs = 0;
unsigned long accumulatedPump2UptimeSeconds = 0;
unsigned long lastPublishMs = 0;
unsigned long lastMqttRetryLogMs = 0;

const char* boolText(bool value) {
  return value ? "true" : "false";
}

String deviceTopic(const char* channel) {
  String topic = "tenants/";
  topic += activeTenantId;
  topic += "/devices/";
  topic += DEVICE_ID;
  topic += "/";
  topic += channel;
  return topic;
}

String pairingTopic() {
  String topic = "greencrop/devices/";
  topic += DEVICE_ID;
  topic += "/pairing";
  return topic;
}

bool useTenantTopic() {
  return activeTenantId.length() > 0 && activeTenantId != "public";
}

String readJsonStringValue(String msg, const char* key) {
  String marker = "\"";
  marker += key;
  marker += "\":\"";
  int start = msg.indexOf(marker);
  if (start < 0) return "";
  start += marker.length();
  int end = msg.indexOf("\"", start);
  if (end < 0) return "";
  return msg.substring(start, end);
}

unsigned long currentUptimeSeconds() {
  if (pump2Status != 1 || pump2StartedAtMs == 0) {
    return accumulatedPump2UptimeSeconds;
  }

  return accumulatedPump2UptimeSeconds + ((millis() - pump2StartedAtMs) / 1000);
}

void publishDebug(const char* eventName, const String& detail = "") {
  if (!mqttClient.connected()) {
    return;
  }

  String payload = "{";
  payload += "\"project\":\"";
  payload += PROJECT_NAME;
  payload += "\",";
  payload += "\"device_id\":\"";
  payload += DEVICE_ID;
  payload += "\",";
  payload += "\"event\":\"";
  payload += eventName;
  payload += "\",";
  payload += "\"detail\":\"";
  payload += detail;
  payload += "\"";
  payload += "}";

  mqttClient.publish(TOPIC_DEBUG, payload.c_str());
}

void turnOffAll() {
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayPump2, HIGH);
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);
}

void startPump2() {
  if (isLocked || pump2Status == 1) {
    return;
  }

  pump2Status = 1;
  pump2StartedAtMs = millis();
}

void stopAndLock() {
  if (pump2Status == 1) {
    accumulatedPump2UptimeSeconds = currentUptimeSeconds();
  }

  pump2Status = 0;
  pump2StartedAtMs = 0;
  isLocked = true;
  turnOffAll();
}

void applyPairingMessage(String msg) {
  const bool statusPaired = msg.indexOf("PAIRED") >= 0 || msg.indexOf("\"paired\"") >= 0;
  const bool codeMatches = msg.indexOf(PAIRING_CODE) >= 0;
  const String tenantFromWeb = readJsonStringValue(msg, "tenant_id");

  if (!statusPaired || !codeMatches || tenantFromWeb.length() == 0) {
    return;
  }

  activeTenantId = tenantFromWeb;
  isDevicePaired = true;

  String tenantControlTopic = deviceTopic("control");
  mqttClient.subscribe(tenantControlTopic.c_str());
  publishDebug("tenant_control_subscribed", tenantControlTopic);

  String statusTopic = pairingTopic();
  statusTopic += "/status";

  String response = "{";
  response += "\"project\":\"";
  response += PROJECT_NAME;
  response += "\",";
  response += "\"status\":\"PAIRED\",";
  response += "\"device_id\":\"";
  response += DEVICE_ID;
  response += "\",";
  response += "\"device_label\":\"";
  response += DEVICE_LABEL;
  response += "\",";
  response += "\"tenant_id\":\"";
  response += activeTenantId;
  response += "\",";
  response += "\"pairing_code\":\"";
  response += PAIRING_CODE;
  response += "\"";
  response += "}";

  mqttClient.publish(statusTopic.c_str(), response.c_str());
  publishDebug("device_paired", activeTenantId);
}

void subscribePairingTopics() {
  String topic = pairingTopic();
  mqttClient.subscribe(topic.c_str());
}

void setupWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  publishDebug("mqtt_message_received", String(topic));

  if (String(topic) == pairingTopic()) {
    applyPairingMessage(msg);
  }

  // เว็บกดปุ่มเปิด: START = ทำเหมือนกดปุ่ม Start จริง -> ปั๊ม 2 ค้างสถานะ
  if (msg.indexOf("START") >= 0) {
    webStartCommand = true;
  }

  // เว็บกดปุ่มปิด: STOP = ทำเหมือนปุ่ม Stop NC -> หยุดและล็อค
  if (msg.indexOf("STOP") >= 0) {
    webStopCommand = true;
  }

  if (msg.indexOf("RESET_UPTIME") >= 0) {
    accumulatedPump2UptimeSeconds = 0;
    pump2StartedAtMs = pump2Status == 1 ? millis() : 0;
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    String clientId = "greencrop_nodemcu_";
    clientId += String(ESP.getChipId(), HEX);

    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      mqttClient.subscribe(TOPIC_CONTROL);
      subscribePairingTopics();
      publishDebug("mqtt_connected", clientId);

      if (useTenantTopic()) {
        String tenantControlTopic = deviceTopic("control");
        mqttClient.subscribe(tenantControlTopic.c_str());
        publishDebug("tenant_control_subscribed", tenantControlTopic);
      }
    } else {
      if (millis() - lastMqttRetryLogMs >= 2000) {
        lastMqttRetryLogMs = millis();
      }
      delay(2000);
    }
  }
}

void publishStatus(
  int stateWLS1,
  int stateWLS2,
  int stateFloat,
  int stateStart,
  int stateStop
) {
  const bool pump1On = !isLocked && stateWLS1 == HIGH && stateWLS2 != HIGH;
  const bool alarmOn = !isLocked && stateFloat == LOW;

  String payload = "{";
  payload += "\"project\":\"";
  payload += PROJECT_NAME;
  payload += "\",";
  payload += "\"device_id\":\"";
  payload += DEVICE_ID;
  payload += "\",";
  payload += "\"device_label\":\"";
  payload += DEVICE_LABEL;
  payload += "\",";
  payload += "\"tenant_id\":\"";
  payload += activeTenantId;
  payload += "\",";
  payload += "\"pairing_status\":\"";
  payload += isDevicePaired ? "paired" : "waiting";
  payload += "\",";
  payload += "\"pressure\":0,";
  payload += "\"flow_rate\":0,";
  payload += "\"ec_value\":0,";
  payload += "\"active_tank\":0,";
  payload += "\"wls1\":";
  payload += boolText(stateWLS1 == HIGH);
  payload += ",";
  payload += "\"wls2\":";
  payload += boolText(stateWLS2 == HIGH);
  payload += ",";
  payload += "\"float_alarm\":";
  payload += boolText(stateFloat == LOW);
  payload += ",";
  payload += "\"start_button\":";
  payload += boolText(stateStart == LOW);
  payload += ",";
  payload += "\"stop_button\":";
  payload += boolText(stateStop == HIGH);
  payload += ",";
  payload += "\"locked\":";
  payload += boolText(isLocked);
  payload += ",";
  payload += "\"pump1_on\":";
  payload += boolText(pump1On);
  payload += ",";
  payload += "\"pump2_on\":";
  payload += boolText(pump2Status == 1);
  payload += ",";
  payload += "\"alarm_on\":";
  payload += boolText(alarmOn);
  payload += ",";
  payload += "\"is_on\":";
  payload += boolText(pump1On || pump2Status == 1);
  payload += ",";
  payload += "\"uptime_seconds\":";
  payload += String(currentUptimeSeconds());
  payload += ",";
  payload += "\"pumps\":[";
  payload += pump1On ? "1" : "0";
  payload += ",";
  payload += pump2Status == 1 ? "1" : "0";
  payload += ",0,0,0]";
  payload += "}";

  mqttClient.publish(TOPIC_SENSORS, payload.c_str());
  publishDebug("status_published", TOPIC_SENSORS);

  if (useTenantTopic()) {
    String tenantSensorsTopic = deviceTopic("sensors");
    mqttClient.publish(tenantSensorsTopic.c_str(), payload.c_str());
    publishDebug("tenant_status_published", tenantSensorsTopic);
  }
}

void setup() {
  // ห้ามใช้ Serial.begin() เพราะ pinFloat ใช้ RX/GPIO3

  pinMode(pinWLS1, INPUT);
  pinMode(pinWLS2, INPUT);
  pinMode(pinFloat, INPUT_PULLUP);

  pinMode(pinStart, INPUT_PULLUP);
  pinMode(pinStop, INPUT_PULLUP);

  pinMode(relayPump1, OUTPUT);
  pinMode(relayPump2, OUTPUT);
  pinMode(relayGreen, OUTPUT);
  pinMode(relayRed, OUTPUT);
  pinMode(pinISD, OUTPUT);

  turnOffAll();

  setupWifi();

  // HiveMQ Cloud ใช้ TLS; setInsecure() ช่วยให้ต่อได้ง่ายบน ESP8266
  // โดยไม่ต้องฝัง certificate เพิ่มในบอร์ด
  espClient.setInsecure();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(MQTT_BUFFER_SIZE);
  mqttClient.setCallback(onMqttMessage);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  int stateWLS1 = digitalRead(pinWLS1);
  int stateWLS2 = digitalRead(pinWLS2);
  int stateFloat = digitalRead(pinFloat);
  int stateStart = digitalRead(pinStart);
  int stateStop = digitalRead(pinStop);

  // --------------------------------------------------
  // 1. Stop NC หรือ STOP จากเว็บ -> หยุดทุกอย่างและล็อค
  // --------------------------------------------------
  if (stateStop == HIGH || webStopCommand) {
    webStopCommand = false;
    stopAndLock();
  } else {
    // --------------------------------------------------
    // 2. ปลดล็อคเมื่อระดับน้ำถึง WLS2
    // --------------------------------------------------
    if (stateWLS2 == HIGH) {
      isLocked = false;
    }

    if (isLocked) {
      turnOffAll();
    } else {
      // --------------------------------------------------
      // 3. ปั๊ม 1 อัตโนมัติ:
      //    WLS1 HIGH แต่ WLS2 ยังไม่ HIGH -> ปั๊ม 1 ทำงาน
      // --------------------------------------------------
      if (stateWLS2 == HIGH) {
        digitalWrite(relayPump1, HIGH);
      } else if (stateWLS1 == HIGH) {
        digitalWrite(relayPump1, LOW);
      } else {
        digitalWrite(relayPump1, HIGH);
      }

      // --------------------------------------------------
      // 4. ปั๊ม 2 + ไฟเหลือง:
      //    Start จากปุ่มจริงหรือเว็บแล้วค้างสถานะ
      // --------------------------------------------------
      if (stateStart == LOW || webStartCommand) {
        startPump2();
      }
      webStartCommand = false;

      if (pump2Status == 1) {
        digitalWrite(relayPump2, LOW);
        digitalWrite(relayGreen, HIGH);
      } else {
        digitalWrite(relayPump2, HIGH);

        if (stateWLS2 == HIGH) {
          digitalWrite(relayGreen, LOW);
        } else {
          digitalWrite(relayGreen, HIGH);
        }
      }

      // --------------------------------------------------
      // 5. ลูกลอยระดับอันตราย -> ไฟแดง + เสียง
      // --------------------------------------------------
      if (stateFloat == LOW) {
        digitalWrite(relayRed, LOW);
        digitalWrite(pinISD, HIGH);
      } else {
        digitalWrite(relayRed, HIGH);
        digitalWrite(pinISD, LOW);
      }
    }
  }

  if (millis() - lastPublishMs >= 1000) {
    lastPublishMs = millis();
    publishStatus(stateWLS1, stateWLS2, stateFloat, stateStart, stateStop);
  }

  delay(50);
}
