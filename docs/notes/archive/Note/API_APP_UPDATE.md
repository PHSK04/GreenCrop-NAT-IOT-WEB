# APP API UPDATE NOTE

วันที่อัปเดต: 8 มีนาคม 2026

## เป้าหมาย
เอกสารนี้สรุปการเปลี่ยนแปลง API ที่แอพต้องใช้หลังปรับ backend เวอร์ชันล่าสุด

## 1) Base URL ของ API
ใช้ตัวแปรเดียวกันทั้งแอพ:

- `VITE_API_URL` (frontend)
- fallback เป็น `'/api'` ถ้าไม่ได้กำหนดค่า

ตัวอย่าง:

- Local: `http://localhost:3001/api`
- Production: `https://<your-backend-domain>/api`

ไฟล์อ้างอิง:

- `.env.example`
- `.env.production.example`
- `src/features/auth/services/authService.ts`
- `src/contexts/MachineContext.tsx`

## 2) Endpoint ที่ใช้งานในแอพ (ปัจจุบัน)

### Auth
- `POST /api/login` (แอพเรียกตัวนี้)
- `POST /api/auth/login` (backend ยังรองรับไว้)
- `POST /api/register`
- `POST /api/logout`
- `POST /api/verify-password`
- `POST /api/auth/social`

### User Management
- `GET /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/:id/role`
- `DELETE /api/users/:id`

### Session
- `GET /api/login-sessions`
- `GET /api/login-sessions/user/:userId`
- `GET /api/login-sessions/active`

### Sensor / Machine
- `GET /api/sensor-data?tenant_id=<tenantId>`
- `POST /api/sensor-data`

## 3) Header ที่ต้องส่ง

สำหรับ endpoint ที่ต้องยืนยันตัวตน:

- `Authorization: Bearer <token>`

สำหรับ endpoint ที่อิง tenant (โดยเฉพาะ sensor):

- `x-tenant-id: <tenantId>`
- และ/หรือ query `tenant_id=<tenantId>`

หมายเหตุ: backend รองรับอ่าน tenant จาก token/header/query/body ตาม route ที่เกี่ยวข้อง

## 4) โครงสร้าง Session ในฝั่งแอพ
แอพเก็บ session ที่ key:

- `smart_iot_session`

ข้อมูลที่ใช้งาน:

- `token`
- `user.id` (ถูกใช้เป็น tenant id ในการอ่าน sensor data)

ไฟล์อ้างอิง:

- `src/features/auth/services/authService.ts`
- `src/contexts/MachineContext.tsx`

## 5) การเปลี่ยนที่ควรรู้ (Impact)

1. ต้องตั้ง `VITE_API_URL` ให้ถูกต้องก่อน build production (โดยเฉพาะ GitHub Pages)
2. หากไม่ตั้ง production API แล้วแอพรันบน `github.io` จะถูกบล็อกด้วยข้อความ:
   - `Production API is not configured. Set VITE_API_URL in GitHub Actions secrets.`
3. การอ่านข้อมูลเครื่องจักรต้องมีทั้ง token และ tenant ที่ตรงกัน
4. CORS ของ backend เปิด header `Authorization` และ `x-tenant-id` แล้ว

## 6) Checklist หลังแก้ API

1. Login ได้ผ่าน `POST /api/login`
2. เรียก `GET /api/users` ได้หลัง login
3. หน้าเครื่องจักรโหลด `GET /api/sensor-data?tenant_id=...` ได้
4. ไม่มี error CORS เรื่อง `Authorization` หรือ `x-tenant-id`
5. Production build มี `VITE_API_URL` ชี้ backend จริง

## 7) Quick Test (curl)

```bash
# Health
curl -sS http://localhost:3001/api/health

# Login
curl -sS -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@smartiot.com","password":"password123"}'
```

