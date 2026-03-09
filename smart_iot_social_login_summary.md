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
