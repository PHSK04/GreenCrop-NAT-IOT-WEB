# เฟิร์มแวร์ตู้ปั๊ม + ส่งค่าขึ้นเว็บ (greencrop_cabinet_web)

ตู้ทำงานเหมือนเดิมทุกอย่าง (MANUAL/AUTO, START/STOP, ลูกลอยถัง 1/2, ปั๊ม, ไฟ, LCD, FAULT) ส่วนที่เพิ่มมาส่งค่าขึ้นเว็บ WolffiaSmart ผ่าน HiveMQ อย่างเดียว เว็บสั่งงานตู้ไม่ได้

## ตั้งค่าก่อนอัปโหลด

1. ที่เว็บ ไปหน้า **อุปกรณ์ → เพิ่มอุปกรณ์** จับคู่รหัส `GREENCROP01` (หรือรหัสที่ใช้)
2. กด **•••** ที่อุปกรณ์นั้น เว็บจะแสดงค่า `TENANT_ID` และ `DEVICE_ID`
3. แก้บรรทัดบนสุดของ `greencrop_cabinet_web.ino`:
   - `WIFI_SSID`, `WIFI_PASSWORD`
   - `MQTT_PASSWORD` (รหัส HiveMQ ของ `GreenCropnat`)
   - `TENANT_ID`, `DEVICE_ID` ตามข้อ 2
4. ไลบรารี: LiquidCrystal_I2C, OneWire, DallasTemperature, PubSubClient
5. บอร์ด ESP32 Dev Module (ทดสอบ compile แล้วกับ esp32 core 3.3.11)

Serial Monitor (115200) จะขึ้น `WEB: topic tenants/.../sensors` และ `WEB: MQTT connected` เมื่อต่อสำเร็จ

## สิ่งที่เปลี่ยนจาก greencrop_web_telemetry.ino

- โค้ดควบคุมตู้ `setup()` และ `loop()` เหมือนเดิมทุกบรรทัด เปลี่ยนเฉพาะส่วน WEB TELEMETRY
- WiFi/MQTT ย้ายไปทำงานใน task แยกบน core 0 ของเดิมรอ WiFi สูงสุด 15 วินาทีทุกรอบ `loop()` ตอนเน็ตหลุด ซึ่งระหว่างนั้นปุ่ม STOP ลูกลอย และตัวตัดปั๊ม 10 นาทีไม่ทำงาน ตอนนี้ `loop()` ไม่ต้องรอเน็ตแล้ว
- ส่งไปที่ `tenants/<TENANT_ID>/devices/<DEVICE_ID>/sensors` แทน `smartfarm/sensors` เพราะเว็บ WolffiaSmart แสดงเฉพาะข้อมูลของบัญชีที่ล็อกอิน
- ส่งทุก 1 วินาที และส่งทันทีเมื่อสถานะตู้เปลี่ยน (ไม่ถี่กว่า 250 ms)

## ข้อมูลที่ส่ง

```json
{"device_id":"GREENCROP01","msg_id":"GREENCROP01-1A2B3C4D-42",
 "ph_value":6.55,"ec_value":1.23,"temp_c":27.4,"temp_valid":true,
 "wls1":true,"wls2":false,"pump1_on":true,"pump_run_s":42,
 "mode":"AUTO","state":"AUTO_PUMPING","selector":"AUTO",
 "alarm_on":false,"stop_pressed":false,"fault":false,"fault_code":null,
 "uptime_seconds":1234,"rssi":-61}
```

- `wls1` / `wls2` = ลูกลอยถัง 1 / ถัง 2 เต็ม
- `temp_c` เป็น `null` เมื่ออ่าน DS18B20 ไม่ได้ (จอตู้แสดง `T:ERR`)
- `fault_code`: `pump_timeout` หรือ `selector_invalid` เดาจากสถานะก่อนเข้า FAULT เพราะ `enterFault()` เดิมไม่เก็บสาเหตุไว้ (ดูสาเหตุจริงได้ที่ Serial)
- `probe_in_water`: `false` เมื่อหัววัดไม่ได้จุ่มน้ำ ตอนนั้น pH, EC และอุณหภูมิส่งเป็น 0

## หัววัดไม่ได้จุ่มน้ำ = 0

หัว pH ในอากาศอ่านได้ประมาณ 7 จึงดูจากหัว EC แทน

- EC ต่ำกว่า `EC_DRY_ENTER_MS` (0.05 mS/cm) ติดกัน 3 ครั้ง = ไม่ได้จุ่มน้ำ จอ LCD, Serial และเว็บแสดง pH, EC, อุณหภูมิเป็น 0
- EC เกิน `EC_DRY_EXIT_MS` (0.10 mS/cm) ติดกัน 3 ครั้ง = กลับมาแสดงค่าจริง
- `DRY_PROBE_ZERO_TEMP = false` ถ้าอยากให้อุณหภูมิแสดงค่าจริงแม้ไม่ได้จุ่มน้ำ
- ส่วนควบคุมปั๊มไม่ได้ใช้ค่าเหล่านี้ ตู้จึงทำงานเหมือนเดิม
- ยกหัววัดขึ้นแล้ว Serial ไม่ขึ้น `PROBE: not in water` แปลว่าหัว EC อ่านในอากาศได้เกิน 0.05 ให้ตั้ง `EC_DRY_ENTER_MS` สูงกว่าค่าที่เห็นเล็กน้อย

## ข้อจำกัด

- ใช้ `setInsecure()` กับ HiveMQ เหมือนของเดิม คือไม่ตรวจใบรับรอง TLS
- ใครมีรหัส HiveMQ ก็ส่งข้อมูลเข้า tenant ไหนก็ได้ ระบบตรวจเจ้าของอุปกรณ์ฝั่งเซิร์ฟเวอร์ยังอยู่ใน draft PR #7
