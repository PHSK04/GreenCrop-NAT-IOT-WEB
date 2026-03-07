# Developer Notes & Code Snippets

Use this file to store temporary code, ideas, or backup snippets.

## Login Page backup (Previous Version)

This version corresponds to "Login 2 UI" found in `src/components/pages/log in 1.js`.

```tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
  CloudRain,
  Sun,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import loginBg from "@/assets/images/login_bg.png";

// ... [Truncated for brevity, full code available in history]
```

## To-Do List

- [x] Refactor Login Page to Sci-Fi theme
- [ ] Add backend integration for real authentication

## Useful Snippets

### Quick Toast

```tsx
toast.success("Message", { description: "Details" });
```
## Share Checklist (GitHub Pages + API)

Use this checklist before sharing the project link to other people.

### 1) Repository & Pages

- [ ] Set repository visibility to `Public`
- [ ] Run deploy: `npm run deploy`
- [ ] In GitHub `Settings > Pages`, set:
- [ ] Source: `Deploy from a branch`
- [ ] Branch: `gh-pages` / `(root)`
- [ ] Open and verify: `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`

### 2) Backend & Database

- [ ] Backend is running on a public URL (not localhost)
- [ ] `.env.production` has correct API URL:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

- [ ] Database connection on backend is healthy
- [ ] API endpoints used by frontend return success in production

### 3) CORS & Auth

- [ ] Backend allows origin: `https://phsk04.github.io`
- [ ] Auth token flow works (login, protected API calls)
- [ ] Register/Login/Profile read/update works end-to-end

### 4) Final QA Before Sharing

- [ ] Open site from another browser/incognito
- [ ] Test login with demo account
- [ ] Test dashboard data loading
- [ ] Check browser console for errors
- [ ] Check Network tab: API must not call `localhost`

### 5) Share Package

- [ ] Share live URL
- [ ] Share repository URL
- [ ] Share demo account (if needed)
- [ ] Add short usage note (what works, what is demo-only)

## Long-Term Knowledge Note (Auto Deploy + API Safety)

This section is a detailed reference for maintaining this project as portfolio work.

### A) Does the website update automatically after code changes?

Now: Yes, if changes are pushed to `main`.

Why:
- We added GitHub Actions workflow at:
  - `.github/workflows/deploy-pages.yml`
- Trigger:
  - Every push to `main`
  - Manual run from GitHub Actions (`workflow_dispatch`)

Flow:
1. Push code to `main`
2. GitHub Actions runs install + build
3. Action deploys `dist/` to `gh-pages`
4. GitHub Pages serves latest version

Expected delay:
- usually 1-5 minutes after workflow success

### B) What must be configured in GitHub for production API?

Add repository secrets at:
- `Settings > Secrets and variables > Actions > New repository secret`

Recommended secrets:
- `VITE_API_URL` (required for real backend)
- `VITE_GOOGLE_CLIENT_ID` (optional)
- `VITE_FACEBOOK_APP_ID` (optional)
- `VITE_APPLE_CLIENT_ID` (optional)
- `VITE_APPLE_REDIRECT_URI` (optional)

Example:

```txt
VITE_API_URL = https://your-backend-domain.com/api
```

Important:
- Never use `localhost` in production secret values
- Frontend on GitHub Pages cannot access your local machine backend

### C) Will this break backend/database or mobile app API?

No direct impact on backend/database from Pages deploy.

Reason:
- GitHub Pages only hosts static frontend files
- Backend process (`server/server.js`) and DB stay separate
- API routes were not moved to GitHub Pages

What can fail:
- Wrong `VITE_API_URL`
- Missing CORS allowlist on backend
- Expired/invalid auth token

### D) Backend CORS minimum for this site

Allow at least:

```txt
https://phsk04.github.io
```

If CORS is blocked, app opens but API features fail (login/data load errors).

### E) How to verify after each release

1. Check workflow status: `Actions` tab should be green
2. Open live URL:
   - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
3. Test login/register/profile update
4. Open browser DevTools > Network
5. Confirm API calls go to backend domain, not localhost

### F) Fast troubleshooting matrix

- Symptom: 404 on Pages
  - Check `Settings > Pages` uses `gh-pages / (root)`

- Symptom: Site not updating
  - Check latest workflow run result in `Actions`
  - Confirm commit was pushed to `main`

- Symptom: Login failed in production only
  - Check `VITE_API_URL` secret
  - Check backend CORS and auth middleware

- Symptom: Works locally but not online
  - Local uses proxy/localhost
  - Online must use public backend URL

### G) Use One Database for Local + GitHub Pages

Set both environments to the same backend API URL:

1. Local file `.env`

```env
VITE_API_URL=https://your-backend-domain.com/api
```

2. GitHub secret `VITE_API_URL` (same exact value)

Result:
- Local web and GitHub Pages call the same backend
- Both use the same database (no split data)

### H) Continuation Steps (from current setup)

Follow these in order to keep everything on one backend/database.

1. Local frontend `.env` (root project):

```env
VITE_API_URL=https://your-backend-domain.com/api
```

2. GitHub repo secret:
- Name: `VITE_API_URL`
- Value: same as local `.env` exactly

3. Backend env (`server/.env` in deployed backend):
- Ensure `CORS_ORIGINS` includes:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `https://phsk04.github.io`

4. Deploy/update frontend:
- Push to `main` (auto deploy workflow runs), or run manual deploy

5. Verification checklist:
- Local web login works
- GitHub Pages login works
- New user created from local can login on Pages (same DB proof)
- API calls in both places point to same backend domain

6. If login fails on Pages only:
- Check Actions workflow status
- Check `VITE_API_URL` secret value
- Check backend CORS allowlist

7. If login fails on both local and Pages:
- Check backend health endpoint
- Check backend DB credentials and service status

## I) GitHub Pages แบบละเอียด (รวมเรื่องชื่อ URL)

### 1) ชื่อ GitHub Pages มี 2 แบบ

- `User/Org Page`:
  - Repo ต้องชื่อ: `<username>.github.io`
  - URL: `https://<username>.github.io/`

- `Project Page` (โปรเจกต์นี้ใช้แบบนี้):
  - Repo ชื่ออะไรก็ได้ เช่น `GreenCrop-NAT-IOT-WEB`
  - URL: `https://<username>.github.io/<repo-name>/`
  - ของโปรเจกต์นี้คือ:
    - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`

### 2) ตั้งค่าโปรเจกต์ให้ตรงกับ Project Page

1. ใน `package.json`:
   - `"homepage": "https://phsk04.github.io/GreenCrop-NAT-IOT-WEB"`
2. ใช้คำสั่ง build สำหรับ GitHub Pages ให้มี base path:
   - `vite build --base=/GreenCrop-NAT-IOT-WEB/`
3. ในโปรเจกต์นี้มี script แล้ว:
   - `build:gh`
   - `deploy`

### 3) ตั้งค่าใน GitHub

1. เปิด repo `PHSK04/GreenCrop-NAT-IOT-WEB`
2. ไป `Settings > Pages`
3. `Source` เลือก `Deploy from a branch`
4. `Branch` เลือก `gh-pages` และโฟลเดอร์ `(root)`
5. กด Save

### 4) วิธี deploy

- แบบ auto (แนะนำ):
  1. push code ขึ้น `main`
  2. GitHub Actions จะ build/deploy ให้อัตโนมัติ

- แบบ manual:
  1. `npm run deploy`
  2. ระบบจะ build แล้ว push ไป branch `gh-pages`

### 5) วิธีเช็กว่า deploy สำเร็จ

1. ไปแท็บ `Actions` ต้องขึ้นสถานะเขียว (`Success`)
2. เปิด URL:
   - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
3. ถ้ายังเห็นของเก่า ให้ hard refresh:
   - macOS: `Cmd + Shift + R`

### 6) จุดที่ทำให้เข้าเว็บไม่ได้บ่อยที่สุด

- ตั้ง branch ผิด (ไม่ใช่ `gh-pages`)
- base path ผิด (ลืม `/GreenCrop-NAT-IOT-WEB/`)
- หน้าเว็บเรียก API ผิดโดเมน
- CORS backend ไม่อนุญาต `https://phsk04.github.io`

### 7) คำเตือนเรื่องคำสั่งตัวอย่าง

- ห้ามพิมพ์ `< >` ลงคำสั่งจริง
- ตัวอย่างผิด:
  - `curl https://<your-tunnel-url>/api/health`
- ตัวอย่างถูก (ใช้ URL จริง):
  - `curl https://supplements-bend-separation-fool.trycloudflare.com/api/health`

## J) รันคำสั่งเดียว (Server + Tunnel)

เพิ่มแล้วใน `package.json`:

- `npm run server:public`
  - รัน `node server/server.js` และ `cloudflared tunnel --url http://localhost:3001` พร้อมกัน

- `npm run server:public:stable` (แนะนำ)
  - รันแบบเฝ้าระวังอัตโนมัติ
  - ถ้า tunnel หลุด จะพยายามรีสตาร์ต tunnel ให้เอง
  - บันทึก log ไว้ที่ `.runtime/server.log` และ `.runtime/tunnel.log`
  - เก็บ URL ปัจจุบันไว้ที่ `.runtime/tunnel_url.txt`

- `npm run server:tunnel`
  - รันเฉพาะ tunnel

วิธีใช้:

```bash
npm run server:public
```

หรือ (เสถียรกว่า):

```bash
npm run server:public:stable
```

หยุดการทำงาน:

- กด `Ctrl + C`

หมายเหตุ:

- URL ของ quick tunnel จะเปลี่ยนได้เมื่อเปิดใหม่
- ถ้า URL เปลี่ยน ต้องอัปเดต `VITE_API_URL` ที่ใช้ deploy GitHub Pages ให้ตรง URL ใหม่

## K) แบบถาวร (ไม่ต้องเปลี่ยน URL API ทุกครั้ง)

เป้าหมาย:
- ให้ GitHub Pages ใช้ backend URL คงที่
- ไม่ต้องพึ่ง quick tunnel

ทำครั้งเดียว:

1. Deploy backend แบบถาวรบน Render
- ใน repo มีไฟล์ `render.yaml` แล้ว
- สร้าง Web Service ใหม่จาก repo นี้
- Render จะใช้:
  - Build: `npm ci --legacy-peer-deps`
  - Start: `node server/server.js`
  - Health: `/api/health`

2. ตั้งค่า Environment Variables ใน Render
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGINS` (อย่างน้อยต้องมี `https://phsk04.github.io,http://localhost:3000,http://127.0.0.1:3000`)
- `NODE_ENV=production`
- `API_HOST=0.0.0.0`

3. เอา URL ถาวรจาก Render (ตัวอย่าง)
- `https://greencropnat-api.onrender.com`

4. ตั้ง GitHub Secret ให้ถาวร
- ไป `Settings > Secrets and variables > Actions`
- ตั้ง `VITE_API_URL` เป็น:
  - `https://greencropnat-api.onrender.com/api`

5. Push โค้ดขึ้น `main` เพื่อ deploy หน้าเว็บ
- workflow จะใช้ `VITE_API_URL` จาก secret อัตโนมัติ

ผลลัพธ์:
- GitHub Pages ใช้งาน URL เดิมตลอด
- ไม่ต้องไล่เปลี่ยนลิงก์ tunnel อีก
