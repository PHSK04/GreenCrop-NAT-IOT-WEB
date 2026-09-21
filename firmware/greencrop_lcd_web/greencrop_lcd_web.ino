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
// ส่วนนี้ใช้ส่งค่าเซนเซอร์ขึ้นเว็บเท่านั้น ไม่รับคำสั่งและไม่ควบคุมปั๊ม
const char* WIFI_SSID = "ใส่ชื่อ WiFi";
const char* WIFI_PASSWORD = "ใส่รหัส WiFi";
const char* MQTT_SERVER = "862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "GreenCropnat";
const char* MQTT_PASSWORD = "GreenCropnat123456";
const char* MQTT_TOPIC = "smartfarm/sensors";

WiFiClientSecure mqttSecureClient;
PubSubClient mqttClient(mqttSecureClient);
unsigned long lastMqttPublishMs = 0;
const unsigned long MQTT_PUBLISH_INTERVAL_MS = 1000;

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
void connectWebTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long started = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
      delay(250);
    }
  }

  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    mqttSecureClient.setInsecure();
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    String clientId = "GREENCROP_DISPLAY_" + String((uint32_t)ESP.getEfuseMac(), HEX);
    mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD);
  }
}

void publishWebSensorValues() {
  if (!mqttClient.connected()) return;

  String payload = "{";
  payload += "\"device_id\":\"GREENCROP01\",";
  payload += "\"ph_value\":" + String(pHValue, 2) + ",";
  payload += "\"ec_value\":" + String(ecValue, 2) + ",";
  payload += "\"temp_c\":" + String(temperatureC, 1);
  payload += "}";

  mqttClient.publish(MQTT_TOPIC, payload.c_str());
}

void updateWebTelemetry() {
  connectWebTelemetry();
  mqttClient.loop();

  if (millis() - lastMqttPublishMs >= MQTT_PUBLISH_INTERVAL_MS) {
    lastMqttPublishMs = millis();
    publishWebSensorValues();
  }
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
