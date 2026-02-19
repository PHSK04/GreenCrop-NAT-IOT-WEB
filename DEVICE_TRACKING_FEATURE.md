# 📱 Device Tracking Feature - บันทึกอุปกรณ์ที่ Login อัตโนมัติ

## ✨ ฟีเจอร์ใหม่

ระบบจะ**บันทึกข้อมูลอุปกรณ์อัตโนมัติ**ทุกครั้งที่ user login โดยไม่ต้องกรอกข้อมูลเอง!

### 📊 ข้อมูลที่บันทึก:

| ข้อมูล               | ตัวอย่าง                           | คำอธิบาย            |
| -------------------- | ---------------------------------- | ------------------- |
| **Device Type**      | Mobile, Tablet, Desktop            | ประเภทอุปกรณ์       |
| **Device Name**      | iPhone (iOS 18), iPad Pro, MacBook | ชื่ออุปกรณ์ที่ใช้   |
| **Browser**          | Safari, Chrome, Firefox            | เบราว์เซอร์ที่ใช้   |
| **Browser Version**  | 17.2, 120.0                        | เวอร์ชันเบราว์เซอร์ |
| **Operating System** | iOS 18.2, macOS 15.1, Windows 11   | ระบบปฏิบัติการ      |
| **IP Address**       | 192.168.1.100                      | ที่อยู่ IP          |
| **Login Time**       | 2026-02-15 21:30:00                | เวลาที่ login       |
| **Status**           | active, logged_out                 | สถานะ session       |

---

## 🎯 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: Login จาก iPhone

```
User: admin@smartiot.com
Device Type: Mobile
Device Name: iPhone (iOS 18)
Browser: Safari 17.2
OS: iOS 18.2
IP: 192.168.1.50
Login Time: 2026-02-15 21:30:15
```

### ตัวอย่างที่ 2: Login จาก MacBook

```
User: admin@smartiot.com
Device Type: Desktop
Device Name: Mac
Browser: Google Chrome 120.0
OS: macOS 15.1
IP: 192.168.1.100
Login Time: 2026-02-15 22:15:30
```

### ตัวอย่างที่ 3: Login จาก Windows PC

```
User: user@example.com
Device Type: Desktop
Device Name: Windows 10/11 PC
Browser: Microsoft Edge 120.0
OS: Windows 10/11
IP: 192.168.1.75
Login Time: 2026-02-15 09:00:00
```

---

## 🔧 การทำงาน

### 1. เมื่อ User Login

```javascript
// ระบบจะ:
1. ตรวจสอบ username/password
2. ✅ ถ้าถูกต้อง → อ่านข้อมูลจาก User-Agent header
3. แยกข้อมูล: Device, Browser, OS
4. เก็บลง database table `login_sessions`
5. ส่ง response กลับไปให้ user
```

### 2. ข้อมูลที่ใช้ Detect

- **User-Agent String**: ข้อมูลจาก browser header
- **IP Address**: จาก request headers (x-forwarded-for, x-real-ip)

### 3. ตัวอย่าง User-Agent

```
iPhone:
Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1

MacBook (Chrome):
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36

Windows PC (Edge):
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0
```

---

## 📡 API Endpoints

### 1. ดู Login Sessions ทั้งหมด

```http
GET /api/login-sessions
```

**Response:**

```json
[
  {
    "id": 1,
    "user_name": "Admin User",
    "user_email": "admin@smartiot.com",
    "device_type": "Mobile",
    "device_name": "iPhone (iOS 18)",
    "browser": "Safari",
    "browser_version": "17.2",
    "os": "iOS 18.2",
    "ip_address": "192.168.1.50",
    "login_time": "2026-02-15T21:30:15.000Z",
    "logout_time": null,
    "session_duration_minutes": null,
    "status": "active"
  }
]
```

### 2. ดู Login Sessions ของ User คนใดคนหนึ่ง

```http
GET /api/login-sessions/user/:userId
```

**ตัวอย่าง:**

```http
GET /api/login-sessions/user/1
```

### 3. ดู Active Sessions (กำลัง Login อยู่)

```http
GET /api/login-sessions/active
```

---

## 💾 Database Table Structure

### Table: `login_sessions`

```sql
CREATE TABLE login_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    user_name NVARCHAR(100),
    user_email NVARCHAR(100),
    device_type NVARCHAR(50),      -- Mobile, Tablet, Desktop
    device_name NVARCHAR(255),     -- iPhone 17, iPad Pro, MacBook Pro
    browser NVARCHAR(100),         -- Chrome, Safari, Firefox
    browser_version NVARCHAR(50),
    os NVARCHAR(100),              -- iOS 18.2, macOS 15.1, Windows 11
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(MAX),      -- Full user agent string
    login_time DATETIME DEFAULT GETDATE(),
    logout_time DATETIME,
    session_duration_minutes INT,
    status NVARCHAR(20) DEFAULT 'active'  -- active, logged_out, expired
)
```

---

## 🔍 ตัวอย่าง Query

### ดู Login History ของ User

```sql
SELECT
    user_name,
    device_name,
    browser,
    os,
    ip_address,
    login_time,
    status
FROM login_sessions
WHERE user_email = 'admin@smartiot.com'
ORDER BY login_time DESC
```

### นับจำนวน Login แต่ละอุปกรณ์

```sql
SELECT
    device_type,
    device_name,
    COUNT(*) as login_count
FROM login_sessions
GROUP BY device_type, device_name
ORDER BY login_count DESC
```

### ดู Active Sessions ทั้งหมด

```sql
SELECT
    user_name,
    device_name,
    browser,
    ip_address,
    login_time
FROM login_sessions
WHERE status = 'active'
ORDER BY login_time DESC
```

---

## 🎨 การแสดงผลใน UI (ตัวอย่าง)

### หน้า User Profile

```
📱 Login History

┌─────────────────────────────────────────────────────┐
│ Device: iPhone (iOS 18)                             │
│ Browser: Safari 17.2                                │
│ IP: 192.168.1.50                                    │
│ Login: 15 Feb 2026, 21:30                           │
│ Status: 🟢 Active                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Device: MacBook                                     │
│ Browser: Chrome 120.0                               │
│ IP: 192.168.1.100                                   │
│ Login: 15 Feb 2026, 09:00                           │
│ Status: ⚪ Logged Out                               │
└─────────────────────────────────────────────────────┘
```

### หน้า Admin - Active Sessions

```
👥 Currently Active Users

User: admin@smartiot.com
├─ 📱 iPhone (iOS 18) - Safari - 192.168.1.50
└─ 💻 Mac - Chrome - 192.168.1.100

User: user@example.com
└─ 🖥️ Windows PC - Edge - 192.168.1.75
```

---

## 🔐 Security Features

### 1. IP Address Tracking

- บันทึก IP ทุกครั้งที่ login
- ตรวจจับการ login จาก IP ที่ผิดปกติ

### 2. Multiple Device Detection

- ดูได้ว่า user login จากกี่อุปกรณ์
- ตรวจจับการ login พร้อมกันหลายที่

### 3. Session Management

- ติดตามว่า session ไหนยัง active
- สามารถ force logout ได้

---

## 📊 ตัวอย่างการใช้งานจริง

### Scenario 1: ตรวจสอบ Unauthorized Access

```
Admin เห็นว่า user A login จาก:
- iPhone (ปกติ)
- Windows PC จาก IP ต่างประเทศ (ผิดปกติ!)

→ อาจมีการ hack account
```

### Scenario 2: Troubleshooting

```
User บอกว่า login ไม่ได้

Admin ดู login_sessions:
- เห็นว่า user ใช้ browser เก่า (IE 11)
- แนะนำให้เปลี่ยนเป็น Chrome/Safari
```

### Scenario 3: Analytics

```
ดูสถิติการใช้งาน:
- 60% login จาก Mobile
- 30% login จาก Desktop
- 10% login จาก Tablet

→ ควรปรับ UI ให้เหมาะกับ Mobile มากขึ้น
```

---

## 🚀 การทดสอบ

### 1. Login จากอุปกรณ์ต่างๆ

```bash
# Login จาก iPhone
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)..." \
  -d '{"email":"admin@smartiot.com","password":"password123"}'

# ดู sessions
curl http://localhost:3001/api/login-sessions
```

### 2. ดูข้อมูลใน Database

```sql
-- ใน Azure Data Studio
SELECT * FROM login_sessions ORDER BY login_time DESC
```

### 3. ทดสอบจาก Web Browser

```
1. เปิด http://localhost:3000
2. Login ด้วย admin@smartiot.com
3. ดูใน database → จะเห็นข้อมูลอุปกรณ์ถูกบันทึก
```

---

## 📝 ไฟล์ที่เกี่ยวข้อง

| ไฟล์                       | หน้าที่                               |
| -------------------------- | ------------------------------------- |
| `server/deviceDetector.js` | ตรวจจับข้อมูลอุปกรณ์จาก User-Agent    |
| `server/database_mssql.js` | สร้าง table `login_sessions`          |
| `server/server.js`         | บันทึกข้อมูลตอน login + API endpoints |

---

## ✅ สรุป

### ข้อดี:

- ✅ **อัตโนมัติ 100%** - ไม่ต้องให้ user กรอกข้อมูล
- ✅ **ละเอียด** - รู้ทุกอย่างเกี่ยวกับอุปกรณ์
- ✅ **Security** - ตรวจจับการ login ผิดปกติ
- ✅ **Analytics** - วิเคราะห์พฤติกรรมการใช้งาน

### การใช้งาน:

1. User login ตามปกติ
2. ระบบบันทึกข้อมูลอุปกรณ์อัตโนมัติ
3. Admin ดูได้จาก API `/api/login-sessions`
4. หรือดูใน database table `login_sessions`

**ไม่ต้องทำอะไรเพิ่ม - ทำงานอัตโนมัติทันที!** 🎉

---

_เอกสารนี้สร้างเมื่อ: 15 กุมภาพันธ์ 2569 เวลา 21:35 น._
