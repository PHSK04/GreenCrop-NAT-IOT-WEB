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

// ==========================================
// 1. Wi-Fi
// ==========================================
// ข้อมูลเครือข่ายที่ ESP32 ใช้เชื่อมต่ออินเทอร์เน็ต
// ต้องต่อ Wi-Fi ได้ก่อน จึงจะเชื่อม MQTT และส่งข้อมูลขึ้นเว็บได้
const char* WIFI_SSID     = "P.PHSK";
const char* WIFI_PASSWORD = "Pphongsagon47.";

// ==========================================
// 2. MQTT
// ==========================================
// MQTT คือช่องทางสื่อสารระหว่าง ESP32 กับเว็บ
// - TOPIC_CONTROL ใช้รับคำสั่งจากเว็บ เช่น START, STOP, PUMP2_OFF
// - ปุ่ม Stop หน้าตู้ยังเป็นตัวหยุดฉุกเฉินหลัก และเว็บสามารถสั่งหยุดได้ด้วย
// - TOPIC_SENSORS ใช้ส่งค่าสถานะและค่าเซ็นเซอร์กลับไปให้เว็บ
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

// espClient เป็นตัวเชื่อม TLS/SSL สำหรับ MQTT port 8883
// mqttClient เป็นตัว publish/subscribe topic MQTT
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ==========================================
// 3. ตั้งค่าอุปกรณ์และขาพอร์ต (ESP32)
// ==========================================
// DS18B20 ใช้ OneWire ต่อที่ GPIO 4 เพื่ออ่านอุณหภูมิน้ำ
const int pinTemp = 4;
OneWire oneWire(pinTemp);
DallasTemperature tempSensor(&oneWire);

// ขา Input (ดิจิตอล): อ่านสถานะ ON/OFF จากเซ็นเซอร์และปุ่มหน้าตู้
const int pinWLS1 = 13;   // Water Level Sensor ตัวล่าง ถัง 1
const int pinWLS2 = 14;   // Water Level Sensor ตัวบน ถัง 1
const int pinStart = 27;  // ปุ่ม Start (NO)
const int pinStop = 26;   // ปุ่ม Stop (NC)
const int pinFloat = 25;  // ลูกลอยถัง 2

// ขา Input (แอนะล็อก): อ่านค่าแรงดันแล้วแปลงเป็น pH และ EC
const int pinPH = 32;     // เซ็นเซอร์ pH
const int pinTDS = 34;    // เซ็นเซอร์ TDS/EC

// ขา Output: สั่งรีเลย์และโมดูลเสียง
// รีเลย์เป็น Active LOW ดังนั้น LOW = เปิด, HIGH = ปิด
const int relayPump1 = 33;  // ปั๊ม 1
const int relayPump2 = 5;   // ปั๊ม 2 + ไฟเหลือง
const int relayGreen = 18;  // ไฟเขียว สถานะพร้อมใช้งาน
const int relayRed = 19;    // ไฟแดง แจ้งเตือนถัง 2
const int pinISD = 23;      // โมดูลเสียง ISD1820

// ปั๊ม 1 ใช้ WLS1/WLS2 เป็นเงื่อนไขหลัก เพื่อให้ระบบเติมน้ำได้แม้ pH sensor ยังไม่คาลิเบรต
// ถ้าต้องการให้ pH บล็อกปั๊ม 1 หลังคาลิเบรตแล้ว ให้เปลี่ยนค่านี้เป็น true
const bool PUMP1_REQUIRES_PH_OK = false;

// ==========================================
// 4. ตัวแปรสถานะระบบ
// ==========================================
int pump2Status = 0;    // 0 = หยุด, 1 = ทำงาน
bool isLocked = false;  // false = ปกติ, true = Emergency lock
bool webStartCommand = false;     // true เมื่อเว็บสั่ง START/PUMP2_ON
bool webStopCommand = false;      // true เมื่อเว็บสั่ง STOP
bool webPump2OffCommand = false;  // true เมื่อเว็บสั่งปิดเฉพาะปั๊ม 2
bool webAckAlarmCommand = false;  // true เมื่อเว็บสั่งรับทราบ/ปิดไฟเตือนหน้าตู้
bool alarmMutedByWeb = false;     // true หลังเว็บกดหยุดและรับทราบ alarm จนกว่า sensor จะกลับปกติ
bool isDevicePaired = false;      // true เมื่ออุปกรณ์จับคู่กับ tenant แล้ว
String activeTenantId = DEFAULT_TENANT_ID;  // tenant ปัจจุบันของอุปกรณ์

// ค่าเซ็นเซอร์ล่าสุด ใช้ทั้งควบคุมปั๊มและส่งขึ้นเว็บ
float pH_Value = 0.0;
float EC_Value = 0.0;
float temp_Value = 25.0;

// ตัวจับเวลา uptime ของปั๊ม 2 และรอบการส่งข้อมูล
unsigned long pump2StartedAtMs = 0;
unsigned long accumulatedPump2UptimeSeconds = 0;
unsigned long lastPublishMs = 0;
unsigned long lastSerialUpdateMs = 0;

// แปลงค่า bool ให้เป็นข้อความ true/false สำหรับประกอบ JSON
const char* boolText(bool value) {
  return value ? "true" : "false";
}

// สร้าง topic แบบแยก tenant เช่น tenants/{tenant}/devices/{device}/control
String deviceTopic(const char* channel) {
  String topic = "tenants/";
  topic += activeTenantId;
  topic += "/devices/";
  topic += DEVICE_ID;
  topic += "/";
  topic += channel;
  return topic;
}

// topic สำหรับขั้นตอนจับคู่อุปกรณ์กับเว็บ
String pairingTopic() {
  String topic = "greencrop/devices/";
  topic += DEVICE_ID;
  topic += "/pairing";
  return topic;
}

// ถ้า tenant ยังเป็น public จะยังไม่ส่ง topic เฉพาะ tenant
bool useTenantTopic() {
  return activeTenantId.length() > 0 && activeTenantId != "public";
}

// ดึงค่า string จาก JSON แบบง่าย เช่น key tenant_id หรือ device_id
// โค้ดนี้คาดว่าข้อความอยู่รูปแบบ "key":"value"
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

// เช็คว่าคำสั่ง MQTT นี้ส่งมาถึงอุปกรณ์ตัวนี้หรือไม่
// ถ้าไม่มี device_id ในข้อความ จะถือว่าเป็นคำสั่งทั่วไปและยอมรับ
bool messageTargetsThisDevice(const String& msg) {
  const String targetDeviceId = readJsonStringValue(msg, "device_id");
  if (targetDeviceId.length() == 0) {
    return true;
  }
  return targetDeviceId == DEVICE_ID;
}

// คำนวณเวลาทำงานสะสมของปั๊ม 2 เป็นวินาที
// ถ้าปั๊มกำลังเดิน จะบวกเวลาจากรอบปัจจุบันเข้าไปด้วย
unsigned long currentUptimeSeconds() {
  if (pump2Status != 1 || pump2StartedAtMs == 0) {
    return accumulatedPump2UptimeSeconds;
  }
  return accumulatedPump2UptimeSeconds + ((millis() - pump2StartedAtMs) / 1000);
}

// ค่า pH ใช้รายงานสถานะเท่านั้น เว้นแต่เปิด PUMP1_REQUIRES_PH_OK
bool isPump1AllowedByPh() {
  return pH_Value >= 6.5 && pH_Value <= 7.5;
}

bool shouldRunPump1(int stateWLS1, int stateWLS2) {
  if (isLocked) return false;
  if (stateWLS2 == HIGH) return false;
  if (stateWLS1 != HIGH) return false;
  if (PUMP1_REQUIRES_PH_OK && !isPump1AllowedByPh()) return false;
  return true;
}

const char* pump1BlockReason(int stateWLS1, int stateWLS2) {
  if (isLocked) return "LOCKED";
  if (stateWLS2 == HIGH) return "WLS2_FULL";
  if (stateWLS1 != HIGH) return "WLS1_DRY";
  if (PUMP1_REQUIRES_PH_OK && !isPump1AllowedByPh()) return "PH_OUT_OF_RANGE";
  return "READY";
}

bool isStopPressed(int stateStop) {
  return stateStop == HIGH;  // ปุ่ม Stop เป็น NC ตามแมนวลล่าสุด
}

// ปิด output ทั้งหมดทันที
// รีเลย์ Active LOW จึงต้องสั่ง HIGH เพื่อปิดรีเลย์
void turnOffAllOutputs() {
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayPump2, HIGH);
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);
}

// สั่งปั๊ม 2 เริ่มทำงาน และเริ่มจับเวลา uptime
void startPump2() {
  if (pump2Status == 1) return;
  pump2Status = 1;
  pump2StartedAtMs = millis();
}

// สั่งปั๊ม 2 หยุด และเก็บ uptime สะสมไว้ก่อนรีเซ็ตเวลารอบปัจจุบัน
void stopPump2() {
  if (pump2Status == 1) {
    accumulatedPump2UptimeSeconds = currentUptimeSeconds();
  }
  pump2Status = 0;
  pump2StartedAtMs = 0;
}

// Emergency stop: หยุดปั๊ม 2, ล็อกระบบ, และปิด output ทุกตัว
void stopAndLock() {
  stopPump2();
  isLocked = true;
  turnOffAllOutputs();
}

// อ่านค่าเซ็นเซอร์ทั้งหมด
// - DS18B20 อ่านอุณหภูมิ
// - pH อ่านแรงดันแล้วแปลงด้วยสมการเส้นตรง
// - TDS อ่านแรงดัน ชดเชยอุณหภูมิ แล้วแปลงเป็น EC mS/cm
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

// รับข้อความ pairing จากเว็บ
// ถ้า code ตรงและมี tenant_id จะบันทึก tenant แล้ว subscribe topic ของ tenant นั้น
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

// subscribe topic ที่ใช้จับคู่อุปกรณ์กับเว็บ
void subscribePairingTopics() {
  String topic = pairingTopic();
  mqttClient.subscribe(topic.c_str());
}

// ต่อ Wi-Fi และรอจนกว่าจะเชื่อมต่อสำเร็จ
void setupWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

// callback นี้ถูกเรียกทุกครั้งที่มีข้อความ MQTT เข้ามา
// ฟังก์ชันนี้แค่แปลงข้อความและตั้ง flag ส่วนการสั่งรีเลย์จริงทำใน loop()
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

  if (msg.indexOf("ACK_ALARM") >= 0 || msg.indexOf("SILENCE_ALARM") >= 0) {
    webAckAlarmCommand = true;
  }

  if (msg.indexOf("STOP") >= 0) {
    webStopCommand = true;
  }

  if (msg.indexOf("RESET_UPTIME") >= 0) {
    accumulatedPump2UptimeSeconds = 0;
    pump2StartedAtMs = (pump2Status == 1) ? millis() : 0;
  }
}

// เชื่อม MQTT ใหม่เมื่อหลุด
// หลังต่อสำเร็จจะ subscribe topic คำสั่งกลาง, topic pairing, และ topic tenant ถ้ามี
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

// สร้าง JSON สถานะของอุปกรณ์และส่งขึ้น MQTT
// เว็บใช้ข้อมูลนี้แสดงสถานะปั๊ม, ไฟ, ปุ่ม, ค่า pH/EC/Temp และ uptime
void publishStatus(
  int stateWLS1,
  int stateWLS2,
  int stateFloat,
  int stateStart,
  int stateStop
) {
  const bool stopPressed = isStopPressed(stateStop);
  const bool pump1On = shouldRunPump1(stateWLS1, stateWLS2);
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
  payload += "\"pump1_block_reason\":\""; payload += pump1BlockReason(stateWLS1, stateWLS2); payload += "\",";
  payload += "\"pump1_requires_ph_ok\":"; payload += boolText(PUMP1_REQUIRES_PH_OK); payload += ",";
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

// แสดงข้อมูลบน Serial Monitor สำหรับตรวจสอบตอนเสียบคอมพิวเตอร์
// รูปแบบนี้ช่วยให้ดูสถานะหน้างานได้ชัดเจนเหมือนจอ monitor:
// ค่า sensor, สถานะ WLS/Float, สถานะปั๊ม และสถานะระบบ
void printSerialStatus(
  int stateWLS1,
  int stateWLS2,
  int stateFloat
) {
  const bool pump1On = shouldRunPump1(stateWLS1, stateWLS2);

  Serial.println("=============================");
  Serial.print("pH Sensor : ");
  Serial.println(pH_Value, 2);
  Serial.print("EC Sensor : ");
  Serial.print(EC_Value, 2);
  Serial.println();
  Serial.print("Temperature : ");
  Serial.print(temp_Value, 2);
  Serial.println(" C");
  Serial.print("WLS1 : ");
  Serial.println(stateWLS1 == HIGH ? 1 : 0);
  Serial.print("WLS2 : ");
  Serial.println(stateWLS2 == HIGH ? 1 : 0);
  Serial.print("Float Switch : ");
  Serial.println(stateFloat == HIGH ? 1 : 0);
  Serial.print("Pump1 : ");
  Serial.println(pump1On ? "ON" : "OFF");
  Serial.print("Pump1 Block : ");
  Serial.println(pump1BlockReason(stateWLS1, stateWLS2));
  Serial.print("Pump2 : ");
  Serial.println(pump2Status == 1 ? "ON" : "OFF");
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
  // setup() ทำงานครั้งเดียวตอนเปิดบอร์ดหรือกด reset
  Serial.begin(9600);
  tempSensor.begin();

  // WLS ใช้ INPUT_PULLDOWN เพื่อให้ตอนเซ็นเซอร์ไม่ส่งสัญญาณอ่านเป็น LOW
  // ปุ่มและลูกลอยใช้ INPUT_PULLUP เพราะวงจรดึงลงกราวด์เมื่อต้องการให้ active
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

  // ปิดรีเลย์ทุกช่องก่อนเริ่มระบบ ป้องกันปั๊มติดเองตอนบอร์ดบูต
  turnOffAllOutputs();
  setupWifi();

  // ใช้ TLS แบบไม่ตรวจ certificate เพื่อให้เชื่อม HiveMQ Cloud ได้ง่ายบน ESP32
  // ตั้ง buffer 1536 เพื่อรองรับ JSON ที่ส่ง/รับจากเว็บ
  espClient.setInsecure();
  mqttClient.setBufferSize(1536);
  mqttClient.setKeepAlive(30);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  Serial.println("System Ready... Start Reading Sensors.");
  delay(1000);
}

void loop() {
  // loop() ทำงานวนตลอดเวลา เป็นส่วนควบคุมหลักของระบบ
  // 1. รักษาการเชื่อมต่อ MQTT
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  // 2. อ่านสถานะจากหน้าตู้และเซ็นเซอร์ดิจิตอล
  const int stateWLS1 = digitalRead(pinWLS1);
  const int stateWLS2 = digitalRead(pinWLS2);
  const int stateStart = digitalRead(pinStart);
  const int stateStop = digitalRead(pinStop);
  const int stateFloat = digitalRead(pinFloat);

  // 3. อ่านค่า pH, EC และอุณหภูมิ
  readSensors();

  if (stateWLS2 != HIGH && stateFloat != LOW) {
    alarmMutedByWeb = false;
  }

  // 4. เช็ค Emergency Stop จากหน้าตู้หรือคำสั่ง STOP จากเว็บ
  // ถ้าเกิด Stop จะล็อกระบบและปิด output ทั้งหมดทันที
  if (isStopPressed(stateStop) || webStopCommand) {
    webStopCommand = false;
    alarmMutedByWeb = true;
    stopAndLock();
  } else {
    // 5. ปลดล็อกระบบเมื่อระดับน้ำถึง WLS2
    if (stateWLS2 == HIGH) {
      isLocked = false;
    }

    // ถ้ายังล็อกอยู่ ให้ปิด output ทุกตัวและไม่รับคำสั่งอื่น
    if (isLocked) {
      turnOffAllOutputs();
    } else {
      // 6. ควบคุมปั๊ม 1 แบบอัตโนมัติ
      // น้ำเต็มถึง WLS2 = ปิด, น้ำถึง WLS1 = เปิด
      // ค่า pH ยังถูกส่งขึ้นเว็บ แต่จะไม่บล็อกปั๊ม 1 จนกว่าจะเปิด PUMP1_REQUIRES_PH_OK
      if (shouldRunPump1(stateWLS1, stateWLS2)) {
        digitalWrite(relayPump1, LOW);
      } else {
        digitalWrite(relayPump1, HIGH);
      }

      // 7. ควบคุมปั๊ม 2 จากปุ่ม Start หน้าตู้หรือคำสั่งเว็บ
      if (stateStart == LOW || webStartCommand) {
        alarmMutedByWeb = false;
        startPump2();
      }
      webStartCommand = false;

      // คำสั่งนี้ปิดเฉพาะปั๊ม 2 ไม่ได้ล็อกระบบเหมือน Emergency Stop
      if (webPump2OffCommand) {
        stopPump2();
        alarmMutedByWeb = true;
      }
      webPump2OffCommand = false;

      // รับทราบ alarm จากเว็บ: หยุดปั๊ม 2 และปิดไฟ/เสียงเตือนหน้าตู้จนกว่า sensor จะกลับปกติ
      if (webAckAlarmCommand) {
        stopPump2();
        alarmMutedByWeb = true;
      }
      webAckAlarmCommand = false;

      // สั่งรีเลย์ปั๊ม 2 ตามสถานะ pump2Status
      if (pump2Status == 1) {
        digitalWrite(relayPump2, LOW);
      } else {
        digitalWrite(relayPump2, HIGH);
      }

      // 8. ไฟเขียวติดเมื่อถัง 1 เต็ม และปั๊ม 2 ไม่ได้ทำงาน
      if (stateWLS2 == HIGH && pump2Status == 0 && !alarmMutedByWeb) {
        digitalWrite(relayGreen, LOW);
      } else {
        digitalWrite(relayGreen, HIGH);
      }

      // 9. ไฟแดงและเสียงเตือนทำงานเมื่อลูกลอยถัง 2 แจ้งเตือน
      if (stateFloat == LOW && !alarmMutedByWeb) {
        digitalWrite(relayRed, LOW);
        digitalWrite(pinISD, HIGH);
      } else {
        digitalWrite(relayRed, HIGH);
        digitalWrite(pinISD, LOW);
      }
    }
  }

  // 10. ส่งข้อมูลสถานะไปเว็บทุก 1 วินาที
  if (millis() - lastPublishMs >= 1000) {
    lastPublishMs = millis();
    publishStatus(stateWLS1, stateWLS2, stateFloat, stateStart, stateStop);
  }

  // 11. แสดงข้อมูลบน Serial Monitor ทุก 0.5 วินาที
  if (millis() - lastSerialUpdateMs >= 500) {
    lastSerialUpdateMs = millis();
    printSerialStatus(stateWLS1, stateWLS2, stateFloat);
  }

  // หน่วงสั้น ๆ เพื่อลดการวนลูปถี่เกินไป แต่ยังตอบสนองปุ่มได้เร็ว
  delay(50);
}
