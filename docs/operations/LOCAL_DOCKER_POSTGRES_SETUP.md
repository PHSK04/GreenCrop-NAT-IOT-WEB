# Local API + Docker Postgres Setup

คู่มือนี้ใช้สำหรับรันระบบแบบ:

`GitHub Pages -> API Backend -> PostgreSQL in Docker`

เหมาะกับกรณีที่ต้องการ:
- ใช้ GitHub Pages ต่อเหมือนเดิม
- ให้ backend เป็นตัวกลางสำหรับเว็บและ IoT
- รันฐานข้อมูลใน Docker บนเครื่องตัวเอง
- ใช้โปรแกรมดูฐานข้อมูล เช่น Azure Data Studio หรือ client อื่น เพื่อตรวจตารางและ query ข้อมูล

## 1) สิ่งที่ต้องมี

- Node.js
- Docker Desktop
- dependency ของโปรเจกต์ติดตั้งแล้ว (`npm install` และ `cd server && npm install`)

## 2) รันฐานข้อมูลใน Docker

ที่ root ของโปรเจกต์:

```bash
npm run db:up
```

ค่าที่ใช้ใน compose นี้:

- Host: `localhost`
- Port: `5432`
- Database: `SmartIoTDB`
- User: `postgres`
- Password: `postgres123`

ถ้าต้องการดู log:

```bash
npm run db:logs
```

ถ้าต้องการปิด:

```bash
npm run db:down
```

## 3) ตั้งค่า backend

คัดลอกไฟล์ตัวอย่าง:

```bash
cp server/.env.docker-postgres.example server/.env
```

backend ตัวปัจจุบันของโปรเจกต์ใช้ `server/database_postgres.js` อยู่แล้ว จึงต่อกับ Docker Postgres ได้ตรง ๆ

## 4) รัน API backend

```bash
npm run server
```

เช็ก health:

```bash
curl http://localhost:3001/api/health
```

ถ้าปกติจะเห็น `ok: true` และสถานะฐานข้อมูลใน response

## 5) รัน frontend ในเครื่อง

สำหรับทดสอบ local:

```bash
npm run dev:web
```

ใช้ `.env` ฝั่ง frontend ให้ `VITE_API_URL=http://localhost:3001/api`

## 6) ใช้กับ GitHub Pages

GitHub Pages รันได้เฉพาะ frontend ดังนั้น production frontend ต้องชี้มาที่ backend URL จริงของคุณเสมอ

สร้าง `.env.production`:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

จากนั้น build/deploy ตามคู่มือ [GITHUB_PAGES_DEPLOY.md](/Users/phsk/Documents/GitHub/GreenCrop-NAT-IOT-WEB/docs/operations/GITHUB_PAGES_DEPLOY.md)

ถ้า backend ยังรันอยู่บนเครื่องตัวเอง คุณจะต้องเปิด public URL ให้เครื่องเข้าจากภายนอกได้ก่อน เช่น tunnel หรือ reverse proxy

## 7) ใช้กับ IoT

แนวทางที่ถูกต้องคือ:

`IoT Device -> API Backend -> PostgreSQL`

ไม่ควรให้ device หรือหน้าเว็บต่อฐานข้อมูลตรง

สิ่งที่ต้องตั้ง:

- device ต้องยิงมาที่ URL ของ backend
- backend ต้องออนไลน์ตลอดถ้าต้องการรับข้อมูลต่อเนื่อง
- ถ้ามีหลายเครื่อง ควรส่ง `device_id`, `sensor_id`, `tenant_id` ให้ครบ

## 8) โปรแกรมดูฐานข้อมูล

ถ้าคุณใช้ Azure Data Studio หรือ client อื่น ให้ต่อเข้าที่:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres123`
- Database: `SmartIoTDB`

ตารางหลักที่ควรเห็นหลัง backend เริ่มทำงาน:

- `users`
- `sensor_data`
- `login_sessions`
- `device_pairings`
- `chat_threads`
- `chat_messages`

## 9) ลำดับรันที่แนะนำ

1. `npm run db:up`
2. `cp server/.env.docker-postgres.example server/.env`
3. `npm run server`
4. `curl http://localhost:3001/api/health`
5. `npm run dev:web`

## 10) ข้อควรจำ

- GitHub Pages ใช้ได้ต่อ แต่ใช้เฉพาะ frontend
- API และ DB ต้องแยกรันเอง
- ถ้าจะใช้กับ GitHub Pages จริง ต้องมี backend URL ที่ frontend เข้าถึงได้
- ถ้าจะใช้กับ IoT จริงต่อเนื่อง ควรให้ backend อยู่บนเครื่องหรือ server ที่เปิดตลอด
