# คู่มือการทดสอบระบบ IoT (MQTT)

ตอนนี้หน้าเว็บของคุณเชื่อมต่อกับระบบ MQTT เรียบร้อยแล้ว สามารถทดสอบการรับ-ส่งข้อมูลได้โดยไม่ต้องมีฮาร์ดแวร์จริง ดังนี้ครับ:

## 1. วิธีทดสอบการส่งข้อมูลเข้าเว็บ (Simulate Sensors)

เราจะจำลองตัวเองเป็นบอร์ด ESP32 เพื่อส่งค่า Sensor เข้าไปแสดงบนหน้าเว็บ

1.  เปิดเว็บ [HiveMQ Web Client](http://www.hivemq.com/demos/websocket-client/)
2.  กดปุ่ม **Connect**
3.  ตั้งค่าการส่งข้อมูล (Publish):
    - **Topic**: `smartfarm/sensors`
    - **Message** (ก๊อปปี้โค้ด JSON ด้านล่างไปวาง):

```json
{
  "isOn": true,
  "pressure": 5.5,
  "flow": 28.0,
  "ec": 3.2,
  "activeTank": 3,
  "pumps": [true, false, true, false, false]
}
```

4.  กดปุ่ม **Publish**
    - สังเกตที่หน้า Dashboard ของคุณ ค่าต่างๆ (แรงดัน, การไหล, สถานะปั๊ม) จะเปลี่ยนตามทันที

---

## 2. วิธีทดสอบการสั่งงานจากเว็บ (Control Machine)

ทดสอบว่าเมื่อกดปุ่มบนเว็บ แล้วคำสั่งถูกส่งออกมาหรือไม่

1.  ที่หน้าเว็บ HiveMQ เดิม
2.  ตั้งค่าการรับข้อมูล (Subscriptions):
    - กด **Add New Topic Subscription**
    - **Topic**: `smartfarm/control`
3.  กลับไปที่หน้า Dashboard ของคุณ แล้วกดปุ่ม **Power** (เปิด/ปิดเครื่อง)
4.  กลับมาดูที่หน้า HiveMQ คุณจะเห็นข้อความเด้งเข้ามา เช่น:
    ```json
    {
      "command": "START",
      "timestamp": 1700000000
    }
    ```

---

## 3. ข้อมูลสำหรับนำไปเขียนโค้ดลงบอร์ด (ESP32/Arduino)

- **MQTT Broker**: `broker.hivemq.com`
- **Port**: `1883` (TCP) หรือ `8000` (WebSocket)
- **Topic ที่ต้อง Subscribe (รอรับคำสั่ง)**: `smartfarm/control`
- **Topic ที่ต้อง Publish (ส่งค่า Sensor)**: `smartfarm/sensors`

---

## 4. ถ้าต้องการเชื่อมต่อกับ ThingSpeak

หากคุณต้องการใช้ **ThingSpeak** แทนหรือใช้ร่วมกับ MQTT (เช่น เพื่อเก็บกราฟย้อนหลัง) การเชื่อมต่อจะเปลี่ยนจาก MQTT เป็น **HTTP API (REST API)** ครับ

### สิ่งที่ต้องใช้เชื่อมต่อ

1.  **Channel ID**: เลขประจำตัวห้องข้อมูล
2.  **Read API Key**: กุญแจสำหรับอ่านข้อมูล (ถ้าห้องเป็น Private)

### วิธีการทำงาน

Web จะต้องทำหน้าที่ "ไปดึงข้อมูล" (Polling) ซ้ำๆ ทุกๆ 1-3 วินาที (ไม่เหมือน MQTT ที่ข้อมูลวิ่งมาหาเอง)

### ตัวอย่าง URL สำหรับดึงข้อมูล

- **อ่านค่าล่าสุด 1 ค่า (สำหรับ Real-time):**
  `https://api.thingspeak.com/channels/<CHANNEL_ID>/feeds/last.json?api_key=<READ_API_KEY>`

- **อ่านค่ากราฟย้อนหลัง (เช่น 10 ค่าล่าสุด):**
  `https://api.thingspeak.com/channels/<CHANNEL_ID>/feeds.json?api_key=<READ_API_KEY>&results=10`

### การปรับโค้ดใน React (ตัวอย่าง)

ใส่ใน `useEffect` ของหน้า Dashboard:

```javascript
// ดึงข้อมูลทุกๆ 3 วินาที
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(
      "https://api.thingspeak.com/channels/YOUR_ID/feeds/last.json?api_key=YOUR_KEY",
    );
    const data = await response.json();

    // ThingSpeak ส่งค่ามาเป็น field1, field2... ต้องรู้ว่า field ไหนคืออะไร
    setPressure(parseFloat(data.field1));
    setFlowRate(parseFloat(data.field2));
  }, 3000);

  return () => clearInterval(interval);
}, []);
```

https://api.thingspeak.com/channels/เลขห้อง/feeds/last.json?api_key=คีย์อ่าน

---

## 5. คู่มือการต่อขาอุปกรณ์ (Hardware Wiring Guide)

สำหรับการต่ออุปกรณ์จริงเข้ากับบอร์ด (เช่น ESP32) เพื่อส่งค่าขึ้นเว็บ มีหลักการดังนี้ครับ:

### 1. แผนผังการต่อขา (Pin Mapping Setup Example)

ตัวอย่างการต่อขาเข้ากับบอร์ด ESP32:

| อุปกรณ์ (Device)    | ประเภทสัญญาณ              | ขาที่แนะนำ (ESP32 Pin)   | หมายเหตุ                    |
| :------------------ | :------------------------ | :----------------------- | :-------------------------- |
| **Relay** (ปั๊มน้ำ) | Digital Output            | GPIO 26, 27, 14, 12      | ใช้เปิด-ปิดปั๊ม (High/Low)  |
| **Water Flow**      | Digital Input (Interrupt) | GPIO 34                  | วัดสัญญาณ Pulse             |
| **pH Sensor**       | Analog Input (ADC)        | GPIO 36 (VP)             | ค่า 0-4095 แปลงเป็น 0-14 pH |
| **Pressure Sensor** | Analog Input (ADC)        | GPIO 39 (VN)             | ค่า 0-5V แปลงเป็น Bar       |
| **Ultra Sonic**     | Digital (Trig/Echo)       | GPIO 5 (Trig), 18 (Echo) | วัดระดับน้ำในถัง            |

### 2. หลักการเขียนโค้ด (Arduino C++)

**Step 1: อ่านค่า Sensor**

```cpp
// ตัวอย่างอ่านค่า pH (Analog)
int sensorValue = analogRead(36);
float phValue = sensorValue * (5.0 / 4095.0) * 3.5; // (สูตรสมมติ ต้อง CALIBRATE)
```

**Step 2: แพ็คข้อมูลเป็น JSON**

```cpp
// ใช้ library ArduinoJson
StaticJsonDocument<200> doc;
doc["isOn"] = true;
doc["pressure"] = 5.4;
doc["ph"] = phValue;

char jsonBuffer[512];
serializeJson(doc, jsonBuffer);
```

**Step 3: ส่งข้อมูล (MQTT Publish)**

```cpp
client.publish("smartfarm/sensors", jsonBuffer);
```

**Step 4: รับคำสั่ง (MQTT Callback)**
เมื่อเว็บกดปุ่มเปิด/ปิด โค้ดส่วนนี้จะทำงาน

```cpp
void callback(char* topic, byte* payload, unsigned int length) {
  // แกะข้อความ JSON
  String msg = "";
  for (int i=0; i<length; i++) msg += (char)payload[i];

  if (msg.indexOf("START") > -1) {
    digitalWrite(RELAY_PIN, HIGH); // เปิดปั๊ม
  } else {
    digitalWrite(RELAY_PIN, LOW); // ปิดปั๊ม
  }
}
```

---

## 6. ขั้นตอนการทดสอบระบบ (Testing Strategy)

เพื่อให้มั่นใจว่าระบบทำงานได้จริง แนะนำให้ทดสอบตาม step นี้ครับ:

### Step 1: ทดสอบหน้าเว็บ (ไม่มีฮาร์ดแวร์จริง)

- **เป้าหมาย**: เช็คว่าเว็บรับค่า MQTT ได้ และเข็มมิเตอร์กระดิกจริง
- **วิธีทำ**: ใช้ [HiveMQ Web Client](http://www.hivemq.com/demos/websocket-client/) ยิง JSON เข้ามา (ตามคู่มือข้อ 1)
- **ผลที่คาดหวัง**: ตัวเลขบน Dashboard ต้องเปลี่ยนทันทีที่กด Publish จาก HiveMQ

### Step 2: ทดสอบฮาร์ดแวร์พื้นฐาน (ยังไม่ต่อ Cloud)

- **เป้าหมาย**: เช็คว่าอ่านค่า Sensor ได้ถูกต้อง ไม่เพี้ยน
- **วิธีทำ**: เขียนโค้ดอ่าน Sensor แล้ว `Serial.println()` ค่าออกมาดูในคอมพิวเตอร์ (Arduino Serial Monitor)
- **ผลที่คาดหวัง**: ค่าที่อ่านได้ตรงกับความเป็นจริง (เช่น จุ่ม pH Sensor ในน้ำประปาได้ค่า ~7.0)

### Step 3: ทดสอบการเชื่อมต่อ (ฮาร์ดแวร์ -> Cloud)

- **เป้าหมาย**: เช็คว่า ESP32 ต่อเน็ตและส่งข้อมูลออกได้
- **วิธีทำ**: ให้ ESP32 ส่งค่า "Test Message" ขึ้นมา
- **การตรวจสอบ**: เปิด HiveMQ Web Client แล้วกด Subscribe หัวข้อ `smartfarm/sensors` รอดูว่ามีข้อความเข้ามาหรือไม่

### Step 4: ทดสอบเต็มระบบ (End-to-End Test) 🚀

- **เป้าหมาย**: เว็บสั่งงานเครื่องจักรได้จริง
- **วิธีทำ**:
  1.  กดปุ่ม **Power** บนหน้าเว็บ
  2.  สังเกตที่บอร์ด ESP32 ว่า **Relay (หรือ LED)** ติดหรือไม่
  3.  เมื่อ Relay ติด ให้ ESP32 อ่านค่า Sensor แล้วส่งกลับมาที่เว็บ
  4.  หน้าเว็บต้องแสดงสถานะว่า **"System Online"** และค่า Sensor ขยับ
