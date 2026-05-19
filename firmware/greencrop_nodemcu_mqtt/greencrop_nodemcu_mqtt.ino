/*
  GreenCrop ESP32 MQTT Firmware
  Board: ESP32
  Libraries:
    - WiFi
    - WiFiClientSecure
    - PubSubClient
    - OneWire
    - DallasTemperature

  Logic:
    - ใช้ลอจิกการกดมือและการล็อคตามแมนวลล่าสุด
    - รีเลย์เป็นแบบ Active LOW: LOW = ON, HIGH = OFF
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

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

// ==========================================
// 3. ตั้งค่าอุปกรณ์และขาพอร์ต (ESP32)
// ==========================================
const int pinTemp = 4;
OneWire oneWire(pinTemp);
DallasTemperature tempSensor(&oneWire);

// ขา Input (ดิจิตอล)
const int pinWLS1 = 13;
const int pinWLS2 = 14;
const int pinStart = 27;  // ปุ่ม Start (NO)
const int pinStop = 26;   // ปุ่ม Stop (NC)
const int pinFloat = 25;  // ลูกลอยถัง 2

// ขา Input (แอนะล็อก)
const int pinPH = 32;
const int pinTDS = 34;

// ขา Output
const int relayPump1 = 33;
const int relayPump2 = 5;   // ปั๊ม 2 + ไฟเหลือง
const int relayGreen = 18;
const int relayRed = 19;
const int pinISD = 23;

// ==========================================
// 4. ตัวแปรสถานะระบบ
// ==========================================
int pump2Status = 0;    // 0 = หยุด, 1 = ทำงาน
bool isLocked = false;  // false = ปกติ, true = Emergency lock
bool webStartCommand = false;
bool webStopCommand = false;
bool webPump2OffCommand = false;
bool isDevicePaired = false;
String activeTenantId = DEFAULT_TENANT_ID;

float pH_Value = 0.0;
float EC_Value = 0.0;
float temp_Value = 25.0;

unsigned long pump2StartedAtMs = 0;
unsigned long accumulatedPump2UptimeSeconds = 0;
unsigned long lastPublishMs = 0;
unsigned long lastSerialUpdateMs = 0;

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

String readJsonStringValue(const String& msg, const char* key) {
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

bool isPump1AllowedByPh() {
  return pH_Value >= 6.5 && pH_Value <= 7.5;
}

bool isStopPressed(int stateStop) {
  return stateStop == HIGH;  // ปุ่ม Stop เป็น NC ตามแมนวลล่าสุด
}

void turnOffAllOutputs() {
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayPump2, HIGH);
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);
}

void startPump2() {
  if (pump2Status == 1) return;
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

void readSensors() {
  tempSensor.requestTemperatures();
  temp_Value = tempSensor.getTempCByIndex(0);
  if (temp_Value < 0.0 || temp_Value == DEVICE_DISCONNECTED_C) {
    temp_Value = 25.0;
  }

  const float voltagePH = analogRead(pinPH) * (3.3f / 4095.0f);
  pH_Value = (-5.70f * voltagePH) + 21.34f;
  if (pH_Value < 0.0f) pH_Value = 0.0f;
  if (pH_Value > 14.0f) pH_Value = 14.0f;

  const float voltageTDS = analogRead(pinTDS) * (3.3f / 4095.0f);
  const float compCoeff = 1.0f + 0.02f * (temp_Value - 25.0f);
  const float compVoltage = voltageTDS / compCoeff;
  const float tds = (133.42f * pow(compVoltage, 3) - 255.86f * pow(compVoltage, 2) + 857.39f * compVoltage) * 0.5f;
  EC_Value = (tds * 2.0f) / 1000.0f;
}

void applyPairingMessage(const String& msg) {
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

  if (msg.indexOf("PUMP2_OFF") >= 0) {
    webPump2OffCommand = true;
  }

  if (msg.indexOf("STOP") >= 0) {
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

  uint64_t chipId = ESP.getEfuseMac();
  String clientId = "greencrop_esp32_";
  clientId += String((uint32_t)(chipId >> 24), HEX);

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
  const bool stopPressed = isStopPressed(stateStop);
  const bool pump1On = !isLocked && stateWLS2 != HIGH && stateWLS1 == HIGH && isPump1AllowedByPh();
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
  payload += "\"stop_button\":";      payload += boolText(stopPressed);              payload += ",";
  payload += "\"locked\":";           payload += boolText(isLocked);                 payload += ",";
  payload += "\"pump1_on\":";         payload += boolText(pump1On);                  payload += ",";
  payload += "\"pump2_on\":";         payload += boolText(pump2Status == 1);         payload += ",";
  payload += "\"green_on\":";         payload += boolText(greenOn);                  payload += ",";
  payload += "\"red_on\":";           payload += boolText(redOn);                    payload += ",";
  payload += "\"ph_value\":";         payload += String(pH_Value, 2);                payload += ",";
  payload += "\"ec_value\":";         payload += String(EC_Value, 2);                payload += ",";
  payload += "\"temp_c\":";           payload += String(temp_Value, 1);              payload += ",";
  payload += "\"ph_ok\":";            payload += boolText(isPump1AllowedByPh());     payload += ",";
  payload += "\"is_on\":";            payload += boolText(pump1On || pump2Status == 1); payload += ",";
  payload += "\"uptime_seconds\":";   payload += String(currentUptimeSeconds());
  payload += "}";

  mqttClient.publish(TOPIC_SENSORS, payload.c_str());

  if (useTenantTopic()) {
    String tenantSensorsTopic = deviceTopic("sensors");
    mqttClient.publish(tenantSensorsTopic.c_str(), payload.c_str());
  }
}

void printSerialStatus() {
  Serial.println("=============================");
  Serial.print("pH Value : ");
  Serial.println(pH_Value, 2);
  Serial.print("EC Value : ");
  Serial.print(EC_Value, 2);
  Serial.println(" mS/cm");
  Serial.print("Temp T2  : ");
  Serial.print(temp_Value, 1);
  Serial.println(" C");
  Serial.print("System Status: ");
  if (isLocked) {
    Serial.println("LOCKED! (Emergency Stop)");
  } else if (pump2Status == 1) {
    Serial.println("PUMP 2 RUNNING (Manual)");
  } else {
    Serial.println("NORMAL (Standby/Pump 1 Auto)");
  }
  Serial.println("=============================");
}

void setup() {
  Serial.begin(9600);
  tempSensor.begin();

  pinMode(pinWLS1, INPUT_PULLDOWN);
  pinMode(pinWLS2, INPUT_PULLDOWN);
  pinMode(pinStart, INPUT_PULLUP);
  pinMode(pinStop, INPUT_PULLUP);
  pinMode(pinFloat, INPUT_PULLUP);

  pinMode(relayPump1, OUTPUT);
  pinMode(relayPump2, OUTPUT);
  pinMode(relayGreen, OUTPUT);
  pinMode(relayRed, OUTPUT);
  pinMode(pinISD, OUTPUT);

  turnOffAllOutputs();
  setupWifi();

  espClient.setInsecure();
  mqttClient.setBufferSize(1536);
  mqttClient.setKeepAlive(30);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  Serial.println("System Ready... Start Reading Sensors.");
  delay(1000);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  const int stateWLS1 = digitalRead(pinWLS1);
  const int stateWLS2 = digitalRead(pinWLS2);
  const int stateStart = digitalRead(pinStart);
  const int stateStop = digitalRead(pinStop);
  const int stateFloat = digitalRead(pinFloat);

  readSensors();

  if (isStopPressed(stateStop) || webStopCommand) {
    webStopCommand = false;
    stopAndLock();
  } else {
    if (stateWLS2 == HIGH) {
      isLocked = false;
    }

    if (isLocked) {
      turnOffAllOutputs();
    } else {
      if (stateWLS2 == HIGH) {
        digitalWrite(relayPump1, HIGH);
      } else if (stateWLS1 == HIGH && isPump1AllowedByPh()) {
        digitalWrite(relayPump1, LOW);
      } else {
        digitalWrite(relayPump1, HIGH);
      }

      if (stateStart == LOW || webStartCommand) {
        startPump2();
      }
      webStartCommand = false;

      if (webPump2OffCommand) {
        stopPump2();
      }
      webPump2OffCommand = false;

      if (pump2Status == 1) {
        digitalWrite(relayPump2, LOW);
      } else {
        digitalWrite(relayPump2, HIGH);
      }

      if (stateWLS2 == HIGH && pump2Status == 0) {
        digitalWrite(relayGreen, LOW);
      } else {
        digitalWrite(relayGreen, HIGH);
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

  if (millis() - lastSerialUpdateMs >= 500) {
    lastSerialUpdateMs = millis();
    printSerialStatus();
  }

  delay(50);
}
