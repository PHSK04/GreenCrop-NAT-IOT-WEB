# Local API + Docker SQL Server Setup

คู่มือนี้ใช้สำหรับรันระบบแบบ:

`GitHub Pages -> API Backend -> SQL Server in Docker`

เหมาะกับกรณีที่ต้องการใช้ SQL Server ต่อ, เรียนฐานข้อมูลผ่าน API, และดูข้อมูลด้วย Azure Data Studio

## 1) สิ่งที่ต้องมี

- Node.js
- Docker Desktop
- dependency ของโปรเจกต์ติดตั้งแล้ว (`npm install` และ `cd server && npm install`)

## 2) รัน SQL Server ใน Docker

ที่ root ของโปรเจกต์:

```bash
npm run db:mssql:up
```

ค่าที่ใช้:

- Host: `localhost`
- Port: `1433`
- User: `sa`
- Password: `Password123!`
- Database: `SmartIoTDB`

ดู log:

```bash
npm run db:mssql:logs
```

ปิด container:

```bash
npm run db:mssql:down
```

## 3) ตั้งค่า backend

คัดลอก env ตัวอย่าง:

```bash
cp server/.env.docker-mssql.example server/.env
```

โปรเจกต์นี้รองรับการเลือก DB ผ่าน `DB_CLIENT` แล้ว:

- `DB_CLIENT=mssql` ใช้ `server/database_mssql.js`
- `DB_CLIENT=postgres` ใช้ `server/database_postgres.js`

## 4) รัน API backend

```bash
npm run server
```

เช็ก health:

```bash
curl http://localhost:3001/api/health
```

## 5) ใช้ Azure Data Studio

เชื่อมต่อด้วยค่า:

- Server: `localhost`
- Port: `1433`
- Authentication: SQL Login
- User: `sa`
- Password: `Password123!`
- Trust server certificate: `true`

จากนั้นสร้างหรือเปิด database `SmartIoTDB`

## 6) ใช้กับ GitHub Pages

GitHub Pages ยังใช้ได้ตามเดิม แต่ frontend production ต้องชี้ไป backend URL จริงเสมอ

ตัวอย่าง `.env.production`:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

## 7) ใช้กับ IoT

แนวทางที่ถูกต้อง:

`IoT Device -> API Backend -> SQL Server`

ไม่ควรให้ device ต่อฐานข้อมูลตรง

## 8) ลำดับรันที่แนะนำ

1. `npm run db:mssql:up`
2. `cp server/.env.docker-mssql.example server/.env`
3. `npm run server`
4. `curl http://localhost:3001/api/health`
5. `npm run dev:web`

## 9) ข้อควรจำ

- GitHub Pages ใช้เฉพาะ frontend
- backend และ database ต้องรันแยก
- ถ้าจะใช้กับ GitHub Pages จริง ต้องมี backend URL ที่เข้าถึงได้จากภายนอก
- ถ้าจะใช้กับ IoT ต่อเนื่อง ควรให้ backend ออนไลน์ตลอด
