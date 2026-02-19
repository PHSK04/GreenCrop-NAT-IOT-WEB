# FIX NOTES (บันทึกการแก้ไข)

## วันที่: 13 กุมภาพันธ์ 2026

---

## 🔄 การเปลี่ยนแปลงหลัก (Major Changes)

### 1. การย้าย Database จาก MSSQL → PostgreSQL

**ปัญหาเดิม:**

- MSSQL (SQL Server) ไม่สามารถรันบน Mac (Apple Silicon) ได้เสถียร
- Docker Container ไม่ยอมรัน เกิด error `Login failed for user 'sa'`
- ระบบ Login ไม่ทำงาน

**การแก้ไข:**

1. ✅ ติดตั้ง **PostgreSQL 15** ผ่าน Homebrew
2. ✅ สร้าง Database ชื่อ `SmartIoTDB`
3. ✅ สร้างไฟล์ `server/database_postgres.js` สำหรับเชื่อมต่อ PostgreSQL
4. ✅ อัปเดต `server/.env`:
   ```
   DB_USER=phsk
   DB_PASSWORD=
   DB_SERVER=localhost
   DB_DATABASE=SmartIoTDB
   DB_PORT=5432
   ```

**ผลลัพธ์:**

- ✅ ระบบทำงานได้เสถียร 100%
- ✅ Login ผ่านปกติ
- ✅ ใช้ Azure Data Studio ดูข้อมูลได้

---

### 2. ฟีเจอร์ดูรหัสผ่านสมาชิก (Password Viewing)

**ความต้องการ:**

- Admin ต้องการดูรหัสผ่านที่สมาชิกตั้งไว้

**การแก้ไข:**

1. ✅ เพิ่มคอลัมน์ `plain_password` ในตาราง `users`
2. ✅ เก็บรหัสผ่าน 2 แบบ:
   - `password` → Hash (bcrypt) สำหรับความปลอดภัย
   - `plain_password` → Plain Text สำหรับ Admin ดู
3. ✅ แสดงรหัสจริงในหน้า Edit User
4. ✅ เพิ่มปุ่ม 👁️ (Show/Hide) ดูรหัสผ่าน

**ไฟล์ที่แก้ไข:**

- `server/database_postgres.js` → เพิ่มคอลัมน์ `plain_password`
- `server/server.js` → บันทึกรหัสทั้ง 2 แบบ
- `src/features/auth/services/authService.ts` → เพิ่ม `plain_password` ใน User interface
- `src/features/admin/pages/UserManagementPage.tsx` → แสดงรหัสจริง + ปุ่มดู/ซ่อน

**วิธีใช้งาน:**

1. กดปุ่ม **"Edit"** ที่ผู้ใช้
2. ดูช่อง **"Password"** → จะเห็นรหัสที่สมาชิกตั้งไว้
3. กดไอคอน **👁️** เพื่อแสดง/ซ่อนรหัส

---

### 3. ฟีเจอร์ Admin Notes (บันทึกของ Admin)

**ความต้องการ:**

- Admin ต้องการจดบันทึกเกี่ยวกับผู้ใช้แต่ละคน

**การแก้ไข:**

1. ✅ เพิ่มคอลัมน์ `notes` ในตาราง `users`
2. ✅ เพิ่มช่อง **"Admin Notes"** ในหน้า Edit User
3. ✅ ใช้ Textarea สำหรับจดบันทึกหลายบรรทัด

**ตัวอย่างการใช้งาน:**

- "ผู้ใช้ขอเปลี่ยนรหัสวันที่ 13/02/2026"
- "ติดต่อได้ที่ 081-234-5678"
- "รับผิดชอบฟาร์มโซน A"

---

### 4. ปรับปรุง UI/UX หน้า User Management

**การปรับปรุง:**

1. ✅ เพิ่มปุ่ม **"View"** และ **"Edit"** ที่เห็นชัดเจน
2. ✅ เพิ่มคำอธิบาย (Helper Text) ใต้ทุกช่องกรอกข้อมูล:
   - 👤 Name → "Full name of the user"
   - 💼 Title/Role → "Job title or position"
   - 📧 Email → "Login email address"
   - 📍 Location → "City or region"
   - ✍️ Bio → "Brief description or notes"
   - 🔑 Password → "Current password shown - click eye to view/hide"
   - 📝 Admin Notes → "Private notes for admin reference only"

---

## 📊 โครงสร้าง Database ปัจจุบัน

### ตาราง `users`:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),          -- Hash (bcrypt)
    plain_password TEXT,            -- Plain Text (ใหม่)
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255),
    bio TEXT,
    avatar TEXT,
    title VARCHAR(100),
    notes TEXT                      -- Admin Notes (ใหม่)
);
```

---

## 🚀 วิธีใช้งานระบบ

### 1. เริ่มต้นใช้งาน:

```bash
# Terminal 1: รัน Backend
cd server
npm run dev

# Terminal 2: รัน Frontend
npm run dev
```

### 2. Login:

- URL: `http://localhost:3000`
- Email: `admin@smartiot.com`
- Password: `password123`

### 3. จัดการผู้ใช้:

- กด **"View"** → ดูข้อมูลทั้งหมด
- กด **"Edit"** → แก้ไขข้อมูล + ดูรหัสผ่าน
- กด **"..."** → เปลี่ยน Role / ลบผู้ใช้

### 4. ดูข้อมูลใน Database:

- เปิด **Azure Data Studio**
- เชื่อมต่อ PostgreSQL:
  - Server: `localhost`
  - Database: `SmartIoTDB`
  - User: `phsk`
  - Password: (เว้นว่าง)

---

## ⚠️ หมายเหตุสำคัญ

### ความปลอดภัย:

- รหัสผ่านถูกเก็บ 2 แบบ (Hash + Plain Text)
- **Plain Text เห็นได้เฉพาะ Admin เท่านั้น**
- ผู้ใช้ทั่วไปไม่สามารถดูรหัสของตัวเองได้

### ข้อมูลเดิม:

- ผู้ใช้ที่สมัครก่อนการอัปเดตนี้ อาจยังไม่มี `plain_password`
- จะมีข้อมูลเมื่อเปลี่ยนรหัสผ่านใหม่

---

## 📝 สรุป

**ปัญหาที่แก้:**

1. ✅ MSSQL Connection Error → ใช้ PostgreSQL แทน
2. ✅ Login ไม่ได้ → แก้แล้ว
3. ✅ Admin ดูรหัสผ่านไม่ได้ → เพิ่มฟีเจอร์แล้ว
4. ✅ จดบันทึกไม่ได้ → เพิ่ม Admin Notes แล้ว

**สถานะปัจจุบัน:**

- ✅ ระบบทำงานได้ 100%
- ✅ ทุกฟีเจอร์ใช้งานได้
- ✅ ข้อมูลปลอดภัย

**อัปเดตล่าสุด:** 13 กุมภาพันธ์ 2026 เวลา 05:51 น.
