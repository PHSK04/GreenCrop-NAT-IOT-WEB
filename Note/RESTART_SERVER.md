# 🚀 วิธี Restart Backend Server

## ⚠️ ต้อง Restart เพื่อให้ฟีเจอร์ใหม่ทำงาน!

### วิธีที่ 1: Restart ใน Terminal ที่เปิดอยู่

1. ไปที่ Terminal ที่รัน `node server.js`
2. กด `Ctrl + C` เพื่อหยุด server
3. รันใหม่:
   ```bash
   node server.js
   ```

### วิธีที่ 2: Restart ทั้งหมด

**Terminal 1 (Backend):**

```bash
# หยุด: Ctrl + C
cd server
node server.js
```

**Terminal 2 (Frontend):**

```bash
# หยุด: Ctrl + C
npm run dev
```

---

## ✅ ตรวจสอบว่า Restart สำเร็จ

หลัง restart ควรเห็น log:

```
✅ Connected to MSSQL Database
✅ Users table ready
✅ Audit logs table ready
✅ OTP table ready
✅ Sensor Data table ready
✅ Login Sessions table ready  ← ใหม่!
Server is running on http://localhost:3001
```

---

## 🧪 ทดสอบฟีเจอร์ใหม่

### 1. Login ผ่าน Web

```
1. เปิด http://localhost:3000
2. Login ด้วย admin@smartiot.com / password123
3. ดู console log ใน Terminal → ควรเห็น:
   📱 Device logged: Admin User from Mac (Google Chrome)
```

### 2. ดูข้อมูลใน Database

```
เปิด Azure Data Studio
→ เชื่อมต่อ localhost
→ เลือก database SmartIoTDB
→ ดู table login_sessions
→ จะเห็นข้อมูลอุปกรณ์ที่ login
```

### 3. ทดสอบผ่าน API

```bash
curl http://localhost:3001/api/login-sessions
```

---

## 📱 ฟีเจอร์ที่เพิ่มมา

✅ บันทึกข้อมูลอุปกรณ์อัตโนมัติเมื่อ login:

- Device Type (Mobile/Tablet/Desktop)
- Device Name (iPhone, iPad, MacBook, etc.)
- Browser (Chrome, Safari, Firefox, etc.)
- OS (iOS, macOS, Windows, etc.)
- IP Address
- Login Time

ดูรายละเอียดเพิ่มเติมใน: `DEVICE_TRACKING_FEATURE.md`
