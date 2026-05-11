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

// 1. Wi-Fi
const char* WIFI_SSID     = "P.PHSK";
const char* WIFI_PASSWORD = "Pphongsagon47.";

// 2. MQTT
const char* MQTT_SERVER   = "862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;
const char* MQTT_USERNAME = "GreenCropnat";
const char* MQTT_PASSWORD = "GreenCropnat123456";
const char* TOPIC_CONTROL = "smartfarm/control";
const char* TOPIC_SENSORS = "smartfarm/sensors";
const char* PROJECT_NAME  = "GreenCrop NAT IoT";
const char* DEVICE_ID     = "GREENCROP01";
const char* DEVICE_LABEL  = "GreenCrop WLS Pump 01";
const char* PAIRING_CODE      = "123456";
const char* DEFAULT_TENANT_ID = "public";

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// 3. กำหนดขา Input
int pinWLS1  = D1;  // Water Level Sensor 1 (ตัวล่าง)
int pinWLS2  = D6;  // Water Level Sensor 2 (ตัวบน)
int pinFloat = 3;   // สวิตช์ลูกลอย (ต่อเข้าขา RX ของบอร์ด ซึ่งตรงกับ GPIO3)
int pinStart = D2;  // ปุ่ม Start (NO)
int pinStop  = D5;  // ปุ่ม Stop (NC)

// 4. กำหนดขา Output
int relayPump1 = D4;  // รีเลย์ปั๊ม 1
int relayPump2 = D0;  // รีเลย์ปั๊ม 2 และ ไฟเหลือง (พ่วงขากัน)
int relayGreen = D7;  // รีเลย์ไฟเขียว
int relayRed   = D3;  // รีเลย์ไฟแดง
int pinISD     = D8;  // สั่งเสียง (ขา P-L)

// 5. ตัวแปรเก็บสถานะ
int  pump2Status = 0;      // สถานะปั๊ม 2 (0 = ดับ, 1 = ทำงาน)
bool isLocked    = false;  // สถานะล็อคระบบ (Safety Interlock)
bool webStartCommand = false;
bool webStopCommand  = false;
bool isDevicePaired  = false;
String activeTenantId = DEFAULT_TENANT_ID;
unsigned long pump2StartedAtMs              = 0;
unsigned long accumulatedPump2UptimeSeconds = 0;
unsigned long lastPublishMs                 = 0;

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

bool messageTargetsThisDevice(const String& msg) {
  const String targetDeviceId = readJsonStringValue(msg, "device_id");
  if (targetDeviceId.length() == 0) {
    return true;
  }
  return targetDeviceId == DEVICE_ID;
}

unsigned long currentUptimeSeconds() {
  if (pump2Status != 1 || pump2StartedAtMs == 0) {
    return accumulatedPump2UptimeSeconds;
  }
  return accumulatedPump2UptimeSeconds + ((millis() - pump2StartedAtMs) / 1000);
}

void turnOffAllOutputs() {
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayPump2, HIGH);
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);
}

void startPump2() {
  pump2Status = 1;
  pump2StartedAtMs = millis();
}

void stopPump2() {
  if (pump2Status == 1) {
    accumulatedPump2UptimeSeconds = currentUptimeSeconds();
  }
  pump2Status = 0;
  pump2StartedAtMs = 0;
}

void stopAndLock() {
  stopPump2();
  isLocked = true;
  turnOffAllOutputs();
}

void applyPairingMessage(String msg) {
  const bool statusPaired = msg.indexOf("PAIRED") >= 0 || msg.indexOf("\"paired\"") >= 0;
  const bool codeMatches = msg.indexOf(PAIRING_CODE) >= 0;
  const String tenantFromWeb = readJsonStringValue(msg, "tenant_id");

  if (!statusPaired || !codeMatches || tenantFromWeb.length() == 0) return;

  activeTenantId = tenantFromWeb;
  isDevicePaired = true;

  String tenantControlTopic = deviceTopic("control");
  mqttClient.subscribe(tenantControlTopic.c_str());

  String statusTopic = pairingTopic();
  statusTopic += "/status";

  String response = "{";
  response += "\"project\":\"";      response += PROJECT_NAME;   response += "\",";
  response += "\"status\":\"PAIRED\",";
  response += "\"device_id\":\"";    response += DEVICE_ID;      response += "\",";
  response += "\"device_label\":\""; response += DEVICE_LABEL;   response += "\",";
  response += "\"tenant_id\":\"";    response += activeTenantId; response += "\",";
  response += "\"pairing_code\":\""; response += PAIRING_CODE;   response += "\"";
  response += "}";

  mqttClient.publish(statusTopic.c_str(), response.c_str());
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

  if (String(topic) == pairingTopic()) {
    applyPairingMessage(msg);
    return;
  }

  if (!messageTargetsThisDevice(msg)) {
    return;
  }

  if (msg.indexOf("PUMP2_ON") >= 0 || msg.indexOf("START") >= 0) {
    webStartCommand = true;
  }

  if (msg.indexOf("PUMP2_OFF") >= 0 || msg.indexOf("STOP") >= 0) {
    webStopCommand = true;
  }

  if (msg.indexOf("RESET_UPTIME") >= 0) {
    accumulatedPump2UptimeSeconds = 0;
    pump2StartedAtMs = (pump2Status == 1) ? millis() : 0;
  }
}

void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWifi();
  }

  if (mqttClient.connected()) return;

  String clientId = "greencrop_nodemcu_";
  clientId += String(ESP.getChipId(), HEX);

  if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
    mqttClient.subscribe(TOPIC_CONTROL);
    subscribePairingTopics();

    if (useTenantTopic()) {
      String tenantControlTopic = deviceTopic("control");
      mqttClient.subscribe(tenantControlTopic.c_str());
    }
  } else {
    delay(2000);
  }
}

void publishStatus(
  int stateWLS1,
  int stateWLS2,
  int stateFloat,
  int stateStart,
  int stateStop
) {
  const bool pump1On = !isLocked && stateWLS2 != HIGH && stateWLS1 == HIGH;
  const bool greenOn = !isLocked && pump2Status == 0 && stateWLS2 == HIGH;
  const bool redOn = !isLocked && stateFloat == LOW;

  String payload = "{";
  payload += "\"project\":\"";        payload += PROJECT_NAME;                      payload += "\",";
  payload += "\"device_id\":\"";      payload += DEVICE_ID;                         payload += "\",";
  payload += "\"device_label\":\"";   payload += DEVICE_LABEL;                      payload += "\",";
  payload += "\"tenant_id\":\"";      payload += activeTenantId;                    payload += "\",";
  payload += "\"pairing_status\":\""; payload += isDevicePaired ? "paired" : "waiting"; payload += "\",";
  payload += "\"wls1\":";             payload += boolText(stateWLS1 == HIGH);       payload += ",";
  payload += "\"wls2\":";             payload += boolText(stateWLS2 == HIGH);       payload += ",";
  payload += "\"float_alarm\":";      payload += boolText(stateFloat == LOW);       payload += ",";
  payload += "\"start_button\":";     payload += boolText(stateStart == LOW);       payload += ",";
  payload += "\"stop_button\":";      payload += boolText(stateStop == HIGH);       payload += ",";
  payload += "\"locked\":";           payload += boolText(isLocked);                payload += ",";
  payload += "\"pump1_on\":";         payload += boolText(pump1On);                 payload += ",";
  payload += "\"pump2_on\":";         payload += boolText(pump2Status == 1);        payload += ",";
  payload += "\"green_on\":";         payload += boolText(greenOn);                 payload += ",";
  payload += "\"red_on\":";           payload += boolText(redOn);                   payload += ",";
  payload += "\"is_on\":";            payload += boolText(pump1On || pump2Status == 1); payload += ",";
  payload += "\"uptime_seconds\":";   payload += String(currentUptimeSeconds());
  payload += "}";

  mqttClient.publish(TOPIC_SENSORS, payload.c_str());

  if (useTenantTopic()) {
    String tenantSensorsTopic = deviceTopic("sensors");
    mqttClient.publish(tenantSensorsTopic.c_str(), payload.c_str());
  }
}

void setup() {
  // ข้อควรระวัง: ห้ามใส่คำสั่ง Serial.begin() ในโค้ดนี้
  // เพราะเราดึงขา RX มาใช้เป็น Input สำหรับสวิตช์ลูกลอยแล้ว
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

  turnOffAllOutputs();
  setupWifi();

  espClient.setInsecure();
  mqttClient.setBufferSize(1024);
  mqttClient.setKeepAlive(30);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  // --- อ่านค่า Input ---
  int stateWLS1  = digitalRead(pinWLS1);
  int stateWLS2  = digitalRead(pinWLS2);
  int stateFloat = digitalRead(pinFloat);
  int stateStart = digitalRead(pinStart);
  int stateStop  = digitalRead(pinStop);

  // กด STOP แบบ NC หรือสั่ง STOP จาก MQTT -> ล็อคระบบ
  if (stateStop == HIGH || webStopCommand) {
    webStopCommand = false;
    stopAndLock();
  } else {
    // ตรวจสอบการ "ปลดล็อค" : ถ้าระดับน้ำถึง WLS2 ให้ปลดล็อค
    if (stateWLS2 == HIGH) {
      isLocked = false;
    }

    if (isLocked == true) {
      // [โหมดติดล็อค] ทุกอย่างหยุดนิ่ง รอจนกว่าน้ำจะถึง WLS2
      turnOffAllOutputs();
    } else {
      // [โหมดปกติ]
      if (stateWLS2 == HIGH) {
        digitalWrite(relayPump1, HIGH);
      } else if (stateWLS1 == HIGH) {
        digitalWrite(relayPump1, LOW);
      } else {
        digitalWrite(relayPump1, HIGH);
      }

      // กดมือหรือสั่งผ่าน MQTT ให้ปั๊ม 2 ทำงานค้าง
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
