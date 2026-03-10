# บันทึกละเอียด: การยืนยันเครื่องจริง + การจับคู่ (ESP32)

## เป้าหมายของระบบนี้
ทำให้ระบบ **รู้แน่** ว่าผู้ใช้มีเครื่องจริงต่ออยู่ และแยกได้ชัดว่า:
- เครื่องนี้เป็น “ตัวจริง” (ฮาร์ดแวร์จริง)
- เครื่องนี้เป็นของ “ผู้ใช้คนนี้”
- แอดมินเห็นข้อมูลอุปกรณ์ที่ผูกไว้ได้ครบ

---

## แนวคิดหลัก (สั้นและชัด)
1. **ตัวตนเครื่องจริง (Hardware Identity)**
- ใช้ `device_id` จาก ESP32 (อ่านจากชิป เช่น MAC/eFuse)
- เป็นค่าเฉพาะของเครื่อง → **ห้ามเปลี่ยน**

2. **ยืนยันความเป็นเจ้าของ (Ownership / Pairing)**
- เครื่องสร้าง `pairing_code` 6–8 หลัก
- ผู้ใช้กรอกในเว็บเพื่อ “Claim” เครื่อง
- เมื่อผ่าน → ผูกเครื่องกับบัญชี user

3. **รองรับหลายเครื่องต่อ 1 ผู้ใช้**
- User 1 คน → มีได้หลาย `device_id`
- มีเครื่องหลัก (`is_primary`) เพื่อแสดงค่าเริ่มต้น

---

## ฟิลด์ที่สำคัญที่สุด (ทำให้เครื่องไม่พัง/ไม่ error)
**ต้องมี (สำคัญสุด):**
- `device_id` (ตัวจริงของเครื่อง)
- `pairing_code` (ยืนยันเจ้าของ)
- `user_id` / `tenant_id` (ผูกเจ้าของให้ถูกคน)
- `timestamp` (กันเวลามั่ว + sync ข้อมูล)

**สำคัญมาก (ความเสถียร):**
- `msg_id` (กันข้อมูลซ้ำ)
- `sensor_id` (แยกหลายเซนเซอร์ในเครื่องเดียว)
- `last_seen` (รู้ว่าเครื่องยังออนไลน์)
- `status` (paired/active/inactive)

---

## ฟิลด์ที่ “เปลี่ยนได้” เพื่อแยกเครื่องให้ผู้ใช้จำง่าย
**เปลี่ยนได้ โดยไม่กระทบ identity**
- `device_name` (ชื่อเครื่อง เช่น “ไข่ผำ บ่อ A เครื่อง 1”)
- `location` (ตำแหน่ง เช่น “โรงเรือน 1 / โซน B”)
- `is_primary` (กำหนดเครื่องหลัก)
- `notes` (หมายเหตุ)

**ห้ามเปลี่ยน**
- `device_id` (ต้องคงเดิมตลอด)

---

## โครงสร้างฐานข้อมูล (SQL Server)
ตาราง: `device_pairings`

**คอลัมน์**
- `id` (PK)
- `user_id`
- `user_email`
- `device_id` (unique)
- `device_name`
- `location`
- `pairing_code`
- `status`
- `created_at`
- `paired_at`
- `last_seen`
- `is_primary`
- `updated_at`

**กฎสำคัญ**
- `device_id` ต้อง unique (เครื่องจริง 1 เครื่อง = 1 แถว)
- `user_id` มีได้หลายแถว (หลายเครื่อง)
- ถ้ากำหนด `is_primary` = 1 → เครื่องอื่นของ user เดียวกันต้องเป็น 0

---

## API ที่ใช้จริง

### POST `/api/devices/pair`
**จุดประสงค์:** ผูกอุปกรณ์กับผู้ใช้ที่ล็อกอินอยู่

**Payload ตัวอย่าง**
```json
{
  "device_id": "7C9EBDAB12CD",
  "pairing_code": "123456",
  "device_name": "เครื่องไข่ผำ บ่อ A",
  "location": "โรงเรือน 1",
  "is_primary": true
}
```

**พฤติกรรม**
- ถ้า `device_id` ถูกผูกกับ user อื่น → ตอบ 409 (ห้ามยึด)
- ถ้าเป็น user เดิม → อัปเดตชื่อ/สถานที่ได้
- ถ้า user ยังไม่มีเครื่องหลัก → ระบบตั้งเครื่องนี้เป็น `primary` อัตโนมัติ

---

## Flow บนเว็บ (User)

### 1) หน้า “เชื่อมอุปกรณ์”
แสดงหลังล็อกอิน หากยังไม่เคยจับคู่

**ฟอร์มที่กรอก**
- `Device ID` (แก้ไม่ได้)
- `Device Name` (แก้ได้)
- `Location` (แก้ได้)
- `Pairing Code` (จากจอเครื่อง)

**ปุ่มหลัก**
- ยืนยัน → ส่ง `/api/devices/pair`
- ข้าม → เข้า Dashboard ได้ (ชั่วคราว)

---

## Flow บนเว็บ (Admin)
ในหน้า User Detail (Audit Logs) ต้องเห็น:
- Device ID
- Pairing Code
- Device Name
- Location
- Primary
- Last Seen

---

## โค้ด ESP32 (Arduino IDE) แบบละเอียด

### ไลบรารีที่ต้องใช้
- `WiFi.h`
- `HTTPClient.h`
- `Preferences.h`
- `Adafruit GFX`
- `Adafruit SSD1306`
- `qrcode` (by ricmoo)

---

### 1) อ่าน device_id จากชิป
```cpp
String getDeviceId() {
  uint64_t chipid = ESP.getEfuseMac(); // 48-bit MAC
  char id[13];
  sprintf(id, "%04X%08X", (uint16_t)(chipid>>32), (uint32_t)chipid);
  return String(id); // ตัวอย่าง: 7C9EBDAB12CD
}
```

---

### 2) สร้างและเก็บ pairing_code (ไม่เปลี่ยนหลังรีบูต)
```cpp
#include <Preferences.h>
Preferences prefs;

String loadOrCreatePairingCode() {
  prefs.begin("device", false);
  String code = prefs.getString("pairing", "");
  if (code.length() == 0) {
    randomSeed(esp_random());
    code = String(random(100000, 999999));
    prefs.putString("pairing", code);
  }
  prefs.end();
  return code;
}
```

---

### 3) แสดงบนจอ OLED (SSD1306)
```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void showTextOnOLED(String deviceId, String pairingCode) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.println("Device ID:");
  display.println(deviceId);

  display.println("");
  display.println("Pairing Code:");
  display.println(pairingCode);

  display.display();
}
```

---

### 4) สร้าง QR Code แสดงบน OLED
```cpp
#include "qrcode.h"

void showQRCode(String data) {
  display.clearDisplay();

  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(3)]; // Version 3
  qrcode_initText(&qrcode, qrcodeData, 3, ECC_LOW, data.c_str());

  int scale = 2;
  int offsetX = (SCREEN_WIDTH - qrcode.size * scale) / 2;
  int offsetY = (SCREEN_HEIGHT - qrcode.size * scale) / 2;

  for (int y = 0; y < qrcode.size; y++) {
    for (int x = 0; x < qrcode.size; x++) {
      if (qrcode_getModule(&qrcode, x, y)) {
        display.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, SSD1306_WHITE);
      }
    }
  }

  display.display();
}
```

**QR Data แนะนำ**
```json
{"device_id":"7C9EBDAB12CD","pairing_code":"123456"}
```

---

### 5) ส่งข้อมูลไป API เพื่อจับคู่
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";
const char* API_URL = "http://YOUR_SERVER/api/devices/pair";

void sendPairingToAPI(String deviceId, String pairingCode) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"device_id\":\"" + deviceId + "\",\"pairing_code\":\"" + pairingCode + "\"}";
  int code = http.POST(body);

  Serial.print("API status: ");
  Serial.println(code);

  http.end();
}
```

---

### 6) ตัวอย่างรวม (สั้นแต่ครบ)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "qrcode.h"

Preferences prefs;
Adafruit_SSD1306 display(128, 64, &Wire, -1);

String getDeviceId() {
  uint64_t chipid = ESP.getEfuseMac();
  char id[13];
  sprintf(id, "%04X%08X", (uint16_t)(chipid>>32), (uint32_t)chipid);
  return String(id);
}

String loadOrCreatePairingCode() {
  prefs.begin("device", false);
  String code = prefs.getString("pairing", "");
  if (code.length() == 0) {
    randomSeed(esp_random());
    code = String(random(100000, 999999));
    prefs.putString("pairing", code);
  }
  prefs.end();
  return code;
}

void showTextOnOLED(String deviceId, String pairingCode) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Device ID:");
  display.println(deviceId);
  display.println("");
  display.println("Pairing Code:");
  display.println(pairingCode);
  display.display();
}

void showQRCode(String data) {
  display.clearDisplay();
  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(3)];
  qrcode_initText(&qrcode, qrcodeData, 3, ECC_LOW, data.c_str());

  int scale = 2;
  int offsetX = (128 - qrcode.size * scale) / 2;
  int offsetY = (64 - qrcode.size * scale) / 2;

  for (int y = 0; y < qrcode.size; y++) {
    for (int x = 0; x < qrcode.size; x++) {
      if (qrcode_getModule(&qrcode, x, y)) {
        display.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, SSD1306_WHITE);
      }
    }
  }
  display.display();
}

void sendPairingToAPI(String deviceId, String pairingCode) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin("http://YOUR_SERVER/api/devices/pair");
  http.addHeader("Content-Type", "application/json");
  String body = "{\"device_id\":\"" + deviceId + "\",\"pairing_code\":\"" + pairingCode + "\"}";
  http.POST(body);
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) return;

  String deviceId = getDeviceId();
  String pairing = loadOrCreatePairingCode();

  showTextOnOLED(deviceId, pairing);
  delay(2000);

  String qr = "{\"device_id\":\"" + deviceId + "\",\"pairing_code\":\"" + pairing + "\"}";
  showQRCode(qr);

  WiFi.begin("YOUR_WIFI", "YOUR_PASS");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  sendPairingToAPI(deviceId, pairing);
}

void loop() {}
```

---

## ข้อควรระวัง
- `device_id` ห้ามเปลี่ยน
- `pairing_code` ควรคงเดิม (ถ้ารีเซ็ตจะทำให้ user ต้องจับคู่ใหม่)
- เมื่อเปลี่ยน `device_name` หรือ `location` ต้องไม่กระทบ device_id

---

## แผนขยาย (ถัดไป)
- Unpair device (ปลดเครื่อง)
- Update `last_seen` จาก heartbeat
- หน้า Device List ให้ผู้ใช้จัดการหลายเครื่อง
- QR scan ในเว็บเพื่อกรอกข้อมูลอัตโนมัติ

---

## คำถาม-คำตอบ (Q&A) จากที่คุยกัน

**Q: ถ้า 1 คนมีหลายเครื่อง จะทำยังไง?**
A: ให้ผูกได้หลาย `device_id` ต่อ 1 user และมี `is_primary` เพื่อเลือกเครื่องหลัก พร้อม dropdown สลับเครื่องใน Dashboard

**Q: Dashboard ควรทำงานยังไงเมื่อมีหลายเครื่อง?**
A: แนะนำให้เลือกเครื่องที่กำลังดู (Active Device) เป็นค่าเริ่มต้นจาก `primary` และสามารถสลับเครื่องได้

**Q: ฟิลด์ไหนสำคัญที่สุดเพื่อไม่ให้เครื่องพังหรือ error?**
A: `device_id`, `pairing_code`, `user_id/tenant_id`, `timestamp` (จำเป็น) และ `msg_id`, `sensor_id`, `last_seen` (เพื่อความเสถียร)

**Q: ส่วนไหนเปลี่ยนได้เพื่อแยกอุปกรณ์?**
A: `device_name`, `location`, `is_primary`, `notes` เปลี่ยนได้ แต่ `device_id` ห้ามเปลี่ยน

**Q: ทำยังไงให้รู้ว่า user มีเครื่องจริง?**
A: ใช้ Device Provisioning + Verification: เครื่องส่ง `device_id` + `pairing_code` จับคู่ แล้วติดตาม `last_seen`

**Q: device_id อยู่ตรงไหนของเครื่อง?**
A: อยู่ในชิป ESP32 อ่านได้จาก `ESP.getEfuseMac()` (MAC/eFuse)

**Q: ต้องแสดงรหัสบน OLED/LCD และ QR ยังไง?**
A: ใช้ไลบรารี `Adafruit_SSD1306` และ `qrcode` เพื่อแสดง `device_id` + `pairing_code`

**Q: ส่งข้อมูลไป API เพื่อจับคู่ยังไง?**
A: ESP32 ใช้ `HTTPClient` ส่ง JSON ไป `/api/devices/pair`

**Q: ต้องเก็บข้อมูลลง DB ไหม?**
A: ต้องเก็บในตาราง `device_pairings` เพื่อให้ admin เห็นและผูก ownership

**Q: Admin ต้องเห็นอะไรบ้าง?**
A: Device ID, Pairing Code, Device Name, Location, Primary flag, Last Seen

