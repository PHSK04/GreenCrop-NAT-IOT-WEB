# Smart IoT Platform -- Social Login Summary

## Overview

This project implements a **Smart IoT Monitoring System** that supports
authentication using multiple **Social Login providers**.\
The goal is to allow users to easily sign in to both the **Web
Dashboard** and **Mobile Application** without creating a separate
account.

Supported providers:

-   Google Login
-   LINE Login
-   Facebook Login
-   Microsoft Login

The system uses **OAuth 2.0 authentication** to verify user identity.

------------------------------------------------------------------------

# System Architecture

User\
↓\
Social Login Button\
↓\
Google / LINE / Facebook / Microsoft\
↓\
Frontend (React Web / Flutter Mobile)\
↓\
Receive OAuth Token\
↓\
Backend API (Node.js / NestJS)\
↓\
Verify Token with Provider\
↓\
Create or Login User in Database\
↓\
Access IoT Dashboard

------------------------------------------------------------------------

# 1. Google Login

Google Login is implemented using **Google OAuth 2.0** via Google Cloud
Console.

Required credentials:

-   Client ID
-   Client Secret

Capabilities:

-   Login with Google account
-   Works for Web and Mobile applications
-   Returns user profile information (name, email, picture)

------------------------------------------------------------------------

# 2. LINE Login

LINE Login is configured using the **LINE Developers Console**.

Required credentials:

-   Channel ID
-   Channel Secret

Capabilities:

-   Login using LINE account
-   Popular for users in Thailand
-   Returns user profile and basic account information

------------------------------------------------------------------------

# 3. Facebook Login

Facebook Login is implemented using **Meta for Developers**.

Required credentials:

-   App ID
-   App Secret

Capabilities:

-   Login using Facebook account
-   Access user profile information
-   Widely supported across web and mobile platforms

------------------------------------------------------------------------

# 4. Microsoft Login

Microsoft Login is implemented using **Microsoft OAuth 2.0 / OpenID Connect** via the Microsoft Entra ID (Azure Portal) App Registration.

Required credentials:

-   Application (Client) ID
-   Client Secret
-   Tenant configuration

Capabilities:

-   Login with Microsoft accounts (Outlook / Hotmail / Live)
-   Login with Microsoft 365 organizational accounts
-   Works for Web and Mobile applications
-   Returns user profile information (name, email, profile picture)

------------------------------------------------------------------------

# Example Login Buttons

Frontend login interface may contain buttons such as:

Continue with Google\
Continue with LINE\
Continue with Facebook\
Continue with Microsoft

Users can choose their preferred authentication provider.

------------------------------------------------------------------------

# Benefits of Social Login

1.  Faster user registration\
2.  No password management required\
3.  Improved security using trusted providers\
4.  Compatible with Web and Mobile apps

------------------------------------------------------------------------

# IoT Platform Structure

Frontend - React Web Dashboard - Flutter Mobile Application

Backend - Node.js / NestJS API - Authentication service - IoT data
service

IoT Functions - Monitor sensor data - Control IoT devices - View
real‑time system status

------------------------------------------------------------------------

# Conclusion

The Smart IoT platform integrates multiple **Social Login providers** to
simplify authentication and improve user experience.\
By combining Google, LINE, Facebook, and Microsoft login methods, the system
ensures flexible and convenient access for users across different
platforms.
# Smart IoT Social Login Summary (Google / Facebook / LINE)

อัปเดตล่าสุด: 9 มีนาคม 2026  
เอกสารนี้สรุปขั้นตอนที่ทำจริงในโปรเจกต์ `GreenCrop-NAT-IOT-WEB` ทั้งการตั้งค่า Social Login และการแก้ปัญหา production

## 1) ภาพรวมสถาปัตยกรรม

Flow หลัก:

1. ผู้ใช้กดปุ่ม Social Login บน Frontend (Web/Flutter)
2. Frontend รับ token หรือ authorization code จาก provider
3. Frontend ส่ง payload ไป backend `POST /api/auth/social`
4. Backend verify token/code กับ provider API
5. Backend upsert user ใน DB (`users`) และสร้าง JWT ของระบบ
6. Frontend เก็บ session (`smart_iot_session`) แล้วเข้า dashboard

Provider ที่รองรับ:

1. Google
2. Facebook
3. LINE

## 2) โค้ดสำคัญที่เกี่ยวข้อง

Web:

1. `src/features/auth/components/SocialAuth.tsx`
2. `src/features/auth/services/socialWebAuth.ts`
3. `src/features/auth/services/authService.ts`
4. `src/features/auth/contexts/AuthContext.tsx`
5. `src/main.tsx`

Backend:

1. `server/server.js` (route `/api/auth/social`, verify provider, issue JWT)
2. `server/database_mssql.js` (users table + social columns)

## 3) Environment Variables ที่ต้องมี

### 3.1 Frontend (`.env` / `.env.production`)

```env
VITE_API_URL=https://greencrop-api.onrender.com/api
VITE_GOOGLE_CLIENT_ID=<google-web-client-id>
VITE_FACEBOOK_APP_ID=<facebook-app-id>
VITE_LINE_CHANNEL_ID=<line-channel-id>
VITE_LINE_REDIRECT_URI=https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/
```

### 3.2 Backend (`Render Environment`)

```env
NODE_ENV=production
JWT_SECRET=<strong-secret>
CORS_ORIGINS=https://phsk04.github.io,http://localhost:3000,http://127.0.0.1:3000

DB_HOST=<mssql-host>
DB_PORT=1433
DB_USER=<db-user>
DB_PASSWORD=<db-password>
DB_NAME=SmartIoTDB

GOOGLE_CLIENT_ID=<google-web-client-id>
GOOGLE_CLIENT_IDS=<optional-comma-separated-client-ids>
FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>

LINE_CHANNEL_ID=<line-channel-id>
LINE_CHANNEL_SECRET=<line-channel-secret>
LINE_REDIRECT_URI=https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/
```

หมายเหตุสำคัญ:

1. Production ใช้ env ใน Render เท่านั้น ไม่ใช้ `server/.env` ในเครื่อง local
2. `LINE_REDIRECT_URI` ต้องตรงกับ Callback URL ใน LINE Developers แบบ 100% (รวม slash ท้าย URL)

## 4) ขั้นตอนตั้งค่า Provider แบบละเอียด

### 4.1 Google Login

1. สร้าง OAuth Client (Web) ใน Google Cloud Console
2. ใส่ Authorized origins/callback ให้ตรงกับโดเมนที่ใช้
3. ใส่ `VITE_GOOGLE_CLIENT_ID` ที่ frontend
4. ใส่ `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_IDS` ที่ backend
5. ทดสอบปุ่ม Google บนหน้า login

### 4.2 Facebook Login

1. สร้าง App ใน Meta for Developers
2. เปิด Facebook Login product และตั้ง callback domains
3. ใส่ `VITE_FACEBOOK_APP_ID` ที่ frontend
4. ใส่ `FACEBOOK_APP_ID` และ `FACEBOOK_APP_SECRET` ที่ backend
5. ทดสอบ Facebook login และเช็ก response `/api/auth/social`

### 4.3 LINE Login

1. ตั้ง Callback URL ใน LINE Developers:
   `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
2. ใส่ `VITE_LINE_CHANNEL_ID` และ `VITE_LINE_REDIRECT_URI` ที่ frontend
3. ใส่ `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_REDIRECT_URI` ที่ Render backend
4. Save env แล้ว redeploy backend
5. ทดสอบบนหน้าเว็บจริง (GitHub Pages)

## 5) การแก้ปัญหา (Troubleshooting) ที่เจอจริง

### 5.1 Error: `LINE_CHANNEL_ID / LINE_CHANNEL_SECRET is not configured on server`

อาการ:

1. Toast บนเว็บขึ้น LINE Login Failed พร้อมข้อความนี้
2. Backend log ขึ้น `[SOCIAL_LOGIN] line failed: ... not configured`

สาเหตุ:

1. ค่า `LINE_*` ยังไม่ถูกตั้งใน Render service ที่รันจริง
2. ตั้งแล้วแต่ยังไม่ save/redeploy
3. ตั้งผิดชื่อ key หรือผิด service

วิธีแก้:

1. ตั้ง env ใน Render service `greencrop-api` ให้ครบ 3 ตัว `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_REDIRECT_URI`
2. Save Changes
3. Manual Deploy
4. ทดสอบด้วย:

```bash
curl -sS -X POST https://greencrop-api.onrender.com/api/auth/social \
  -H 'Content-Type: application/json' \
  -d '{"provider":"line"}'
```

ถ้า env ถูกแล้ว ต้องไม่ขึ้น `not configured` อีก

### 5.2 Error: เด้งกลับหน้า login หลัง authorize แล้ว

สาเหตุที่พบ:

1. OAuth callback กลับมาแล้ว session ไม่ถูก restore
2. popup flow บาง browser ใช้ไม่ได้
3. redirect URI mismatch

การแก้ในโค้ด:

1. Restore session ใน `AuthContext` ตอน app mount
2. เพิ่ม callback relay ผ่าน `postMessage` และ fallback polling
3. รองรับ full-page redirect fallback เมื่อ popup blocked
4. ตรวจและบังคับ `VITE_LINE_REDIRECT_URI` ให้ชัดเจน

### 5.3 Error: `jwt expired`

สาเหตุ:

1. token หมดอายุ

วิธีแก้:

1. logout/login ใหม่
2. clear `smart_iot_session` ใน browser
3. ถ้าต้องการเสถียรระยะยาว ให้เพิ่ม refresh token flow

### 5.4 สงสัยว่า env เต็มหรือไม่ (Render free)

วิธีเช็ก:

1. เข้า Render -> Environment
2. เพิ่ม key ชั่วคราวเช่น `TEST_LIMIT_CHECK=1`
3. Save Changes

ผล:

1. Save ได้ = ยังไม่เต็ม
2. Save ไม่ได้ + แจ้ง limit = เต็ม

## 6) คำสั่งเช็กระบบที่ใช้บ่อย

Health check:

```bash
curl -sS https://greencrop-api.onrender.com/api/health
```

เช็ก social endpoint เบื้องต้น:

```bash
curl -sS -X POST https://greencrop-api.onrender.com/api/auth/social \
  -H 'Content-Type: application/json' \
  -d '{"provider":"line"}'
```

## 7) Deployment ที่ทำจริง

Frontend:

1. build + deploy GitHub Pages ด้วย `npm run deploy`

Backend:

1. ใช้ Render web service (`https://greencrop-api.onrender.com`)
2. Auto deploy จาก branch `main`
3. เมื่อแก้ env ต้อง redeploy เพื่อให้ runtime โหลดค่าล่าสุด

## 8) Security Checklist (สำคัญ)

1. ห้าม commit secret ลง git
2. หาก secret เคยถูกแชร์/หลุด ให้ rotate ทันที
3. ตั้ง `ENABLE_DEV_TOKEN=false` ใน production
4. ปิดหรือจำกัด debug endpoints ใน production

## 9) สรุปผล

1. Google/Facebook/LINE login ถูกเชื่อมครบในโครงสร้างเดียวกัน
2. ปัญหาหลักที่ทำให้ LINE เด้งคือ backend ยังไม่เห็น env LINE
3. หลังตั้งค่า Render env ถูกต้องและ redeploy แล้ว LINE login ใช้งานได้

## 10) Note เพิ่มเติม: รีเซ็ต Microsoft Login ฝั่งเว็บ

กรณีไม่ต้องการใช้โหมดองค์กรอย่างเดียว และต้องการให้ผู้ใช้เลือกบัญชีได้กว้าง (รวมบัญชีส่วนตัว):

1. Azure App Registration:
   - Supported account types = `Any Entra ID tenant + Personal Microsoft accounts`
   - Redirect URI (Web) = `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
2. Frontend env:
   - `VITE_MICROSOFT_CLIENT_ID=<client-id>`
   - `VITE_MICROSOFT_TENANT_ID=common`
   - `VITE_MICROSOFT_REDIRECT_URI=https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
3. Backend env (Render):
   - `MICROSOFT_CLIENT_ID=<client-id>`
   - `MICROSOFT_CLIENT_SECRET=<client-secret-value>`
   - `MICROSOFT_TENANT_ID=common`
   - `MICROSOFT_REDIRECT_URI=https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
4. Deploy ใหม่ทั้ง backend และ frontend แล้วค่อยทดสอบ

## 11) คู่มือแก้ปัญหา: `Failed to load DB users` (ฉบับละเอียด)

อัปเดต: 10 มีนาคม 2026

### 11.1 อาการที่พบ

1. หน้า `Database Viewer` ขึ้น toast: `Failed to load DB users`
2. บางครั้งขึ้น `Failed to load DB summary`
3. ผู้ใช้สับสนว่าเป็นปัญหา frontend, token, หรือ backend

### 11.2 สาเหตุจริงที่เจอในโปรเจกต์นี้

1. **401 Unauthorized** เพราะไม่มี Bearer token หรือใส่ token ผิดรูปแบบ
2. **500 Internal Server Error** เพราะ query backend อ้างคอลัมน์ `updated_at` แต่ตารางจริงไม่มีคอลัมน์นี้
3. หน้าเว็บค้าง cache ทำให้เห็น UI เก่า แม้โค้ดใหม่ deploy แล้ว

### 11.3 วิธีตรวจด้วย Postman (ต้องทำตามลำดับ)

#### Step A: Login เพื่อรับ token

Request:

- Method: `POST`
- URL: `https://greencrop-api.onrender.com/api/login`
- Header: `Content-Type: application/json`
- Body (raw/json):

```json
{
  "email": "admin@smartiot.com",
  "password": "password123"
}
```

ผลที่ต้องได้:

- Status `200`
- Response มี key `"token"` และ `"user.role": "admin"`

#### Step B: เรียก admin endpoint ด้วย Bearer token

Request:

- Method: `GET`
- URL: `https://greencrop-api.onrender.com/api/admin/db/users`
- Authorization: `Bearer Token`
- Token: วางเฉพาะค่า `eyJ...` จาก Step A (ห้ามวางทั้ง JSON)

ข้อควรระวัง:

1. `GET /api/admin/db/users` **ไม่ใช้ body**
2. ถ้าใส่ token แบบ `{ "token": "...", "user": ... }` จะ 401 ทันที

### 11.4 การแปลผล status code

1. `200` = backend ปกติ, token ปกติ, สิทธิ์ admin ปกติ
2. `401` = ไม่มี token หรือ token ไม่ถูกต้อง/หมดอายุ
3. `403` = token ถูกต้องแต่ role ไม่ใช่ admin
4. `500` = backend/query/DB schema มีปัญหา

### 11.5 การแก้เชิงโค้ดที่ทำแล้ว

#### Frontend

1. เพิ่มการอ่าน session token ให้รองรับหลายรูปแบบเก่า/ใหม่:
   - `token`
   - `user.token`
   - `accessToken`
   - legacy keys: `smart_iot_token`, `auth_token`
2. เพิ่มการแสดงข้อความ error พร้อม status code เช่น:
   - `Failed to load DB users (401)`
   - `Failed to load DB users (500)`

#### Backend

1. เพิ่ม admin read-only endpoints:
   - `/api/admin/db/summary`
   - `/api/admin/db/users`
   - `/api/admin/db/users/:id/details`
   - `/api/admin/db/login-sessions`
   - `/api/admin/db/sensor-data`
   - `/api/admin/db/audit-logs`
   - `/api/admin/db/otp-codes`
2. เพิ่ม middleware ให้ map JWT payload ไปที่ `req.user`
3. แก้ query `users` endpoint ไม่ให้อ้าง `updated_at` ที่ไม่มีใน schema จริง

### 11.6 เช็กลำดับ deploy ที่ถูกต้อง

1. Commit + push backend ก่อน (Render ต้องเห็น endpoint ใหม่)
2. รอ Render deploy เสร็จ
3. Commit + deploy frontend (`npm run deploy`)
4. เปิดเว็บพร้อม cache-bypass:
   - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/?v=admin-db-ok-1`
5. Logout/Login ใหม่ 1 รอบเพื่อรีเฟรช token

### 11.7 เช็กรวดเร็วด้วย curl

Health:

```bash
curl -sS https://greencrop-api.onrender.com/api/health
```

Login:

```bash
curl -sS -X POST https://greencrop-api.onrender.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@smartiot.com","password":"password123"}'
```

Users (ต้องใส่ Bearer token):

```bash
curl -sS -i https://greencrop-api.onrender.com/api/admin/db/users \
  -H "Authorization: Bearer <TOKEN>"
```

### 11.8 สรุปสั้น

1. ถ้า `401` ให้แก้ token/session ก่อน
2. ถ้า `500` ให้ดู backend log + schema mismatch
3. ถ้า endpoint ใช้งานได้ใน Postman แต่เว็บพัง ให้ดู cache/session ฝั่ง browser

## 12) เพิ่มเติมฝั่งแอพ (Flutter): User Activity & Access Monitoring

อัปเดต: 10 มีนาคม 2026

หัวข้อนี้สรุปให้ “ข้อมูลฝั่งแอพ” ถูกเก็บในฐานเดียวกับเว็บ และเปิดดูจากหน้า Admin ได้แบบแยกผู้ใช้

### 12.1 เป้าหมาย

1. เก็บประวัติการใช้งานรายผู้ใช้ (User-based)
2. แยกเวลาเข้า/ออกระบบ และสถานะ session
3. เก็บข้อมูลอุปกรณ์ + OS + Browser/WebView + IP ให้ตรวจสอบย้อนหลังได้
4. ค้นหา/กรองตามผู้ใช้ ช่วงเวลา อุปกรณ์ และกิจกรรมได้

### 12.2 ตารางที่ใช้งานอยู่แล้วในระบบนี้

1. `login_sessions`
   - ใช้เก็บ `login_time`, `logout_time`, `status`, `device_type`, `device_name`, `browser`, `os`, `ip_address`
2. `audit_logs`
   - ใช้เก็บ action เช่น `LOGIN`, `LOGOUT`, `UPDATE_PROFILE`, `LOGIN_ATTEMPT`
3. `sensor_data`
   - ใช้เก็บการเข้าถึง/ส่งข้อมูล IoT (tenant/device/sensor/timestamp)

### 12.3 ฝั่งแอพต้องทำอะไร (Flutter Checklist)

1. Login แล้วเก็บ JWT ลง secure storage
2. ทุก API ที่เป็น protected route ต้องส่ง header:
   - `Authorization: Bearer <token>`
3. ตอนเปิดแอพใหม่ ให้ restore token/session ก่อนเรียก API หลัก
4. ตอน logout ให้เรียก `POST /api/logout` ทุกครั้ง (เพื่อปิด session ให้ครบ)
5. ถ้าเจอ `401` ให้ clear token แล้วบังคับ login ใหม่

### 12.4 แนะนำ header เพิ่มจาก Flutter (เพื่อให้ log ละเอียดขึ้น)

แอพส่งเพิ่มได้โดยไม่กระทบ API เดิม:

1. `X-Client-Platform: Flutter`
2. `X-App-Version: <version>`
3. `X-Device-Name: <device model>`
4. `X-OS-Version: <os version>`
5. `X-Network-Type: wifi|cellular|ethernet`

หมายเหตุ: ตอนนี้ระบบ parse จาก `user-agent` ได้แล้วระดับหนึ่ง แต่ถ้าส่ง header เพิ่ม จะทำให้ข้อมูลแม่นกว่า โดยเฉพาะฝั่ง mobile

### 12.5 มุมมองที่ Admin ใช้ดูข้อมูลรวม Web + App

1. `/api/admin/db/login-sessions`
   - ดู session ทั้งหมด, อุปกรณ์, เวลา login/logout, active/inactive
2. `/api/admin/db/audit-logs`
   - ดูกิจกรรมย้อนหลังและสถานะ success/failed
3. `/api/admin/db/users/:id/details`
   - ดูเจาะราย user เดียว (sessions + audit + sensor)

### 12.6 Time Filter / Search / Filter (ที่ควรใช้เป็นมาตรฐาน)

1. Daily / Weekly / Monthly / Custom Date Range
2. Filter ตาม:
   - user_id / email
   - action (LOGIN, LOGOUT, UPDATE_PROFILE, ฯลฯ)
   - status (SUCCESS/FAILED)
   - device_type / device_name
3. แนะนำเพิ่ม export CSV สำหรับรายงาน

### 12.7 Security Alerts ที่ควรเปิดใช้งาน

1. Login failed ติดต่อกันหลายครั้ง
2. Login จากอุปกรณ์ใหม่ที่ไม่เคยเจอ
3. Login จาก location/IP ผิดปกติ
4. Session หมดอายุบ่อยผิดปกติ

### 12.8 แนวทางไม่ให้ Web/App พังระหว่างเพิ่มฟีเจอร์

1. เพิ่มคอลัมน์ใหม่แบบ optional (`NULL`) ก่อนเสมอ
2. อย่าลบ endpoint เดิมที่ Web/App เรียกอยู่
3. deploy backend ก่อน แล้วค่อย deploy frontend/app
4. มี fallback ใน client เสมอเมื่อ field ใหม่ยังไม่มา

### 12.9 สรุป

1. ตอนนี้โครงสร้าง backend รองรับการเก็บ log ฝั่งแอพร่วมกับเว็บได้แล้ว
2. สิ่งที่ต้องเน้นคือการส่ง JWT ให้ถูกต้องทุก request และเรียก logout endpoint ให้ครบ
3. ถ้าต้องการข้อมูลละเอียดระดับ device/network จริง ให้เพิ่ม custom headers จาก Flutter ตามข้อ 12.4
