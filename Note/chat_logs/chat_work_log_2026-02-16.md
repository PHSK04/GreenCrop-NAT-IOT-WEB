# Chat Work Log (Detailed) - 2026-02-16

## 1) เริ่มตรวจปัญหา Login
- ผู้ใช้แจ้งว่าเข้าบัญชีไม่ได้ทั้งหมด
- ตรวจ path ที่แจ้ง (`iot_test1/lib/main.dart`) ใน workspace นี้แล้วไม่พบไฟล์
- สรุปว่าอาการเริ่มต้นน่าจะอยู่ฝั่ง web/backend ใน repo ปัจจุบัน

## 2) ตรวจโค้ดฝั่ง Backend และ Frontend Web
- ค้นหา flow auth พบ endpoint login 2 เส้นใน backend:
  - `/api/login`
  - `/api/auth/login`
- ตรวจ `src/features/auth/services/authService.ts` พบ web เรียก `/api/login`
- ตรวจ `server/server.js` พบทั้ง 2 endpoint มี logic ไม่เหมือนกัน

## 3) ตรวจฐานข้อมูลผู้ใช้
- ตรวจ users ใน MSSQL: พบผู้ใช้ครบและใช้งานได้
- ตรวจ password hash: ความยาว 60 และ prefix `$2b$10$` ปกติ
- สรุปช่วงนี้: ไม่ใช่ข้อมูลรหัสผ่านเสียทั้งระบบ

## 4) ตรวจสถานะ runtime พอร์ต
- พบช่วงที่ไม่มี process ฟังพอร์ต 3000 (web) และ 3001 (api)
- ยืนยัน root cause ของ login fail ทั้งระบบคือ service ไม่ได้รัน

## 5) แก้ Backend ให้เสถียรสำหรับ Web + Flutter
- รวม logic login เป็น handler เดียว (`handleLogin`) ใน `server/server.js`
- map ทั้ง 2 endpoint ให้ใช้ handler เดียว:
  - `app.post('/api/auth/login', handleLogin)`
  - `app.post('/api/login', handleLogin)`
- เพิ่ม endpoint สุขภาพระบบ: `GET /api/health`
- ตั้ง host ให้ API bind ที่ `0.0.0.0` เพื่อรองรับอุปกรณ์ใน LAN
- เพิ่ม allow list ใน `server/middleware/authTenant.js`:
  - `/api/auth/login`
  - `/api/health`
- เพิ่ม script รันพร้อมกันใน `package.json`:
  - `dev:all`

## 6) ทดสอบการทำงานฝั่ง Web
- สตาร์ต backend สำเร็จที่พอร์ต 3001
- สตาร์ต vite สำเร็จที่พอร์ต 3000
- ทดสอบผ่าน proxy:
  - `GET http://localhost:3000/api/health` ผ่าน
  - `POST http://localhost:3000/api/login` ผ่าน
- สรุป: web login ใช้งานได้

## 7) ปรับสิทธิ์ผู้ใช้ตามคำสั่ง
- เปลี่ยน role ของ `phongsagonsk@gmail.com` จาก `admin` -> `user`
- ยืนยันผลจาก DB สำเร็จ

## 8) ช่วง “เปลี่ยน API อัตโนมัติ” ฝั่ง Flutter (สำคัญ)
- พบว่าโปรเจกต์ Flutter จริงอยู่นอก workspace นี้:
  - `/Users/phsk/Documents/PROJECT ETE/iot_test1/lib/main.dart`
- ตรวจพบการประกอบ URL หลายจุดใน:
  - `lib/services/api_service.dart`
  - `lib/services/iot_api_service.dart`
- แก้ `ApiService.baseUrl` ให้สลับอัตโนมัติ:
  - Web/iOS/macOS/Linux/Windows -> `localhost`
  - Android emulator -> `10.0.2.2`
  - Real device -> ใช้ `--dart-define=REAL_DEVICE_HOST=<LAN-IP>`
  - รองรับ override เต็มผ่าน `--dart-define=API_BASE_URL=http://<host>:3001/api`
- เพิ่ม normalize URL ให้จบที่ `/api` อัตโนมัติ
- แก้ `iot_api_service.dart` ให้ใช้ base URL เดียวกับ `ApiService` (ไม่แยก config คนละทาง)
- เพิ่ม boot log ใน `main.dart`:
  - แสดง `[BOOT] API Base URL: ...` ตอนเริ่มแอป

## 9) ช่วง “Web กดแล้ว App ไม่ตาม” (สำคัญ)
- วิเคราะห์ว่าแอปมี polling ทุก 2 วินาทีอยู่แล้ว
- ตรวจพบ backend ดึงข้อมูลล่าสุดด้วย `ORDER BY timestamp DESC`
- ความเสี่ยง: เวลา client เพี้ยนกัน (web/app/เครื่องต่างกัน) จะทำให้ข้อมูลล่าสุดผิดตัว
- แก้ backend ใน `server/server.js`:
  - เปลี่ยน query latest เป็น `ORDER BY id DESC`
  - เปลี่ยน history เป็น `ORDER BY id DESC`
  - แก้การบันทึก `active_tank` จาก `active_tank || null` เป็น `active_tank ?? null`
- รีสตาร์ต backend และทดสอบ write/read ซ้ำ
- ยืนยันผล: latest write ถูกอ่านกลับถูกต้องตามลำดับจริง

## 10) ผลลัพธ์รวมหลังแก้
- Web login ใช้ได้
- Flutter login ใช้ได้ (เมื่อใช้ URL ตาม platform ถูกต้อง)
- Web/App sync บน user เดียวกันเสถียรขึ้น
- ปิดจุด mismatch จาก endpoint login ซ้ำซ้อนและ timestamp skew

## 11) คำสั่งใช้งานที่ยืนยันแล้ว
- Backend: `npm run server`
- Web: `npm run dev`
- Flutter Android Emulator: ใช้ auto (`10.0.2.2`) ได้เลย
- Flutter Real Device:
  - `flutter run --dart-define=REAL_DEVICE_HOST=<LAN-IP>`
  - หรือ `flutter run --dart-define=API_BASE_URL=http://<LAN-IP>:3001/api`


## 12) ช่วงแก้ให้แอปเสถียรขึ้นแบบทำจริงตามคำสั่ง “ทำให้หน่อย / จัดเลย”
- เปิด flow รัน Flutter จริง: `clean -> pub get -> run`
- ระหว่างทดสอบเจอ error ส่งคำสั่งจากแอป:
  - `Conversion failed when converting date and/or time from character string.`
- แก้ backend ให้ parse `timestamp` เป็น `Date` แบบปลอดภัยก่อน insert
  - ไฟล์: `server/server.js`
  - ผล: endpoint `/api/sensor-data` รับค่าจากแอปได้ ไม่ error เดิม

## 13) ช่วงแก้ iOS Simulator build error (codesign/resource fork)
- อาการ:
  - `Failed to codesign ... Flutter.framework/Flutter`
  - `resource fork, Finder information, or similar detritus not allowed`
- ตรวจแล้วพบ `com.apple.provenance` ติดกับ Flutter engine artifacts
- ลองแก้ด้วย `xattr` และ `COPYFILE_DISABLE=1` แต่ error ยังกลับมา
- แก้เชิงระบบ:
  - patch local Flutter tools ให้ skip codesign เฉพาะ binary ฝั่ง `iphonesimulator`
  - ลบ `flutter_tools.snapshot`/`stamp` เพื่อบังคับ rebuild tool
- ทดสอบรันใหม่:
  - build ผ่าน และแอปเปิดบน iPhone Simulator ได้

## 14) ยืนยันสถานะหลังแก้
- เห็น log ในแอป:
  - `[API] Selected: http://localhost:3001/api`
  - `[BOOT] API Base URL: http://localhost:3001/api`
- ยืนยันว่า API auto-detection ทำงาน
- ยืนยันว่า web + api ยังตอบ `health` ได้

## 15) สร้างสคริปต์แก้ซ้ำหลังอัปเดต Flutter
- ผู้ใช้อนุมัติให้ทำสคริปต์
- สร้างไฟล์:
  - `/Users/phsk/Documents/PROJECT ETE/iot_test1/fix_ios_sim.sh`
- ความสามารถของสคริปต์:
  - patch Flutter tool (skip simulator codesign)
  - rebuild Flutter tool snapshot
  - ล้าง xattr ในโปรเจกต์
  - `flutter clean` + `flutter pub get`
- วิธีใช้:
  - `cd /Users/phsk/Documents/PROJECT ETE/iot_test1`
  - `./fix_ios_sim.sh`

