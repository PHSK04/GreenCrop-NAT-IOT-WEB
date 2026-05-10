/*
  GreenCrop NodeMCU MQTT Firmware

  Board: NodeMCU 1.0 (ESP-12E Module)
  Libraries:
    - ESP8266WiFi
    - PubSubClient

  MQTT topics used by the GreenCrop web app:
    - Receive commands: smartfarm/control
    - Send status:      smartfarm/sensors

  Relay outputs are active-low:
    LOW  = ON
    HIGH = OFF
*/

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// ==================================================
// 1. ตั้งค่า Wi-Fi
//    แก้เฉพาะ 2 บรรทัดนี้ให้ตรงกับ Wi-Fi ที่บอร์ดจะใช้
// ==================================================
const char* WIFI_SSID = "   .......          ";
const char* WIFI_PASSWORD = "      .........       ";

// ==================================================
// 2. ตั้งค่า MQTT และข้อมูลประจำเครื่อง GreenCrop
//    DEVICE_ID และ PAIRING_CODE คือค่าที่ต้องกรอกในหน้า Pair Device
// ==================================================
const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* TOPIC_CONTROL = "smartfarm/control";
const char* TOPIC_SENSORS = "smartfarm/sensors";
const char* PROJECT_NAME = "GreenCrop NAT IoT";
const char* DEVICE_ID = "GREENCROP01";
const char* DEVICE_LABEL = "GreenCrop WLS Pump 01";
const char* PAIRING_CODE = "123456";
const char* DEFAULT_TENANT_ID = "public";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ==================================================
// 3. ขา Input จากโค้ดควบคุมเดิม
// ==================================================
int pinWLS1 = D1;   // Water Level Sensor 1: คุมไฟเขียว / ใช้ปลดล็อค
int pinWLS2 = D6;   // Water Level Sensor 2: คุมไฟแดงและเสียง
int pinStart = D2;  // ปุ่ม Start แบบ NO: กดแล้วอ่านได้ LOW
int pinStop = D5;   // ปุ่ม Stop แบบ NC: กด/วงจรเปิดแล้วอ่านได้ HIGH

// ==================================================
// 4. ขา Output จากโค้ดควบคุมเดิม
//    Relay เป็น Active-Low: LOW = ติด/ทำงาน, HIGH = ดับ/หยุด
// ==================================================
int relayGreen = D7;   // รีเลย์ไฟเขียว
int relayYellow = D0;  // รีเลย์ไฟเหลือง / ปั๊ม
int relayRed = D3;     // รีเลย์ไฟแดง
int pinISD = D8;       // ขาสั่งเล่นเสียงโมดูล ISD1820 (P-L)

// ==================================================
// 5. สถานะระบบควบคุมเครื่อง
// ==================================================
int systemStatus = 0;   // 0 = ปั๊มหยุด, 1 = ปั๊มเดิน
bool isLocked = false;  // false = ปกติ, true = ระบบติดล็อคหลัง Stop

// คำสั่งที่มาจากเว็บผ่าน MQTT จะถูกพักไว้ในตัวแปรนี้
bool webStartCommand = false;
bool webStopCommand = false;

// สถานะการจับคู่กับบัญชีสมาชิกบนเว็บ
bool isDevicePaired = false;
String activeTenantId = DEFAULT_TENANT_ID;

// ใช้คำนวณเวลาการทำงานของปั๊ม เพื่อส่งกลับเว็บ
unsigned long startedAtMs = 0;
unsigned long accumulatedUptimeSeconds = 0;
unsigned long lastPublishMs = 0;

// แปลง bool เป็นข้อความ true/false สำหรับประกอบ JSON
const char* boolText(bool value) {
  return value ? "true" : "false";
}

// สร้าง topic แบบแยกตามสมาชิกและอุปกรณ์:
// tenants/{tenantId}/devices/{deviceId}/control หรือ sensors
String deviceTopic(const char* channel) {
  String topic = "tenants/";
  topic += activeTenantId;
  topic += "/devices/";
  topic += DEVICE_ID;
  topic += "/";
  topic += channel;
  return topic;
}

// Topic สำหรับรับข้อความจากเว็บตอนกด Pair Device
String pairingTopic() {
  String topic = "greencrop/devices/";
  topic += DEVICE_ID;
  topic += "/pairing";
  return topic;
}

// ถ้ายังเป็น public จะใช้ topic กลางเพื่อทดสอบ
// ถ้าจับคู่แล้วจะใช้ topic แยกตามสมาชิก
bool useTenantTopic() {
  return activeTenantId.length() > 0 && activeTenantId != "public";
}

// อ่านค่า string ง่าย ๆ จาก JSON ที่เว็บส่งมา เช่น tenant_id
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

// แสดง Device ID และ Pairing Code ใน Serial Monitor
// เอาค่านี้ไปกรอกในหน้า Pair Device ของเว็บ
void printPairingInfo() {
  Serial.println();
  Serial.println("=== GreenCrop Device Pairing ===");
  Serial.print("Project: ");
  Serial.println(PROJECT_NAME);
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Device Name: ");
  Serial.println(DEVICE_LABEL);
  Serial.print("Pairing Code: ");
  Serial.println(PAIRING_CODE);
  Serial.print("Pairing Topic: ");
  Serial.println(pairingTopic());
  Serial.println("Enter this Device ID and Pairing Code on the GreenCrop web app.");
  Serial.println("================================");
  Serial.println();
}

// รับข้อความจับคู่จากเว็บ
// ถ้า pairing code ตรงกัน จะบันทึก tenant_id และตอบกลับเว็บว่า PAIRED
void applyPairingMessage(String msg) {
  const bool statusPaired = msg.indexOf("PAIRED") >= 0 || msg.indexOf("\"paired\"") >= 0;
  const bool codeMatches = msg.indexOf(PAIRING_CODE) >= 0;
  const String tenantFromWeb = readJsonStringValue(msg, "tenant_id");

  if (!statusPaired || !codeMatches || tenantFromWeb.length() == 0) {
    return;
  }

  activeTenantId = tenantFromWeb;
  isDevicePaired = true;

  Serial.println();
  Serial.println("=== GreenCrop Pairing Complete ===");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Paired Tenant ID: ");
  Serial.println(activeTenantId);
  Serial.print("Control Topic: ");
  Serial.println(deviceTopic("control"));
  Serial.println("Status: PAIRED");
  Serial.println("==================================");
  Serial.println();

  String tenantControlTopic = deviceTopic("control");
  mqttClient.subscribe(tenantControlTopic.c_str());

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
  Serial.print("Published pairing status: ");
  Serial.println(statusTopic);
}

// Subscribe topic สำหรับรอรับข้อความ Pair Device จากเว็บ
void subscribePairingTopics() {
  String topic = pairingTopic();
  mqttClient.subscribe(topic.c_str());
  Serial.print("Subscribed: ");
  Serial.println(topic);
}

// ปิดไฟ/ปั๊ม/เสียงทั้งหมด
void turnEverythingOff() {
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayYellow, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);
}

// คำนวณเวลารวมที่ปั๊มทำงาน
unsigned long currentUptimeSeconds() {
  if (systemStatus != 1 || startedAtMs == 0) {
    return accumulatedUptimeSeconds;
  }

  return accumulatedUptimeSeconds + ((millis() - startedAtMs) / 1000);
}

// เริ่มปั๊มจากปุ่มจริงหรือคำสั่งเว็บ
// ถ้าระบบล็อคอยู่ จะไม่ยอมเริ่ม
void startPump() {
  if (isLocked || systemStatus == 1) {
    return;
  }

  systemStatus = 1;
  startedAtMs = millis();
}

// หยุดปั๊ม และเลือกได้ว่าจะล็อคระบบหรือไม่
void stopPump(bool lockSystem) {
  if (systemStatus == 1) {
    accumulatedUptimeSeconds = currentUptimeSeconds();
  }

  systemStatus = 0;
  startedAtMs = 0;

  if (lockSystem) {
    isLocked = true;
  }
}

// ต่อ Wi-Fi
void setupWifi() {
  Serial.print("Connecting Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Wi-Fi connected, IP: ");
  Serial.println(WiFi.localIP());
}

// Callback ของ MQTT: ทำงานทุกครั้งที่มีข้อความเข้ามาจากเว็บ
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("MQTT message on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(msg);

  if (String(topic) == pairingTopic()) {
    applyPairingMessage(msg);
  }

  // เว็บกด Start: ให้ทำเหมือนกดปุ่ม Start จริง
  if (msg.indexOf("START") >= 0) {
    webStartCommand = true;
  }

  // เว็บกด Stop: ให้หยุดและล็อคเหมือนปุ่ม Stop จริง
  if (msg.indexOf("STOP") >= 0) {
    webStopCommand = true;
  }

  // เผื่อเว็บต้องการ reset เวลาทำงานปั๊ม
  if (msg.indexOf("RESET_UPTIME") >= 0) {
    accumulatedUptimeSeconds = 0;
    startedAtMs = systemStatus == 1 ? millis() : 0;
  }
}

// ต่อ MQTT Broker และ subscribe topic ที่ต้องฟัง
void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting MQTT...");

    String clientId = "greencrop_nodemcu_";
    clientId += String(ESP.getChipId(), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      mqttClient.subscribe(TOPIC_CONTROL);
      Serial.print("Subscribed: ");
      Serial.println(TOPIC_CONTROL);
      subscribePairingTopics();

      if (useTenantTopic()) {
        String tenantControlTopic = deviceTopic("control");
        mqttClient.subscribe(tenantControlTopic.c_str());
        Serial.print("Subscribed: ");
        Serial.println(tenantControlTopic);
      }
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 2 seconds");
      delay(2000);
    }
  }
}

// ส่งสถานะบอร์ดกลับไปให้ backend/web ทุก 1 วินาที
// backend จะบันทึกข้อมูลนี้ลง sensor_data
void publishStatus(int stateWLS1, int stateWLS2, int stateStart, int stateStop) {
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
  payload += String(stateWLS1);
  payload += ",";
  payload += "\"wls2\":";
  payload += String(stateWLS2);
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
  payload += "\"is_on\":";
  payload += boolText(systemStatus == 1);
  payload += ",";
  payload += "\"uptime_seconds\":";
  payload += String(currentUptimeSeconds());
  payload += ",";
  payload += "\"pumps\":[";
  payload += systemStatus == 1 ? "1" : "0";
  payload += ",0,0,0,0]";
  payload += "}";

  mqttClient.publish(TOPIC_SENSORS, payload.c_str());
  Serial.print("Published status: ");
  Serial.println(payload);

  if (useTenantTopic()) {
    String tenantSensorsTopic = deviceTopic("sensors");
    mqttClient.publish(tenantSensorsTopic.c_str(), payload.c_str());
    Serial.print("Published tenant status: ");
    Serial.println(tenantSensorsTopic);
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // ตั้งค่า input sensor และปุ่ม
  pinMode(pinWLS1, INPUT);
  pinMode(pinWLS2, INPUT);

  pinMode(pinStart, INPUT_PULLUP);
  pinMode(pinStop, INPUT_PULLUP);

  // ตั้งค่า output relay และเสียง
  pinMode(relayGreen, OUTPUT);
  pinMode(relayYellow, OUTPUT);
  pinMode(relayRed, OUTPUT);
  pinMode(pinISD, OUTPUT);

  // เริ่มต้นให้ทุกอย่างดับก่อน เพื่อความปลอดภัย
  turnEverythingOff();

  // แสดงข้อมูลที่ต้องใช้กรอกหน้าเว็บ
  printPairingInfo();

  setupWifi();

  // ตั้ง MQTT server และ callback รับข้อความ
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
}

void loop() {
  // รักษาการเชื่อมต่อ MQTT ให้ต่ออยู่ตลอด
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  // อ่าน input ทุกตัว
  int stateWLS1 = digitalRead(pinWLS1);
  int stateWLS2 = digitalRead(pinWLS2);
  int stateStart = digitalRead(pinStart);
  int stateStop = digitalRead(pinStop);

  // --------------------------------------------------
  // A. Stop แบบ NC: ถ้ากดปุ่ม Stop หรือเว็บส่ง STOP
  //    ให้หยุดทุกอย่างและเปิดโหมดล็อคทันที
  // --------------------------------------------------
  if (stateStop == HIGH || webStopCommand) {
    stopPump(true);
    webStopCommand = false;
    turnEverythingOff();
  } else {
    // --------------------------------------------------
    // B. ปลดล็อคเมื่อ WLS1 ตรวจพบน้ำ
    // --------------------------------------------------
    if (stateWLS1 == HIGH) {
      isLocked = false;
    }

    // --------------------------------------------------
    // C. โหมดติดล็อค: ไม่รับ Start และปิดปั๊ม/ไฟแดง/เสียง
    // --------------------------------------------------
    if (isLocked) {
      digitalWrite(relayYellow, HIGH);
      digitalWrite(relayRed, HIGH);
      digitalWrite(pinISD, LOW);
      digitalWrite(relayGreen, HIGH);
    } else {
      // --------------------------------------------------
      // D. โหมดปกติ: รับ Start จากปุ่มจริงหรือจากเว็บ
      // --------------------------------------------------
      if (stateStart == LOW || webStartCommand) {
        startPump();
      }
      webStartCommand = false;

      // คุมไฟเหลือง/ปั๊ม และไฟเขียว
      if (systemStatus == 1) {
        digitalWrite(relayYellow, LOW);
        digitalWrite(relayGreen, HIGH);
      } else {
        digitalWrite(relayYellow, HIGH);

        if (stateWLS1 == HIGH) {
          digitalWrite(relayGreen, LOW);
        } else {
          digitalWrite(relayGreen, HIGH);
        }
      }

      // คุมไฟแดงและเสียงจาก WLS2
      if (stateWLS2 == HIGH) {
        digitalWrite(relayRed, LOW);
        digitalWrite(pinISD, HIGH);
      } else {
        digitalWrite(relayRed, HIGH);
        digitalWrite(pinISD, LOW);
      }
    }
  }

  // ส่งสถานะกลับเว็บทุก 1 วินาที
  if (millis() - lastPublishMs >= 1000) {
    lastPublishMs = millis();
    publishStatus(stateWLS1, stateWLS2, stateStart, stateStop);
  }

  delay(50);
}
