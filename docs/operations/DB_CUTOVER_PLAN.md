# DB Cutover Plan (Low Impact)

แผนนี้ย้ายจาก Docker SQL บนเครื่อง ไป Cloud SQL โดยลดผลกระทบให้น้อยที่สุด และ rollback ได้เร็ว

## 0) เป้าหมาย

- ให้ Local app + GitHub Pages ใช้ backend/database เดียวกัน
- ห้ามแก้ schema แบบทำลายข้อมูล
- ต้อง rollback กลับ DB เดิมได้ทันที

## 1) Pre-Cutover Checklist

- [ ] เตรียม Cloud SQL instance ใหม่เสร็จ (ยังไม่ตัดของเดิม)
- [ ] เปิด firewall ให้ backend (Render) เข้าถึง DB ได้
- [ ] บันทึกค่า DB env เดิมไว้ (backup)
- [ ] หยุดงานเขียนข้อมูลชั่วคราวช่วงสั้นๆ ตอน cutover
- [ ] ตั้งเวลา cutover ที่มีผู้ใช้น้อย

## 2) เตรียม Cloud DB (ไม่กระทบของเดิม)

1. สร้าง DB ใหม่ชื่อ `SmartIoTDB` บน cloud
2. สร้าง user/password ใหม่สำหรับ production
3. ทดสอบเชื่อมต่อจากเครื่อง local และจาก backend host

## 3) ย้ายโครงสร้าง + ข้อมูล

1. Export จาก DB เดิม (Docker local)
2. Import เข้า Cloud DB
3. ตรวจ row count ตารางหลัก:
- `users`
- `sensor_data`
- `login_sessions`
- `otp_codes`
- `audit_logs`

## 4) Staging Validation (ก่อนตัดจริง)

- [ ] ตั้ง backend staging ให้ชี้ Cloud DB
- [ ] ทดสอบ `/api/health`
- [ ] ทดสอบ login/register/profile
- [ ] ทดสอบเขียน sensor data
- [ ] ทดสอบหน้าเว็บจาก GitHub Pages ด้วย `VITE_API_URL` ชั่วคราว (staging backend)

## 5) Cutover (ช่วงสั้น)

1. Freeze เขียนข้อมูลที่ DB เดิมชั่วคราว
2. Sync ข้อมูลรอบสุดท้าย (delta/final export-import)
3. เปลี่ยน Render env:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
4. Restart backend
5. ทดสอบทันที:
- `GET /api/health`
- Login ด้วยบัญชีเดิม
- เขียนข้อมูลใหม่ 1 รายการและอ่านกลับ

## 6) Post-Cutover

- [ ] เฝ้าดู error logs 24-48 ชม.
- [ ] ตรวจ auth fail rate
- [ ] ตรวจ query latency
- [ ] ยืนยันว่า GitHub Pages + Local ใช้งาน DB เดียวกัน

## 7) Rollback Plan (ต้องพร้อมเสมอ)

ถ้าเกิดปัญหา:
1. เปลี่ยน backend env กลับ DB เดิมทันที
2. Restart backend
3. ยืนยัน `/api/health` + login กลับมาปกติ
4. เก็บ incident notes แล้วค่อยแก้ root cause

## 8) ค่า ENV ตัวอย่าง (Render Backend)

```env
DB_HOST=<cloud-sql-host>
DB_PORT=1433
DB_USER=<cloud-user>
DB_PASSWORD=<cloud-password>
DB_NAME=SmartIoTDB
JWT_SECRET=<strong-secret>
NODE_ENV=production
ENABLE_DEV_TOKEN=false
CORS_ORIGINS=https://phsk04.github.io,http://localhost:3000,http://127.0.0.1:3000
```

## 9) สิ่งที่ไม่ควรทำ

- ห้ามใช้ `DB_HOST=localhost` บน Render
- ห้ามลบ DB เดิมทันทีหลัง cutover
- ห้ามเปลี่ยน schema ใหญ่พร้อม cutover ในรอบเดียว

