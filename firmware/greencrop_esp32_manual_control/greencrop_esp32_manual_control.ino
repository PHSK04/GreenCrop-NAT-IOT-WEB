#include <OneWire.h>
#include <DallasTemperature.h>

// ==========================================
// 1. ตั้งค่าอุปกรณ์และขาพอร์ต (ESP32)
// ==========================================
const int pinTemp = 4;
OneWire oneWire(pinTemp);
DallasTemperature tempSensor(&oneWire);  // เซ็นเซอร์อุณหภูมิ DS18B20

// ขา Input (สัญญาณดิจิตอล)
const int pinWLS1 = 13;   // เซ็นเซอร์น้ำตัวล่าง ถัง 1
const int pinWLS2 = 14;   // เซ็นเซอร์น้ำตัวบน ถัง 1
const int pinStart = 27;  // ปุ่ม Start (NO) ปั๊ม 2
const int pinStop = 26;   // ปุ่ม Stop (NC) ฉุกเฉิน
const int pinFloat = 25;  // สวิตช์ลูกลอย ถัง 2

// ขา Input (สัญญาณแอนะล็อก)
const int pinPH = 32;   // เซ็นเซอร์วัดค่า pH
const int pinTDS = 34;  // เซ็นเซอร์วัดค่า EC (TDS)

// ขา Output (สั่งงานรีเลย์และเสียง)
const int relayPump1 = 33;  // รีเลย์ ปั๊ม 1 (ช่อง IN1)
const int relayPump2 = 5;   // รีเลย์ ปั๊ม 2 + ไฟเหลือง (ช่อง IN2)
const int relayGreen = 18;  // รีเลย์ ไฟเขียว (ช่อง IN3)
const int relayRed = 19;    // รีเลย์ ไฟแดง (ช่อง IN4)
const int pinISD = 23;      // โมดูลเสียง ISD1820

// ==========================================
// 2. ตัวแปรเก็บสถานะของระบบ
// ==========================================
int pump2Status = 0;    // 0 = ปั๊ม 2 หยุด, 1 = ปั๊ม 2 เดิน
bool isLocked = false;  // false = โหมดปกติ, true = โหมดติดล็อคฉุกเฉิน

float pH_Value = 0.0;
float EC_Value = 0.0;
float temp_Value = 25.0;

unsigned long lastUpdate = 0;  // ตัวแปรสำหรับจับเวลาแสดงผลบนคอมพิวเตอร์

void setup() {
  // เปิดพอร์ตสื่อสารกับคอมพิวเตอร์ (ดูข้อมูลผ่าน Serial Monitor)
  Serial.begin(9600);

  // เริ่มต้นการทำงานของเซ็นเซอร์อุณหภูมิ
  tempSensor.begin();

  // --- ตั้งค่าโหมด Input ---
  // ใช้ PULLDOWN ดึงไฟเป็น 0V ป้องกันไฟค้างตอนเซ็นเซอร์ WLS แห้ง
  pinMode(pinWLS1, INPUT_PULLDOWN);
  pinMode(pinWLS2, INPUT_PULLDOWN);

  pinMode(pinStart, INPUT_PULLUP);
  pinMode(pinStop, INPUT_PULLUP);
  pinMode(pinFloat, INPUT_PULLUP);

  // --- ตั้งค่าโหมด Output ---
  pinMode(relayPump1, OUTPUT);
  pinMode(relayPump2, OUTPUT);
  pinMode(relayGreen, OUTPUT);
  pinMode(relayRed, OUTPUT);
  pinMode(pinISD, OUTPUT);

  // --- กำหนดสถานะเริ่มต้น (ดับทุกอย่างก่อนเริ่มงาน) ---
  // รีเลย์แบบ Active LOW ต้องสั่งไฟ HIGH (3.3V) ถึงจะหยุดทำงาน
  digitalWrite(relayPump1, HIGH);
  digitalWrite(relayPump2, HIGH);
  digitalWrite(relayGreen, HIGH);
  digitalWrite(relayRed, HIGH);
  digitalWrite(pinISD, LOW);  // โมดูลเสียงสั่ง LOW คือเงียบ

  Serial.println("System Ready... Start Reading Sensors.");
  delay(1000);
}

void loop() {
  // ==========================================
  // ขั้นตอนที่ 1: อ่านค่า Input ทั้งหมด
  // ==========================================

  // อ่านสถานะสวิตช์และลูกลอย (ดิจิตอล)
  int stateWLS1 = digitalRead(pinWLS1);
  int stateWLS2 = digitalRead(pinWLS2);
  int stateStart = digitalRead(pinStart);
  int stateStop = digitalRead(pinStop);
  int stateFloat = digitalRead(pinFloat);

  // อ่านค่าอุณหภูมิ
  tempSensor.requestTemperatures();
  temp_Value = tempSensor.getTempCByIndex(0);
  if (temp_Value < 0.0) {
    temp_Value = 25.0;  // ค่าสำรองกรณีสายเซ็นเซอร์หลุด
  }

  // อ่านค่า pH (คำนวณแบบสมการเส้นตรงพื้นฐาน)
  float voltagePH = analogRead(pinPH) * (3.3 / 4095.0);
  pH_Value = (-5.70 * voltagePH) + 21.34;
  if (pH_Value < 0) pH_Value = 0;
  if (pH_Value > 14) pH_Value = 14;

  // อ่านค่า EC (แปลงจาก TDS พร้อมชดเชยค่าตามอุณหภูมิน้ำจริง)
  float voltageTDS = analogRead(pinTDS) * (3.3 / 4095.0);
  float compCoeff = 1.0 + 0.02 * (temp_Value - 25.0);
  float compVoltage = voltageTDS / compCoeff;
  float tds = (133.42 * pow(compVoltage, 3) - 255.86 * pow(compVoltage, 2) + 857.39 * compVoltage) * 0.5;
  EC_Value = (tds * 2.0) / 1000.0;  // แปลงให้อยู่ในหน่วย mS/cm

  // ==========================================
  // ขั้นตอนที่ 2: ระบบควบคุม (Control Logic)
  // ==========================================

  // -- เช็คปุ่มฉุกเฉิน (Stop NC) --
  if (stateStop == HIGH) {
    pump2Status = 0;
    isLocked = true;  // เข้าสู่โหมดติดล็อค

    // บังคับหยุดการทำงานทุกอุปกรณ์ทันที
    digitalWrite(relayPump1, HIGH);
    digitalWrite(relayPump2, HIGH);
    digitalWrite(relayGreen, HIGH);
    digitalWrite(relayRed, HIGH);
    digitalWrite(pinISD, LOW);
  } else {
    // -- เช็คการปลดล็อค (ต้องรอน้ำเต็มถึง WLS2) --
    if (stateWLS2 == HIGH) {
      isLocked = false;  // ปลดล็อคระบบ
    }

    // -- แยกการทำงานระหว่าง โหมดติดล็อค VS โหมดปกติ --
    if (isLocked == true) {
      // โหมดติดล็อค: เพิกเฉยต่อคำสั่งอื่น จนกว่าจะปลดล็อค
      digitalWrite(relayPump1, HIGH);
      digitalWrite(relayPump2, HIGH);
      digitalWrite(relayGreen, HIGH);
      digitalWrite(relayRed, HIGH);
      digitalWrite(pinISD, LOW);
    } else {
      // โหมดปกติ: ดำเนินการตามเงื่อนไข

      // 1. เงื่อนไข ปั๊ม 1 (เช็คน้ำและ pH)
      if (stateWLS2 == HIGH) {
        digitalWrite(relayPump1, HIGH);  // น้ำเต็ม ปั๊ม 1 ดับ
      } else if (stateWLS1 == HIGH) {
        // น้ำถึงเซ็นเซอร์ล่าง ให้เช็คค่า pH
        if (pH_Value >= 6.5 && pH_Value <= 7.5) {
          digitalWrite(relayPump1, LOW);  // pH ผ่าน ปั๊ม 1 เดิน
        } else {
          digitalWrite(relayPump1, HIGH);  // pH ไม่ผ่าน ปั๊ม 1 ดับ
        }
      } else {
        digitalWrite(relayPump1, HIGH);  // น้ำแห้ง ปั๊ม 1 ดับ
      }

      // 2. เงื่อนไข ปั๊ม 2 (กดปุ่ม Start แล้วทำงานค้าง)
      if (stateStart == LOW) {
        pump2Status = 1;  // ล็อคสถานะเป็นทำงาน
      }

      if (pump2Status == 1) {
        digitalWrite(relayPump2, LOW);  // ปั๊ม 2 และ ไฟเหลือง ติด
      } else {
        digitalWrite(relayPump2, HIGH);  // ปั๊ม 2 และ ไฟเหลือง ดับ
      }

      // 3. เงื่อนไข ไฟเขียว (สถานะพร้อมใช้งาน)
      if (stateWLS2 == HIGH) {
        if (pump2Status == 0) {
          digitalWrite(relayGreen, LOW);  // น้ำเต็ม + ปั๊ม 2 ไม่ทำงาน -> ไฟเขียวติด
        } else {
          digitalWrite(relayGreen, HIGH);  // ปั๊ม 2 เดินอยู่ -> ไฟเขียวดับ
        }
      } else {
        digitalWrite(relayGreen, HIGH);  // น้ำไม่เต็ม -> ไฟเขียวดับ
      }

      // 4. เงื่อนไข ไฟแดง และ เสียง (ลูกลอยถัง 2)
      if (stateFloat == LOW) {
        digitalWrite(relayRed, LOW);   // สั่งไฟแดงติด
        digitalWrite(pinISD, HIGH);    // สั่งโมดูลเสียงดัง
      } else {
        digitalWrite(relayRed, HIGH);  // สั่งไฟแดงดับ
        digitalWrite(pinISD, LOW);     // สั่งเสียงเงียบ
      }
    }
  }

  // ==========================================
  // ขั้นตอนที่ 3: อัปเดตการแสดงผลบนคอมพิวเตอร์
  // ==========================================

  // ใช้ millis() หน่วงเวลาให้ส่งข้อมูลทุกๆ 500 มิลลิวินาที (ครึ่งวินาที)
  if (millis() - lastUpdate >= 500) {
    lastUpdate = millis();

    // พิมพ์เส้นกั้นเพื่อให้อ่านง่าย
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
    if (isLocked == true) {
      Serial.println("LOCKED! (Emergency Stop)");
    } else if (pump2Status == 1) {
      Serial.println("PUMP 2 RUNNING (Manual)");
    } else {
      Serial.println("NORMAL (Standby/Pump 1 Auto)");
    }
    Serial.println("=============================");
  }
}

