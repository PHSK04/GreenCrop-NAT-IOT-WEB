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
const char* DEVICE_LABEL = "GreenCrop WLS Dual System 01";
const char* PAIRING_CODE = "123456";
const char* DEFAULT_TENANT_ID = "public";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ==================================================
// 3. ขา Input จากโค้ดควบคุมเดิม
// ==================================================
const int pinWLS1 = A0;          // Water Level Sensor 1 แบบ Analog: ค่าเกิน 300 = เจอน้ำ
const int pinWLS2 = D1;          // Water Level Sensor 2 แบบ Digital: HIGH = เจอน้ำ
const int pinStart1 = D2;        // ปุ่ม Start 1 แบบ NO: กดแล้วอ่านได้ LOW
const int pinStart2 = D3;        // ปุ่ม Start 2 แบบ NO: กดแล้วอ่านได้ LOW (GPIO0: ระวังตอน boot/upload)
const int pinFloatAlarm = D4;    // สวิตช์ลูกลอยระดับอันตราย: LOW = เตือน (GPIO2: ระวังตอน boot)
const int pinStop = D5;          // ปุ่ม Stop แบบ NC: กด/วงจรเปิดแล้วอ่านได้ HIGH
const int WLS1_THRESHOLD = 300;  // เกณฑ์อ่านค่า A0 ของ WLS1

// ==================================================
// 4. ขา Output จากโค้ดควบคุมเดิม
//    Relay เป็น Active-Low: LOW = ติด/ทำงาน, HIGH = ดับ/หยุด
// ==================================================
const int relayPump1 = D6;     // รีเลย์ปั๊ม 1
const int relayGreen1 = D7;    // ไฟเขียว 1
const int relayYellow1 = D0;   // ไฟเหลือง 1
const int relayGreen2 = D8;    // ไฟเขียว 2 (GPIO15: ระวังตอน boot)
const int relayYellow2 = 1;    // ไฟเหลือง 2 (TX/GPIO1: ใช้ร่วมกับ Serial TX)
const int relayAlarm = 3;      // ไฟแดง + เสียง (RX/GPIO3: ใช้ร่วมกับ Serial RX)

// ==================================================
// 5. สถานะระบบควบคุมเครื่อง
// ==================================================
int system1Status = 0;  // 0 = ระบบ 1 หยุด, 1 = ระบบ 1 ทำงาน
int system2Status = 0;  // 0 = ระบบ 2 หยุด, 1 = ระบบ 2 ทำงาน
bool isLocked = false;  // false = ปกติ, true = ระบบติดล็อคหลัง Stop

// คำสั่งที่มาจากเว็บผ่าน MQTT จะถูกพักไว้ในตัวแปรนี้
bool webStart1Command = false;
bool webStart2Command = false;
bool webStopCommand = false;

// สถานะการจับคู่กับบัญชีสมาชิกบนเว็บ
bool isDevicePaired = false;
String activeTenantId = DEFAULT_TENANT_ID;

// ใช้คำนวณเวลาการทำงานของระบบ 1 เพื่อส่งกลับเว็บ
unsigned long system1StartedAtMs = 0;
unsigned long accumulatedSystem1UptimeSeconds = 0;
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
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayGreen1, HIGH);
  digitalWrite(relayYellow1, HIGH);
  digitalWrite(relayGreen2, HIGH);
  digitalWrite(relayYellow2, HIGH);
  digitalWrite(relayAlarm, HIGH);
}

// คำนวณเวลารวมที่ระบบ 1 ทำงาน
unsigned long currentUptimeSeconds() {
  if (system1Status != 1 || system1StartedAtMs == 0) {
    return accumulatedSystem1UptimeSeconds;
  }

  return accumulatedSystem1UptimeSeconds + ((millis() - system1StartedAtMs) / 1000);
}

// เริ่มระบบ 1 จากปุ่มจริงหรือคำสั่งเว็บ
// ถ้าระบบล็อคอยู่ จะไม่ยอมเริ่ม
void startSystem1() {
  if (isLocked || system1Status == 1) {
    return;
  }

  system1Status = 1;
  system1StartedAtMs = millis();
}

// เริ่มระบบ 2 จากปุ่มจริงหรือคำสั่งเว็บ
// ถ้าระบบล็อคอยู่ จะไม่ยอมเริ่ม
void startSystem2() {
  if (isLocked || system2Status == 1) {
    return;
  }

  system2Status = 1;
}

// หยุดทุกระบบ และเลือกได้ว่าจะล็อคระบบหรือไม่
void stopSystems(bool lockSystem) {
  if (system1Status == 1) {
    accumulatedSystem1UptimeSeconds = currentUptimeSeconds();
  }

  system1Status = 0;
  system2Status = 0;
  system1StartedAtMs = 0;

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
  // START หรือ START1 = เริ่มระบบ 1, START2 = เริ่มระบบ 2
  if (msg.indexOf("START2") >= 0) {
    webStart2Command = true;
  } else if (msg.indexOf("START") >= 0 || msg.indexOf("START1") >= 0) {
    webStart1Command = true;
  }

  // เว็บกด Stop: ให้หยุดและล็อคเหมือนปุ่ม Stop จริง
  if (msg.indexOf("STOP") >= 0) {
    webStopCommand = true;
  }

  // เผื่อเว็บต้องการ reset เวลาทำงานปั๊ม
  if (msg.indexOf("RESET_UPTIME") >= 0) {
    accumulatedSystem1UptimeSeconds = 0;
    system1StartedAtMs = system1Status == 1 ? millis() : 0;
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
void publishStatus(
  int rawWLS1,
  bool stateWLS1,
  bool stateWLS2,
  bool stateStart1,
  bool stateStart2,
  bool stateFloatAlarm,
  bool stateStop
) {
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
  payload += "\"wls1_raw\":";
  payload += String(rawWLS1);
  payload += ",";
  payload += "\"wls1\":";
  payload += boolText(stateWLS1);
  payload += ",";
  payload += "\"wls2\":";
  payload += boolText(stateWLS2);
  payload += ",";
  payload += "\"start1_button\":";
  payload += boolText(stateStart1);
  payload += ",";
  payload += "\"start2_button\":";
  payload += boolText(stateStart2);
  payload += ",";
  payload += "\"float_alarm\":";
  payload += boolText(stateFloatAlarm);
  payload += ",";
  payload += "\"stop_button\":";
  payload += boolText(stateStop);
  payload += ",";
  payload += "\"locked\":";
  payload += boolText(isLocked);
  payload += ",";
  payload += "\"is_on\":";
  payload += boolText(system1Status == 1 || system2Status == 1);
  payload += ",";
  payload += "\"system1_on\":";
  payload += boolText(system1Status == 1);
  payload += ",";
  payload += "\"system2_on\":";
  payload += boolText(system2Status == 1);
  payload += ",";
  payload += "\"uptime_seconds\":";
  payload += String(currentUptimeSeconds());
  payload += ",";
  payload += "\"pumps\":[";
  payload += stateWLS1 ? "1" : "0";
  payload += ",";
  payload += system1Status == 1 ? "1" : "0";
  payload += ",";
  payload += system2Status == 1 ? "1" : "0";
  payload += ",0,0]";
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
  pinMode(pinWLS2, INPUT);

  pinMode(pinStart1, INPUT_PULLUP);
  pinMode(pinStart2, INPUT_PULLUP);
  pinMode(pinFloatAlarm, INPUT_PULLUP);
  pinMode(pinStop, INPUT_PULLUP);

  // ตั้งค่า output relay และเสียง
  pinMode(relayPump1, OUTPUT);
  pinMode(relayGreen1, OUTPUT);
  pinMode(relayYellow1, OUTPUT);
  pinMode(relayGreen2, OUTPUT);
  pinMode(relayYellow2, OUTPUT);
  pinMode(relayAlarm, OUTPUT);

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
  int rawWLS1 = analogRead(pinWLS1);
  bool stateWLS1 = rawWLS1 > WLS1_THRESHOLD;
  bool stateWLS2 = digitalRead(pinWLS2) == HIGH;
  bool stateStart1 = digitalRead(pinStart1) == LOW;
  bool stateStart2 = digitalRead(pinStart2) == LOW;
  bool stateFloatAlarm = digitalRead(pinFloatAlarm) == LOW;
  bool stateStop = digitalRead(pinStop) == HIGH;

  // --------------------------------------------------
  // A. Stop แบบ NC: ถ้ากดปุ่ม Stop หรือเว็บส่ง STOP
  //    ให้หยุดทุกอย่างและเปิดโหมดล็อคทันที
  // --------------------------------------------------
  if (stateStop || webStopCommand) {
    stopSystems(true);
    webStopCommand = false;
    turnEverythingOff();
  } else {
    // --------------------------------------------------
    // B. ปลดล็อคเมื่อ WLS2 ตรวจพบน้ำ
    // --------------------------------------------------
    if (stateWLS2) {
      isLocked = false;
    }

    // --------------------------------------------------
    // C. โหมดติดล็อค: ไม่รับ Start และปิดปั๊ม/ไฟแดง/เสียง
    // --------------------------------------------------
    if (isLocked) {
      turnEverythingOff();
    } else {
      // --------------------------------------------------
      // D. โหมดปกติ: รับ Start 1/2 จากปุ่มจริงหรือจากเว็บ
      // --------------------------------------------------
      if (stateStart1 || webStart1Command) {
        startSystem1();
      }
      webStart1Command = false;

      if (stateStart2 || webStart2Command) {
        startSystem2();
      }
      webStart2Command = false;

      // WLS1 ตรวจเจอน้ำ -> ปั๊ม 1 ติด
      if (stateWLS1) {
        digitalWrite(relayPump1, LOW);
      } else {
        digitalWrite(relayPump1, HIGH);
      }

      // ลูกลอยถึงระดับอันตราย -> ไฟแดงและเสียงติด
      if (stateFloatAlarm) {
        digitalWrite(relayAlarm, LOW);
      } else {
        digitalWrite(relayAlarm, HIGH);
      }

      // คุมระบบ 1: ไฟเหลือง 1 / ไฟเขียว 1
      if (system1Status == 1) {
        digitalWrite(relayYellow1, LOW);
        digitalWrite(relayGreen1, HIGH);
      } else {
        digitalWrite(relayYellow1, HIGH);

        if (stateWLS2) {
          digitalWrite(relayGreen1, LOW);
        } else {
          digitalWrite(relayGreen1, HIGH);
        }
      }

      // คุมระบบ 2: ไฟเหลือง 2 / ไฟเขียว 2
      if (system2Status == 1) {
        digitalWrite(relayYellow2, LOW);
        digitalWrite(relayGreen2, HIGH);
      } else {
        digitalWrite(relayYellow2, HIGH);
        digitalWrite(relayGreen2, LOW);
      }
    }
  }

  // ส่งสถานะกลับเว็บทุก 1 วินาที
  if (millis() - lastPublishMs >= 1000) {
    lastPublishMs = millis();
    publishStatus(rawWLS1, stateWLS1, stateWLS2, stateStart1, stateStart2, stateFloatAlarm, stateStop);
  }

  delay(50);
}
