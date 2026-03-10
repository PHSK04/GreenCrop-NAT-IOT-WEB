# GreenCropNAT: User Activity & Access Monitoring Plan (Web + Mobile)

อัปเดต: 10 มีนาคม 2026

เอกสารนี้สรุปแนวทางจัดการข้อมูลการใช้งานผู้ใช้ให้ครบทั้งฝั่ง Web และ Mobile App (Flutter)
โดยออกแบบให้เพิ่มได้แบบปลอดภัย ไม่ทำ API/DB เดิมพัง และยังใช้งานระบบปัจจุบันได้ทันที

## 1) เป้าหมาย

1. แยกข้อมูลกิจกรรมตามผู้ใช้แต่ละคน
2. ค้นหา/กรองตามช่วงเวลาได้ (Daily/Weekly/Monthly/Custom)
3. เห็น login/logout/session ชัดเจน
4. เห็นอุปกรณ์/Browser/Network ที่ใช้เข้าใช้งาน
5. ทำ audit ย้อนหลังได้ง่ายและเร็ว
6. ครอบคลุมทั้ง Web และ App

## 2) สถานะปัจจุบัน (จากระบบที่มีอยู่)

### มีแล้ว

1. `login_sessions` เก็บ: user, device_type, device_name, browser, browser_version, os, ip, login_time, logout_time, status
2. `audit_logs` เก็บกิจกรรมสำคัญ: LOGIN/LOGOUT/UPDATE_PROFILE ฯลฯ
3. `sensor_data` มี tenant_id/user-bound อยู่แล้ว
4. มีหน้า Admin ดูข้อมูลตารางหลักและดูราย user แล้ว

### ยังขาด / ควรเพิ่ม

1. ตัวกรองเวลาแบบเต็มรูปแบบในทุกหน้ารายงาน
2. แยกประเภท login status เพิ่ม: failed, expired, suspicious
3. บันทึก network type (WiFi/LAN/Cellular) และ location โดยประมาณ
4. บันทึก activity จาก Mobile App ให้ละเอียดเท่าฝั่งเว็บ
5. security alert rules (new device, new location, failed login หลายครั้ง)
6. retention policy + index สำหรับข้อมูลระยะยาว

## 3) Data Model แนะนำ (เสริมจากของเดิม)

## 3.1 ตาราง `login_sessions` (มีแล้ว -> เพิ่มคอลัมน์)

เพิ่มคอลัมน์:

1. `login_method` (email/google/facebook/line/microsoft)
2. `status_detail` (success/failed/logout/expired)
3. `device_model` (เช่น iPhone 15, Pixel 8, MacBook Pro)
4. `os_version`
5. `network_type` (wifi/mobile/lan/unknown)
6. `country_code`, `region` (approx location)
7. `app_platform` (web/flutter-ios/flutter-android)
8. `app_version`
9. `is_new_device` (bit)
10. `risk_score` (float)

## 3.2 ตารางใหม่ `user_activity_logs`

ใช้เก็บกิจกรรมการใช้งานละเอียดแบบ event-level:

1. `id`
2. `user_id`
3. `user_email`
4. `action_type` (view/edit/download/device_access/settings)
5. `target_type` (user/device/sensor/report/system)
6. `target_id`
7. `metadata_json`
8. `ip_address`
9. `device_type`, `device_name`, `device_model`
10. `browser`, `browser_version`, `os`, `os_version`
11. `network_type`, `country_code`, `region`
12. `app_platform`, `app_version`
13. `created_at`

## 3.3 ตารางใหม่ `security_alerts`

1. `id`
2. `user_id`
3. `alert_type` (new_device/new_location/multiple_failed_login)
4. `severity` (low/medium/high)
5. `message`
6. `source_session_id`
7. `resolved_by`
8. `resolved_at`
9. `created_at`

## 4) API Design (Additive only, ไม่ทับ API เดิม)

### 4.1 Admin Read APIs

1. `GET /api/admin/activity/users/:userId`
2. `GET /api/admin/activity/users/:userId/sessions`
3. `GET /api/admin/activity/users/:userId/events`
4. `GET /api/admin/activity/users/:userId/device-access`
5. `GET /api/admin/activity/security-alerts`

รองรับ query เดียวกัน:

1. `from=ISO_DATE`
2. `to=ISO_DATE`
3. `preset=daily|weekly|monthly`
4. `search=`
5. `page=`, `limit=`

### 4.2 User Self APIs (ให้ผู้ใช้ดูของตัวเอง)

1. `GET /api/me/sessions`
2. `GET /api/me/activity`
3. `GET /api/me/devices`

## 5) Web + App Data Contract

ทุก client ต้องส่ง context มาด้วยในทุก action log:

1. `platform` (web/flutter-ios/flutter-android)
2. `appVersion`
3. `deviceModel`
4. `osVersion`
5. `networkType` (ถ้าอ่านได้)
6. `action`
7. `targetType`, `targetId`
8. `timestamp`

### ฝั่ง Web

ดึงได้จาก:

1. `user-agent`
2. browser detector
3. IP จาก request

### ฝั่ง Flutter App

ให้เพิ่ม instrumentation ในชั้น service กลาง:

1. ข้อมูลอุปกรณ์: `device_info_plus`
2. เครือข่าย: `connectivity_plus`
3. เวอร์ชันแอพ: `package_info_plus`
4. ทุก call สำคัญยิง activity event ตาม schema เดียวกับเว็บ

## 6) Time Filter ที่ต้องมีใน UI

ทุกหน้า activity/session/log ต้องมี:

1. Quick preset: Daily / Weekly / Monthly
2. Date range picker (from-to)
3. ปุ่ม Apply / Reset
4. แสดง timezone ที่ใช้แปลเวลา

## 7) Session Detail ที่ต้องแสดง

เมื่อกดดู 1 session:

1. start time
2. end time
3. duration
4. login method
5. device + browser + os
6. ip + location (approx)
7. app/web platform
8. status + risk flags

## 8) Security Alerts Rules

แนะนำเริ่ม 3 กฎนี้ก่อน:

1. New Device Login
2. New Location Login
3. Failed Login >= 5 ครั้งใน 10 นาที

Actions:

1. แจ้งเตือนใน Admin panel
2. บันทึกลง `security_alerts`
3. optional: ส่ง email/LINE

## 9) Search & Filter ที่ต้องมี

1. ค้นหาตาม user/email
2. ค้นหาตามช่วงเวลา
3. กรองตาม device/browser/platform
4. กรองตาม action_type/status
5. export CSV ตามผลลัพธ์ที่ filter แล้ว

## 10) Performance & Retention

1. ทำ index ตามคอลัมน์ที่ query บ่อย:
   - `user_id`, `created_at`, `login_time`, `status`, `action_type`
2. แบ่ง retention:
   - full detail 90 วัน
   - summary 1 ปี
3. ใช้ pagination ทุก endpoint
4. จำกัด default result (เช่น 100 records)

## 11) Rollout Plan (ปลอดภัย ไม่พังระบบเดิม)

Phase 1 (Quick Win):

1. เพิ่ม status code ใน toast (ทำแล้ว)
2. เพิ่ม time filter ฝั่ง UI โดยใช้ API เดิมก่อน
3. เพิ่ม query param `from/to` ใน endpoint admin ที่มีอยู่

Phase 2:

1. เพิ่มคอลัมน์เสริมใน `login_sessions`
2. เพิ่มตาราง `user_activity_logs`
3. เพิ่ม API แบบ additive

Phase 3:

1. เพิ่ม `security_alerts`
2. เพิ่ม dashboard สรุปความเสี่ยง
3. เพิ่ม notification channels

## 12) Mapping กับข้อเสนอ 15 ข้อ

1. User-based logs: รองรับผ่าน `user_id`
2. Time filter: เพิ่ม `preset/from/to`
3. Login/Logout tracking: ใช้ `login_sessions`
4. Login status: เพิ่ม `status_detail`
5. Device info: เพิ่ม `device_model/os_version`
6. Browser info: มีแล้ว + version
7. Network info: เพิ่ม `network_type/location`
8. User activity log: ตาราง `user_activity_logs`
9. Device access log: action_type=`device_access`
10. Search/filter: เพิ่ม query + UI filters
11. Readable layout: table + badges + icons
12. Session details: modal/detail panel
13. Security alerts: ตาราง `security_alerts`
14. Audit log: `audit_logs` + activity log
15. Long-term storage: index + retention + paging

## 13) ข้อกำหนดความปลอดภัย

1. จำกัด admin APIs ด้วย role check
2. mask ข้อมูล sensitive (OTP/contact)
3. ไม่เก็บข้อมูลละเอียดเกินจำเป็น (PDPA/GDPR principle)
4. บันทึกเฉพาะ location แบบ approx ไม่เก็บพิกัดละเอียดถ้าไม่จำเป็น

## 14) สรุป

แนวทางนี้ทำให้ระบบรองรับการตรวจสอบย้อนหลังแบบครบวงจรทั้ง Web และ Mobile App โดยไม่ทำของเดิมพัง
และสามารถ rollout ทีละเฟสแบบปลอดภัยใน production ได้ทันที
