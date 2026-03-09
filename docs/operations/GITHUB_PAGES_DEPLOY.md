# GitHub Pages Deployment Guide (GreenCrop NAT IOT)

คู่มือนี้ใช้สำหรับ deploy ฝั่ง Frontend ขึ้น GitHub Pages โดยไม่กระทบการเชื่อม API/Database

## 1) ข้อสำคัญก่อนเริ่ม

- GitHub Pages host ได้เฉพาะ static frontend
- `server/server.js` จะไม่รันบน GitHub Pages
- Database (MSSQL) ต้องเชื่อมผ่าน backend ที่ deploy แยกไว้

## 2) เตรียม Backend Production

ต้องมี backend URL ที่ใช้งานได้จริง เช่น:

```txt
https://your-backend-domain.com/api
```

## 3) เตรียม Environment สำหรับ Production

สร้างไฟล์ `.env.production` จาก `.env.production.example` แล้วใส่ค่าจริง:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_GOOGLE_CLIENT_ID=
VITE_FACEBOOK_APP_ID=
VITE_APPLE_CLIENT_ID=
VITE_APPLE_REDIRECT_URI=
```

หมายเหตุ:
- ห้ามใช้ `localhost` ใน `.env.production`
- ค่า `VITE_API_URL` ต้องลงท้ายด้วย `/api` ตาม route ของ backend

## 4) ตรวจค่าในโปรเจกต์ (ตั้งไว้แล้ว)

- `homepage` ใน `package.json`:
  - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB`
- scripts:
  - `build:gh` ใช้ base path สำหรับ repo นี้
  - `predeploy` เรียก `build:gh`
  - `deploy` push ไฟล์จาก `dist` ไป branch `gh-pages`
- ฝั่ง auth service:
  - dev fallback ไป `localhost:3001` ได้
  - production ใช้ `VITE_API_URL` อย่างเดียว

## 5) Deploy

รันคำสั่ง:

```bash
npm run deploy
```

คำสั่งนี้จะ:
1. build โปรเจกต์แบบ GitHub Pages
2. publish `dist/` ไป branch `gh-pages`

## 6) ตั้งค่า GitHub Repository

ไปที่ GitHub Repo > `Settings` > `Pages`

ตั้งค่า:
- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`

URL ที่ได้:

```txt
https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/
```

## 7) หลัง Deploy ต้องตรวจอะไร

1. เปิดเว็บแล้วโหลดหน้าได้ครบ
2. Login/Register ทำงาน
3. ข้อมูลหน้า Dashboard ดึงจาก API ได้
4. DevTools > Network:
   - request ต้องไปที่ `https://your-backend-domain.com/api/...`
   - ไม่ควรยิงไป `localhost`

## 8) Backend CORS ที่ต้องอนุญาต

ต้อง allow origin อย่างน้อย:

```txt
https://phsk04.github.io
```

ถ้าใช้ social login ให้ตรวจ redirect/callback domain ของ provider ให้ตรงกับโดเมนนี้ด้วย

## 9) Troubleshooting

### 404 asset หรือหน้าไม่ขึ้น
- ตรวจว่า deploy ด้วย `npm run deploy` (ไม่ใช่ build ธรรมดา)
- ตรวจว่าใช้ branch `gh-pages` จริง

### 404: There isn't a GitHub Pages site here
อาการนี้หมายถึง GitHub Pages ยังไม่ถูก publish จาก repo นี้

ให้ทำตามลำดับนี้:
1. ตรวจว่า push ขึ้น GitHub ได้ปกติ (ถ้าเจอ `Host key verification failed` ให้แก้ SSH ก่อน)
2. รัน `npm run deploy` ให้เสร็จ
3. เข้า GitHub repo > `Settings` > `Pages`
4. ตั้ง Source เป็น `Deploy from a branch`
5. เลือก branch `gh-pages` และ folder `(root)`
6. รอ 1-5 นาทีแล้ว refresh URL อีกครั้ง

คำสั่งเช็กเร็ว:

```bash
git branch --all
git ls-remote --heads origin gh-pages
```

ถ้าไม่มี `gh-pages` แสดงว่าการ deploy ยังไม่ขึ้นจริง

### เรียก API ไม่ได้
- ตรวจ `VITE_API_URL` ใน `.env.production`
- ตรวจ backend เปิดใช้งานและ route `/api/...` ถูกต้อง
- ตรวจ CORS

### Login ไม่ผ่าน แต่ API ตอบกลับปกติ
- ตรวจ token header (`Authorization: Bearer ...`)
- ตรวจ backend middleware/tenant validation

## 10) คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run server
npm run dev:all
npm run build
npm run build:gh
npm run deploy
```

## 11) Auto Deploy (เปิดใช้แล้ว)

โปรเจกต์นี้ตั้งค่า GitHub Actions ไว้แล้วที่:

```txt
.github/workflows/deploy-pages.yml
```

Behavior:
- push ไปที่ `main` => build + deploy อัตโนมัติ
- run ได้เองจากหน้า Actions (`workflow_dispatch`)

สิ่งที่ต้องตั้งใน GitHub Secrets:
- `VITE_API_URL` (แนะนำให้ตั้งเป็นหลัก)
- optional: social login client IDs

ตำแหน่งตั้งค่า:
- `Settings > Secrets and variables > Actions`

หลัง push:
1. ดูผลที่แท็บ `Actions`
2. ถ้า workflow ผ่าน รอ 1-5 นาที
3. เว็บหน้า Pages จะอัปเดตตาม commit ล่าสุด
