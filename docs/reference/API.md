# API Reference

โปรเจกต์นี้ใช้ backend หลักที่ไฟล์:

- `server/server.js`

ไฟล์ที่เกี่ยวข้อง:

- `server/database_mssql.js` สำหรับเชื่อม MSSQL
- `server/middleware/authTenant.js` สำหรับตรวจ JWT / auth middleware
- `server/mqtt_listener.js` สำหรับรับ MQTT แล้วบันทึกลงฐานข้อมูล
- `server/nest-server.js` เป็น Nest wrapper ที่ครอบ Express อีกชั้นหนึ่ง

## Auth / Public

- `GET /api/reset-password-admin`
  - ไฟล์: `server/server.js`
  - ใช้รีเซ็ตรหัสผ่าน admin แบบชั่วคราว

- `GET /api/health`
  - ไฟล์: `server/server.js`
  - ใช้เช็กว่า API ยังทำงานอยู่หรือไม่

- `GET /api/debug-users`
  - ไฟล์: `server/server.js`
  - ใช้ดู users และ recent sessions เพื่อ debug

- `POST /api/register`
  - ไฟล์: `server/server.js`
  - สมัครสมาชิกใหม่

- `POST /api/verify-password`
  - ไฟล์: `server/server.js`
  - ตรวจว่ารหัสผ่านถูกต้องหรือไม่

- `POST /api/auth/login`
  - ไฟล์: `server/server.js`
  - login route หลักแบบ auth path

- `POST /api/auth/social`
  - ไฟล์: `server/server.js`
  - social login เช่น Google, Facebook, LINE, Microsoft

- `POST /api/login`
  - ไฟล์: `server/server.js`
  - login route แบบธรรมดา

- `POST /api/logout`
  - ไฟล์: `server/server.js`
  - logout และอัปเดต login session

## Devices

- `GET /api/devices/my`
  - ไฟล์: `server/server.js`
  - ดึงรายการอุปกรณ์ของ user ปัจจุบัน

- `POST /api/devices/primary`
  - ไฟล์: `server/server.js`
  - ตั้งอุปกรณ์หลัก

- `POST /api/devices/pair`
  - ไฟล์: `server/server.js`
  - pair อุปกรณ์เข้ากับบัญชี

- `POST /api/devices/update`
  - ไฟล์: `server/server.js`
  - แก้ไขข้อมูลอุปกรณ์

- `POST /api/devices/unpair`
  - ไฟล์: `server/server.js`
  - ยกเลิกการ pair อุปกรณ์

## Admin DB

- `GET /api/admin/db/summary`
  - ไฟล์: `server/server.js`
  - ดึงภาพรวมฐานข้อมูล

- `GET /api/admin/db/users`
  - ไฟล์: `server/server.js`
  - ดึงรายการ users

- `GET /api/admin/db/users/:id/details`
  - ไฟล์: `server/server.js`
  - ดึงรายละเอียด user, sessions, sensor data, audit logs

- `GET /api/admin/db/login-sessions`
  - ไฟล์: `server/server.js`
  - ดึง login sessions

- `GET /api/admin/db/sensor-data`
  - ไฟล์: `server/server.js`
  - ดึง sensor data

- `GET /api/admin/db/audit-logs`
  - ไฟล์: `server/server.js`
  - ดึง audit logs

- `GET /api/admin/db/otp-codes`
  - ไฟล์: `server/server.js`
  - ดึง OTP codes

## Users

- `GET /api/users`
  - ไฟล์: `server/server.js`
  - ดึง users ทั้งหมด

- `DELETE /api/users/:id`
  - ไฟล์: `server/server.js`
  - ลบ user

- `PUT /api/users/:id/role`
  - ไฟล์: `server/server.js`
  - เปลี่ยน role ของ user

- `PUT /api/users/:id`
  - ไฟล์: `server/server.js`
  - แก้ไขข้อมูล user

## OTP

- `POST /api/send-otp`
  - ไฟล์: `server/server.js`
  - ส่ง OTP

- `POST /api/verify-otp`
  - ไฟล์: `server/server.js`
  - ตรวจ OTP

## Login Sessions

- `GET /api/login-sessions`
  - ไฟล์: `server/server.js`
  - ดึง login sessions ทั้งหมด

- `GET /api/login-sessions/user/:userId`
  - ไฟล์: `server/server.js`
  - ดึง login sessions ตาม user

- `GET /api/login-sessions/active`
  - ไฟล์: `server/server.js`
  - ดึง active sessions

## Sensor Data

- `GET /api/sensor-data`
  - ไฟล์: `server/server.js`
  - ดึง sensor data

- `POST /api/sensor-data`
  - ไฟล์: `server/server.js`
  - บันทึก sensor data

## Public Routes ที่ middleware ปล่อยผ่าน

ไฟล์: `server/middleware/authTenant.js`

- `/api/login`
- `/api/auth/login`
- `/api/auth/social`
- `/api/register`
- `/api/send-otp`
- `/api/verify-otp`
- `/api/health`
