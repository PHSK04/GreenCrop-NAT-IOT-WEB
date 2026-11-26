/*
  GreenCrop - ESP32 Manual / Auto + LCD 1602 I2C

  LCD แสดงเฉพาะ:
  - โหมด MAN/AUTO
  - อุณหภูมิ
  - pH
  - EC

  ไม่มีปั๊มโดสซิ่ง
  Emergency ตัดไฟทั้งตู้ทางฮาร์ดแวร์ ไม่ต่อ GPIO

  I2C ใช้ขากำหนดเองเพื่อไม่ชนไฟเหลืองและ Alarm:
  SDA = GPIO17
  SCL = GPIO5

  หมายเหตุด้านไฟฟ้า:
  LCD1602 I2C Backpack ส่วนมากใช้ไฟ 5V และมี Pull-up I2C ไป 5V
  ESP32 ไม่ทนสัญญาณ 5V จึงแนะนำใช้ I2C bidirectional level shifter
  ระหว่าง ESP32 กับ LCD Backpack
*/

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ======================== WEB TELEMETRY ========================
// ส่วนนี้ส่งค่าขึ้นเว็บผ่าน HiveMQ อย่างเดียว
// - ไม่รับคำสั่งจากเว็บ ไม่แตะปั๊ม ไฟ หรือ state ของตู้
// - WiFi/MQTT ทำงานใน task แยกบน core 0 ส่วน loop() ของตู้อยู่ core 1
//   เน็ตหลุดหรือ HiveMQ ล่ม ตู้ก็ทำงานเหมือนเดิม ไม่ต้องรอเน็ต
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "GreenCropnat";
const char* MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";

// DEVICE_ID ต้องตรงกับรหัสอุปกรณ์ที่จับคู่ในเว็บ WolffiaSmart (อุปกรณ์ > เพิ่มอุปกรณ์)
// ใช้ตัวพิมพ์ใหญ่ ใครจับคู่รหัสนี้ก่อนจะเป็นเจ้าของเครื่อง จึงควรจับคู่ทันทีหลังอัปโหลด
const char* DEVICE_ID = "GREENCROP05";

WiFiClientSecure mqttSecureClient;
PubSubClient mqttClient(mqttSecureClient);
unsigned long lastMqttPublishMs = 0;
const unsigned long MQTT_PUBLISH_INTERVAL_MS = 1000;
const unsigned long WEB_MIN_GAP_MS = 250;     // สถานะเปลี่ยนแล้วส่งทันที แต่ไม่ถี่กว่านี้
const unsigned long WIFI_RETRY_MS = 15000;
const unsigned long MQTT_RETRY_MS = 5000;
const size_t WEB_PAYLOAD_SIZE = 640;

const uint8_t WEB_FAULT_NONE = 0;
const uint8_t WEB_FAULT_PUMP_TIMEOUT = 1;
const uint8_t WEB_FAULT_SELECTOR = 2;

// สำเนาสถานะตู้ที่ loop() เขียน แล้ว task ส่งเว็บอ่าน
struct WebSnapshot {
  bool sensorsReady;
  float temperatureC;
  bool temperatureValid;
  float pH;
  float ec;
  uint8_t mode;
  uint8_t state;
  uint8_t selector;
  bool tank1Full;
  bool tank2Full;
  bool pumpOn;
  uint32_t pumpRunS;
  bool alarmOn;
  bool stopPressed;
  uint8_t faultCode;
  bool probeInWater;
};

WebSnapshot webShared = {};
portMUX_TYPE webMux = portMUX_INITIALIZER_UNLOCKED;
TaskHandle_t webTaskHandle = nullptr;

// ======================== LCD ========================
const int PIN_I2C_SDA = 17;
const int PIN_I2C_SCL = 5;
const uint8_t LCD_ADDRESS = 0x27; // หากไม่ขึ้นให้ลอง 0x3F
LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

// ======================== INPUT PINS ========================
const int PIN_TEMP = 4;
const int PIN_PH = 32;
const int PIN_EC = 34;
const int PIN_FLOAT_TANK1 = 13;
const int PIN_FLOAT_TANK2 = 14;
const int PIN_START = 27;
const int PIN_STOP = 26;
const int PIN_MODE_MANUAL = 25;
const int PIN_MODE_AUTO = 16;

// ======================== OUTPUT PINS ========================
const int RELAY_PUMP1 = 33;
const int LAMP_WHITE = 18;
const int LAMP_GREEN = 19;
const int LAMP_YELLOW = 21;
const int LAMP_ALARM = 22;
const int LAMP_RED = 23;

// ======================== TIME SETTINGS ========================
const unsigned long FLOAT_CONFIRM_MS = 5000;
const unsigned long ALARM_TIME_MS = 5000;
const unsigned long MAX_PUMP_TIME_MS = 10UL * 60UL * 1000UL;
const unsigned long BUTTON_DEBOUNCE_MS = 40;
const unsigned long SELECTOR_DEBOUNCE_MS = 100;
const unsigned long SELECTOR_FAULT_DELAY_MS = 500;
const unsigned long SENSOR_INTERVAL_MS = 500;
const unsigned long TEMP_CONVERSION_MS = 200;
const unsigned long LCD_UPDATE_MS = 500;

// ======================== pH NA520/NA521 ========================
// ต้องคาลิเบรตด้วยน้ำยามาตรฐาน pH 4 และ pH 7
const float PH_SLOPE = -5.70f;
const float PH_OFFSET = 21.34f;

// 1.0 เมื่อแรงดัน AO เข้าขา ESP32 โดยตรงและไม่เกิน 3.3V
// หากใช้ Voltage Divider ต้องเปลี่ยนตามอัตราส่วนจริง
const float PH_VOLTAGE_MULTIPLIER = 1.0f;
const int PH_SAMPLE_COUNT = 30;

// ======================== EC ========================
const float EC_TEMP_COEFFICIENT = 0.02f;
const int EC_SAMPLE_COUNT = 30;

// ======================== หัววัดไม่ได้จุ่มน้ำ ========================
// หัว pH ในอากาศอ่านได้ประมาณ 7 แยกไม่ออก จึงดูจากหัว EC (ในอากาศ EC เกือบ 0)
// EC ต่ำกว่า EC_DRY_ENTER_MS = ไม่ได้จุ่มน้ำ -> pH, EC (และอุณหภูมิ) เป็น 0
// ต้องขึ้นเกิน EC_DRY_EXIT_MS จึงถือว่าจุ่มน้ำแล้ว และต้องได้ค่าเดิมติดกัน
// DRY_CONFIRM_READINGS ครั้ง (ประมาณ 1.5 วินาที) ค่าบนจอจะได้ไม่กระพริบ
// ถ้ายกหัววัดขึ้นจากน้ำแล้ว Serial ยังไม่ขึ้น "PROBE: not in water"
// ให้ดูค่า EC ใน Serial ตอนอยู่ในอากาศ แล้วตั้ง EC_DRY_ENTER_MS ให้สูงกว่านั้นเล็กน้อย
const float EC_DRY_ENTER_MS = 0.05f;
const float EC_DRY_EXIT_MS = 0.10f;
const uint8_t DRY_CONFIRM_READINGS = 3;
const bool DRY_PROBE_ZERO_TEMP = true; // false = อุณหภูมิแสดงค่าจริงแม้ไม่ได้จุ่มน้ำ

bool probeInWater = true;

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

float temperatureC = 25.0f;
float pHValue = 0.0f;
float ecValue = 0.0f;
float pHVoltageAtPin = 0.0f;
float pHModuleVoltage = 0.0f;
float ecVoltage = 0.0f;
bool temperatureValid = false;

unsigned long lastSensorRequestMs = 0;
unsigned long tempRequestStartedMs = 0;
unsigned long lastLcdUpdateMs = 0;
bool tempConversionPending = false;

// ======================== STATE ========================
enum ControlMode {
  MANUAL_MODE,
  AUTO_MODE
};

enum SelectorStatus {
  SELECTOR_MANUAL,
  SELECTOR_AUTO,
  SELECTOR_INVALID
};

enum SystemState {
  MAN_WAIT_TANK1,
  MAN_CONFIRM_TANK1,
  MAN_WAIT_START,
  MAN_PUMPING,
  MAN_COMPLETE_ALARM,
  MAN_COMPLETE,

  AUTO_IDLE,
  AUTO_WAIT_TANK1,
  AUTO_CONFIRM_TANK1,
  AUTO_PUMPING,
  AUTO_COMPLETE_ALARM,
  AUTO_COMPLETE,

  FAULT_LOCK
};

ControlMode currentMode = MANUAL_MODE;
SystemState state = MAN_WAIT_TANK1;

unsigned long stateStartedMs = 0;
unsigned long pumpStartedMs = 0;
unsigned long alarmStartedMs = 0;
unsigned long selectorInvalidStartedMs = 0;

bool alarmOn = false;
bool alarmTimed = false;

// ======================== BASIC I/O ========================
void outputWrite(int pin, bool on) {
  digitalWrite(pin, on ? LOW : HIGH);
}

bool tank1Full() {
  return digitalRead(PIN_FLOAT_TANK1) == LOW;
}

bool tank2Full() {
  return digitalRead(PIN_FLOAT_TANK2) == LOW;
}

bool stopPressed() {
  // STOP เป็น NC: ปกติ LOW, กดหรือสายขาด HIGH
  return digitalRead(PIN_STOP) == HIGH;
}

void pumpSet(bool on) {
  outputWrite(RELAY_PUMP1, on);
  outputWrite(LAMP_YELLOW, on);
  pumpStartedMs = on ? millis() : 0;
}

void alarmSet(bool on) {
  alarmOn = on;
  outputWrite(LAMP_ALARM, on);
  if (!on) alarmTimed = false;
}

void startTimedAlarm() {
  alarmOn = true;
  alarmTimed = true;
  alarmStartedMs = millis();
  outputWrite(LAMP_ALARM, true);
}

void updateAlarm() {
  if (alarmOn && alarmTimed &&
      millis() - alarmStartedMs >= ALARM_TIME_MS) {
    alarmSet(false);
  }
}

void turnOffProcessOutputs() {
  pumpSet(false);
  alarmSet(false);
}

void turnOffAllOutputs() {
  outputWrite(RELAY_PUMP1, false);
  outputWrite(LAMP_WHITE, false);
  outputWrite(LAMP_GREEN, false);
  outputWrite(LAMP_YELLOW, false);
  outputWrite(LAMP_ALARM, false);
  outputWrite(LAMP_RED, false);
  pumpStartedMs = 0;
  alarmOn = false;
  alarmTimed = false;
}

void setState(SystemState nextState) {
  state = nextState;
  stateStartedMs = millis();
  Serial.print("State = ");
  Serial.println((int)state);
}

void enterFault(const char* reason) {
  pumpSet(false);
  alarmTimed = false;
  alarmSet(true);
  outputWrite(LAMP_RED, true);
  setState(FAULT_LOCK);
  Serial.print("FAULT: ");
  Serial.println(reason);
}

// ======================== START BUTTON ========================
bool startPressedEvent() {
  static int lastRaw = HIGH;
  static int stableState = HIGH;
  static unsigned long changedMs = 0;

  int raw = digitalRead(PIN_START);

  if (raw != lastRaw) {
    lastRaw = raw;
    changedMs = millis();
  }

  if (millis() - changedMs >= BUTTON_DEBOUNCE_MS &&
      raw != stableState) {
    stableState = raw;
    if (stableState == LOW) return true;
  }

  return false;
}

// ======================== SELECTOR ========================
SelectorStatus readSelectorRaw() {
  bool manualClosed = digitalRead(PIN_MODE_MANUAL) == LOW;
  bool autoClosed = digitalRead(PIN_MODE_AUTO) == LOW;

  if (manualClosed && !autoClosed) return SELECTOR_MANUAL;
  if (!manualClosed && autoClosed) return SELECTOR_AUTO;
  return SELECTOR_INVALID;
}

SelectorStatus readSelectorDebounced() {
  static bool initialized = false;
  static SelectorStatus lastRaw;
  static SelectorStatus stableStatus;
  static unsigned long changedMs = 0;

  SelectorStatus raw = readSelectorRaw();

  if (!initialized) {
    initialized = true;
    lastRaw = raw;
    stableStatus = raw;
    changedMs = millis();
    return stableStatus;
  }

  if (raw != lastRaw) {
    lastRaw = raw;
    changedMs = millis();
  }

  if (millis() - changedMs >= SELECTOR_DEBOUNCE_MS) {
    stableStatus = raw;
  }

  return stableStatus;
}

void updateModeLamps() {
  outputWrite(LAMP_WHITE, currentMode == MANUAL_MODE);
  outputWrite(LAMP_GREEN, currentMode == AUTO_MODE);
}

void resetForMode(ControlMode selectedMode) {
  currentMode = selectedMode;
  turnOffProcessOutputs();
  outputWrite(LAMP_RED, false);

  if (currentMode == MANUAL_MODE) {
    setState(MAN_WAIT_TANK1);
    Serial.println("MODE: MANUAL");
  } else {
    setState(AUTO_IDLE);
    Serial.println("MODE: AUTO - press START");
  }

  updateModeLamps();
}

// ======================== SENSOR READING ========================
int averageAnalogRead(int pin, int samples) {
  unsigned long total = 0;
  for (int i = 0; i < samples; i++) {
    total += analogRead(pin);
  }
  return (int)(total / samples);
}

void readPH_NA520_NA521() {
  unsigned long totalMilliVolts = 0;

  for (int i = 0; i < PH_SAMPLE_COUNT; i++) {
    totalMilliVolts += analogReadMilliVolts(PIN_PH);
  }

  float averageMilliVolts =
    totalMilliVolts / (float)PH_SAMPLE_COUNT;

  pHVoltageAtPin = averageMilliVolts / 1000.0f;
  pHModuleVoltage =
    pHVoltageAtPin * PH_VOLTAGE_MULTIPLIER;

  pHValue =
    (PH_SLOPE * pHModuleVoltage) + PH_OFFSET;

  if (pHValue < 0.0f) pHValue = 0.0f;
  if (pHValue > 14.0f) pHValue = 14.0f;
}

void readEC() {
  int rawEC = averageAnalogRead(PIN_EC, EC_SAMPLE_COUNT);
  ecVoltage = rawEC * (3.3f / 4095.0f);

  float compensation =
    1.0f + EC_TEMP_COEFFICIENT * (temperatureC - 25.0f);

  if (compensation < 0.1f) compensation = 1.0f;

  float compensatedVoltage = ecVoltage / compensation;

  float tds = (
    133.42f * pow(compensatedVoltage, 3) -
    255.86f * pow(compensatedVoltage, 2) +
    857.39f * compensatedVoltage
  ) * 0.5f;

  ecValue = (tds * 2.0f) / 1000.0f;
  if (ecValue < 0.0f) ecValue = 0.0f;
}

// เรียกหลัง readEC() ทุกรอบ: ถ้าหัววัดไม่ได้จุ่มน้ำ ตั้งค่าที่แสดงเป็น 0
// ใช้แค่กับ LCD / Serial / เว็บ ส่วนควบคุมปั๊มไม่ได้ใช้ค่าเหล่านี้
void applyDryProbeRule() {
  static bool known = false;
  static uint8_t pendingCount = 0;

  float rawEC = ecValue;
  bool looksDry = probeInWater ? rawEC < EC_DRY_ENTER_MS
                               : rawEC <= EC_DRY_EXIT_MS;

  if (!known) {
    known = true;
    probeInWater = !looksDry;
    pendingCount = 0;
  } else if (looksDry == probeInWater) {
    if (++pendingCount >= DRY_CONFIRM_READINGS) {
      probeInWater = !looksDry;
      pendingCount = 0;
      Serial.print(probeInWater ? "PROBE: in water (EC " : "PROBE: not in water (EC ");
      Serial.print(rawEC, 3);
      Serial.println(" mS/cm)");
    }
  } else {
    pendingCount = 0;
  }

  if (!probeInWater) {
    pHValue = 0.0f;
    ecValue = 0.0f;
    if (DRY_PROBE_ZERO_TEMP && temperatureValid) temperatureC = 0.0f;
  }
}

void printSensorValues() {
  Serial.println("============================");
  Serial.print("Mode: ");
  Serial.println(currentMode == MANUAL_MODE ? "MANUAL" : "AUTO");
  Serial.print("Temperature: ");
  if (temperatureValid) {
    Serial.print(temperatureC, 1);
    Serial.println(" C");
  } else {
    Serial.println("DISCONNECTED");
  }
  Serial.print("pH pin voltage: ");
  Serial.print(pHVoltageAtPin, 3);
  Serial.println(" V");
  Serial.print("pH: ");
  Serial.println(pHValue, 2);
  Serial.print("EC: ");
  Serial.print(ecValue, 2);
  Serial.println(" mS/cm");
  Serial.println("============================");
}

void updateSensors() {
  unsigned long now = millis();

  if (!tempConversionPending &&
      now - lastSensorRequestMs >= SENSOR_INTERVAL_MS) {
    lastSensorRequestMs = now;
    tempRequestStartedMs = now;
    tempConversionPending = true;
    tempSensor.requestTemperatures();
  }

  if (tempConversionPending &&
      now - tempRequestStartedMs >= TEMP_CONVERSION_MS) {
    float measuredTemp = tempSensor.getTempCByIndex(0);

    temperatureValid =
      measuredTemp != DEVICE_DISCONNECTED_C &&
      measuredTemp >= 0.0f &&
      measuredTemp <= 60.0f;

    temperatureC = temperatureValid ? measuredTemp : 25.0f;

    readPH_NA520_NA521();
    readEC();
    applyDryProbeRule();
    printSensorValues();
    tempConversionPending = false;
  }
}

// ======================== LCD: SENSOR + MODE ONLY ========================
void lcdPrintLine(uint8_t row, const char* text) {
  char padded[17];
  snprintf(padded, sizeof(padded), "%-16.16s", text);
  lcd.setCursor(0, row);
  lcd.print(padded);
}

void updateLCD() {
  if (millis() - lastLcdUpdateMs < LCD_UPDATE_MS) return;
  lastLcdUpdateMs = millis();

  char line1[17];
  char line2[17];
  const char* modeText =
    currentMode == MANUAL_MODE ? "MAN" : "AUTO";

  if (temperatureValid) {
    snprintf(line1, sizeof(line1),
             "%s T:%4.1fC", modeText, temperatureC);
  } else {
    snprintf(line1, sizeof(line1),
             "%s T:ERR", modeText);
  }

  snprintf(line2, sizeof(line2),
           "pH:%4.2f E:%4.2f", pHValue, ecValue);

  lcdPrintLine(0, line1);
  lcdPrintLine(1, line2);
}

// ======================== MANUAL ========================
void runManual(bool startEvent) {
  switch (state) {
    case MAN_WAIT_TANK1:
      if (tank1Full()) setState(MAN_CONFIRM_TANK1);
      break;

    case MAN_CONFIRM_TANK1:
      if (!tank1Full()) {
        setState(MAN_WAIT_TANK1);
      } else if (millis() - stateStartedMs >= FLOAT_CONFIRM_MS) {
        alarmSet(true);
        setState(MAN_WAIT_START);
      }
      break;

    case MAN_WAIT_START:
      if (startEvent) {
        alarmSet(false);
        if (tank2Full()) {
          startTimedAlarm();
          setState(MAN_COMPLETE_ALARM);
        } else {
          pumpSet(true);
          setState(MAN_PUMPING);
        }
      }
      break;

    case MAN_PUMPING:
      if (tank2Full()) {
        pumpSet(false);
        startTimedAlarm();
        setState(MAN_COMPLETE_ALARM);
      } else if (millis() - pumpStartedMs >= MAX_PUMP_TIME_MS) {
        enterFault("Pump exceeded 10-minute limit");
      }
      break;

    case MAN_COMPLETE_ALARM:
      if (!alarmOn) setState(MAN_COMPLETE);
      break;

    case MAN_COMPLETE:
      if (!tank2Full()) setState(MAN_WAIT_TANK1);
      break;

    default:
      break;
  }
}

// ======================== AUTO ========================
void runAuto(bool startEvent) {
  switch (state) {
    case AUTO_IDLE:
      if (startEvent && !tank2Full()) {
        setState(AUTO_WAIT_TANK1);
      }
      break;

    case AUTO_WAIT_TANK1:
      if (tank1Full()) setState(AUTO_CONFIRM_TANK1);
      break;

    case AUTO_CONFIRM_TANK1:
      if (!tank1Full()) {
        setState(AUTO_WAIT_TANK1);
      } else if (millis() - stateStartedMs >= FLOAT_CONFIRM_MS) {
        if (tank2Full()) {
          startTimedAlarm();
          setState(AUTO_COMPLETE_ALARM);
        } else {
          pumpSet(true);
          setState(AUTO_PUMPING);
        }
      }
      break;

    case AUTO_PUMPING:
      if (tank2Full()) {
        pumpSet(false);
        startTimedAlarm();
        setState(AUTO_COMPLETE_ALARM);
      } else if (millis() - pumpStartedMs >= MAX_PUMP_TIME_MS) {
        enterFault("Pump exceeded 10-minute limit");
      }
      break;

    case AUTO_COMPLETE_ALARM:
      if (!alarmOn) setState(AUTO_COMPLETE);
      break;

    case AUTO_COMPLETE:
      if (startEvent && !tank2Full()) {
        setState(AUTO_WAIT_TANK1);
      }
      break;

    default:
      break;
  }
}

// ======================== WEB TELEMETRY ========================
// setup() เรียก connectWebTelemetry() และ loop() เรียก updateWebTelemetry() เหมือนเดิม
// แต่ทั้งสองฟังก์ชันไม่รอเน็ตแล้ว: งาน WiFi/MQTT ย้ายไปอยู่ใน webTelemetryTask

const char* webModeName(uint8_t mode) {
  return mode == AUTO_MODE ? "AUTO" : "MANUAL";
}

const char* webSelectorName(uint8_t selector) {
  if (selector == SELECTOR_MANUAL) return "MANUAL";
  if (selector == SELECTOR_AUTO) return "AUTO";
  return "INVALID";
}

const char* webStateName(uint8_t value) {
  switch (value) {
    case MAN_WAIT_TANK1: return "MAN_WAIT_TANK1";
    case MAN_CONFIRM_TANK1: return "MAN_CONFIRM_TANK1";
    case MAN_WAIT_START: return "MAN_WAIT_START";
    case MAN_PUMPING: return "MAN_PUMPING";
    case MAN_COMPLETE_ALARM: return "MAN_COMPLETE_ALARM";
    case MAN_COMPLETE: return "MAN_COMPLETE";
    case AUTO_IDLE: return "AUTO_IDLE";
    case AUTO_WAIT_TANK1: return "AUTO_WAIT_TANK1";
    case AUTO_CONFIRM_TANK1: return "AUTO_CONFIRM_TANK1";
    case AUTO_PUMPING: return "AUTO_PUMPING";
    case AUTO_COMPLETE_ALARM: return "AUTO_COMPLETE_ALARM";
    case AUTO_COMPLETE: return "AUTO_COMPLETE";
    case FAULT_LOCK: return "FAULT_LOCK";
  }
  return "UNKNOWN";
}

const char* webFaultName(uint8_t faultCode) {
  if (faultCode == WEB_FAULT_PUMP_TIMEOUT) return "\"pump_timeout\"";
  if (faultCode == WEB_FAULT_SELECTOR) return "\"selector_invalid\"";
  return "null";
}

// ใช้ตัดสินว่าสถานะตู้เปลี่ยนหรือยัง (ไม่รวมค่าเซนเซอร์ ซึ่งส่งตามรอบปกติ)
uint32_t webSignature(const WebSnapshot& s) {
  return (uint32_t)s.sensorsReady |
         ((uint32_t)s.mode << 1) |
         ((uint32_t)s.state << 2) |
         ((uint32_t)s.selector << 7) |
         ((uint32_t)s.tank1Full << 9) |
         ((uint32_t)s.tank2Full << 10) |
         ((uint32_t)s.pumpOn << 11) |
         ((uint32_t)s.alarmOn << 12) |
         ((uint32_t)s.stopPressed << 13) |
         ((uint32_t)s.faultCode << 14) |
         ((uint32_t)s.temperatureValid << 16) |
         ((uint32_t)s.probeInWater << 17);
}

size_t buildWebPayload(const WebSnapshot& s, uint32_t bootId, uint32_t seq,
                       char* out, size_t size) {
  char temp[12];
  if (s.temperatureValid) {
    snprintf(temp, sizeof(temp), "%.1f", s.temperatureC);
  } else {
    snprintf(temp, sizeof(temp), "null");
  }

  int written = snprintf(
    out, size,
    "{\"device_id\":\"%s\",\"msg_id\":\"%s-%08lX-%lu\","
    "\"ph_value\":%.2f,\"ec_value\":%.2f,\"temp_c\":%s,\"temp_valid\":%s,"
    "\"probe_in_water\":%s,"
    "\"wls1\":%s,\"wls2\":%s,\"pump1_on\":%s,\"pump_run_s\":%lu,"
    "\"mode\":\"%s\",\"state\":\"%s\",\"selector\":\"%s\","
    "\"alarm_on\":%s,\"stop_pressed\":%s,\"fault\":%s,\"fault_code\":%s,"
    "\"uptime_seconds\":%lu,\"rssi\":%d}",
    DEVICE_ID, DEVICE_ID, (unsigned long)bootId, (unsigned long)seq,
    s.pH, s.ec, temp, s.temperatureValid ? "true" : "false",
    s.probeInWater ? "true" : "false",
    s.tank1Full ? "true" : "false",
    s.tank2Full ? "true" : "false",
    s.pumpOn ? "true" : "false",
    (unsigned long)s.pumpRunS,
    webModeName(s.mode), webStateName(s.state), webSelectorName(s.selector),
    s.alarmOn ? "true" : "false",
    s.stopPressed ? "true" : "false",
    s.state == FAULT_LOCK ? "true" : "false",
    webFaultName(s.faultCode),
    (unsigned long)(millis() / 1000UL), (int)WiFi.RSSI());

  if (written <= 0 || (size_t)written >= size) return 0;
  return (size_t)written;
}

void webTelemetryTask(void* parameter) {
  (void)parameter;

  char topic[128];
  // tenant "public": เว็บส่งข้อมูลเครื่องนี้ให้เฉพาะบัญชีที่จับคู่ DEVICE_ID ไว้
  snprintf(topic, sizeof(topic), "tenants/public/devices/%s/sensors", DEVICE_ID);

  char clientId[40];
  snprintf(clientId, sizeof(clientId), "GREENCROP_CABINET_%08lX",
           (unsigned long)(uint32_t)ESP.getEfuseMac());

  static char payload[WEB_PAYLOAD_SIZE];
  const uint32_t bootId = esp_random();
  uint32_t seq = 0;
  uint32_t lastSignature = 0xFFFFFFFFUL;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long wifiStartedMs = millis();

  mqttSecureClient.setInsecure();
  mqttSecureClient.setHandshakeTimeout(15);
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(WEB_PAYLOAD_SIZE + 128);
  mqttClient.setKeepAlive(30);
  mqttClient.setSocketTimeout(5);
  bool mqttTried = false;
  unsigned long mqttTriedMs = 0;

  Serial.print("WEB: topic ");
  Serial.println(topic);

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      if (millis() - wifiStartedMs >= WIFI_RETRY_MS) {
        Serial.println("WEB: WiFi retry");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        wifiStartedMs = millis();
      }
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }
    wifiStartedMs = millis();

    if (!mqttClient.connected()) {
      if (!mqttTried || millis() - mqttTriedMs >= MQTT_RETRY_MS) {
        mqttTried = true;
        mqttTriedMs = millis();
        if (mqttClient.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD)) {
          Serial.println("WEB: MQTT connected");
          lastSignature = 0xFFFFFFFFUL;
        } else {
          Serial.print("WEB: MQTT failed, state ");
          Serial.println(mqttClient.state());
        }
      }
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    mqttClient.loop();

    WebSnapshot snap;
    portENTER_CRITICAL(&webMux);
    snap = webShared;
    portEXIT_CRITICAL(&webMux);

    unsigned long now = millis();
    uint32_t signature = webSignature(snap);
    bool due = now - lastMqttPublishMs >= MQTT_PUBLISH_INTERVAL_MS;
    bool changed = signature != lastSignature &&
                   now - lastMqttPublishMs >= WEB_MIN_GAP_MS;

    if (snap.sensorsReady && (due || changed)) {
      lastMqttPublishMs = now;
      size_t length = buildWebPayload(snap, bootId, ++seq, payload, sizeof(payload));
      if (length > 0 && mqttClient.publish(topic, payload)) {
        lastSignature = signature;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

void connectWebTelemetry() {
  if (webTaskHandle != nullptr) return;
  xTaskCreatePinnedToCore(webTelemetryTask, "webTelemetry", 12288,
                          nullptr, 1, &webTaskHandle, 0);
}

// อ่านค่าอย่างเดียว ใช้เวลาไม่กี่ไมโครวินาที และไม่เปลี่ยนตัวแปรของตู้
void updateWebTelemetry() {
  static bool lastTempPending = false;
  static bool sensorsReady = false;
  static uint8_t lastState = 0xFF;
  static bool lastPumpOn = false;
  static unsigned long lastPumpRunMs = 0;
  static uint8_t faultCode = WEB_FAULT_NONE;

  // ค่าเซนเซอร์ชุดแรกพร้อมเมื่อการแปลงอุณหภูมิรอบแรกเสร็จ
  if (lastTempPending && !tempConversionPending) sensorsReady = true;
  lastTempPending = tempConversionPending;

  bool pumpOn = pumpStartedMs != 0;
  unsigned long pumpRunMs = pumpOn ? millis() - pumpStartedMs : 0;

  // enterFault() ไม่เก็บสาเหตุไว้ จึงดูจากสถานะก่อนเข้า FAULT:
  // ปั๊มเดินเกือบครบ 10 นาที = ปั๊มเกินเวลา, นอกนั้น = สวิตช์เลือกโหมดผิดปกติ
  if (state == FAULT_LOCK && lastState != FAULT_LOCK) {
    faultCode = (lastPumpOn && lastPumpRunMs + 1000UL >= MAX_PUMP_TIME_MS)
      ? WEB_FAULT_PUMP_TIMEOUT
      : WEB_FAULT_SELECTOR;
  }
  lastState = state;
  lastPumpOn = pumpOn;
  lastPumpRunMs = pumpRunMs;

  WebSnapshot next;
  next.sensorsReady = sensorsReady;
  next.temperatureC = temperatureC;
  next.temperatureValid = temperatureValid;
  next.pH = pHValue;
  next.ec = ecValue;
  next.mode = currentMode;
  next.state = state;
  next.selector = readSelectorRaw();
  next.tank1Full = tank1Full();
  next.tank2Full = tank2Full();
  next.pumpOn = pumpOn;
  next.pumpRunS = pumpRunMs / 1000UL;
  next.alarmOn = alarmOn;
  next.stopPressed = stopPressed();
  next.faultCode = state == FAULT_LOCK ? faultCode : WEB_FAULT_NONE;
  next.probeInWater = probeInWater;

  portENTER_CRITICAL(&webMux);
  webShared = next;
  portEXIT_CRITICAL(&webMux);
}

// ======================== SETUP ========================
void setup() {
  Serial.begin(115200);

  pinMode(PIN_FLOAT_TANK1, INPUT_PULLUP);
  pinMode(PIN_FLOAT_TANK2, INPUT_PULLUP);
  pinMode(PIN_START, INPUT_PULLUP);
  pinMode(PIN_STOP, INPUT_PULLUP);
  pinMode(PIN_MODE_MANUAL, INPUT_PULLUP);
  pinMode(PIN_MODE_AUTO, INPUT_PULLUP);

  pinMode(PIN_PH, INPUT);
  pinMode(PIN_EC, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_EC, ADC_11db);

  pinMode(RELAY_PUMP1, OUTPUT);
  pinMode(LAMP_WHITE, OUTPUT);
  pinMode(LAMP_GREEN, OUTPUT);
  pinMode(LAMP_YELLOW, OUTPUT);
  pinMode(LAMP_ALARM, OUTPUT);
  pinMode(LAMP_RED, OUTPUT);

  turnOffAllOutputs();

  // LCD1602 I2C
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcdPrintLine(0, "GreenCrop");
  lcdPrintLine(1, "Starting...");

  tempSensor.begin();
  tempSensor.setResolution(10);
  tempSensor.setWaitForConversion(false);

  // เริ่มการส่งค่าเซนเซอร์ขึ้นเว็บ โดยไม่ยุ่งกับ LCD หรือระบบควบคุม
  connectWebTelemetry();

  delay(500);

  SelectorStatus selector = readSelectorRaw();
  if (selector == SELECTOR_MANUAL) {
    resetForMode(MANUAL_MODE);
  } else if (selector == SELECTOR_AUTO) {
    resetForMode(AUTO_MODE);
  } else {
    enterFault("Selector invalid at startup");
  }

  lastSensorRequestMs = millis() - SENSOR_INTERVAL_MS;
  lastLcdUpdateMs = 0;
  lcd.clear();

  Serial.println("GreenCrop ESP32 + LCD1602 ready");
}

// ======================== LOOP ========================
void loop() {
  updateSensors();
  updateWebTelemetry();
  updateLCD();
  updateAlarm();

  if (state == FAULT_LOCK) {
    pumpSet(false);
    alarmTimed = false;
    alarmSet(true);
    outputWrite(LAMP_RED, true);
    delay(5);
    return;
  }

  SelectorStatus selector = readSelectorDebounced();

  if (selector == SELECTOR_INVALID) {
    if (selectorInvalidStartedMs == 0) {
      selectorInvalidStartedMs = millis();
    } else if (millis() - selectorInvalidStartedMs >=
               SELECTOR_FAULT_DELAY_MS) {
      enterFault("Selector contacts invalid");
      return;
    }
  } else {
    selectorInvalidStartedMs = 0;

    ControlMode selectedMode =
      selector == SELECTOR_MANUAL ? MANUAL_MODE : AUTO_MODE;

    if (selectedMode != currentMode) {
      resetForMode(selectedMode);
    }
  }

  updateModeLamps();
  bool startEvent = startPressedEvent();

  if (stopPressed()) {
    pumpSet(false);
    alarmSet(false);

    if (currentMode == MANUAL_MODE) {
      if (state == MAN_PUMPING) setState(MAN_WAIT_START);
    } else {
      setState(AUTO_IDLE);
    }

    updateModeLamps();
    delay(5);
    return;
  }

  if (currentMode == MANUAL_MODE) {
    runManual(startEvent);
  } else {
    runAuto(startEvent);
  }

  updateModeLamps();
  delay(5);
}

