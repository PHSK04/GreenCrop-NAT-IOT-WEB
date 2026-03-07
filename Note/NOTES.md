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

## Quick Fix Notes (2026-02-26)

### 1) `npm run dev` แล้วขึ้น `EADDRINUSE: 3001`

สาเหตุ: มี `node server.js` ตัวเก่าค้างอยู่

วิธีแก้:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
pkill -f "node server.js" || true
pkill -f "nodemon server.js" || true
cd server && npm run dev
```

หมายเหตุ: ปรับ `server/package.json` แล้วให้ `dev` เคลียร์พอร์ต `3001` อัตโนมัติก่อนรัน `nodemon`

### 2) หน้าเว็บขึ้น `Registration failed`

เช็คตามลำดับ:

```bash
docker ps | grep azuresqledge
curl -sS http://localhost:3001/api/health
```

ถ้า backend ไม่รัน:

```bash
cd server && npm run dev
```

ถ้า frontend ยิง API ไม่ถูก:

ไฟล์ `.env` (root):

```env
VITE_API_URL=http://localhost:3001/api
```

### 3) ข้อมูลเก่าหาย / DB ว่าง

จุดที่ต้องระวัง:
- สร้าง DB ใหม่ (`SmartIoTDB`) จะได้ฐานเปล่า
- ใช้คนละพอร์ต/คนละ container
- ลบ Docker volume แล้วข้อมูลเก่าจะหายถาวร

ค่าปัจจุบันที่ใช้กับโปรเจค:
- Server: `localhost`
- Port: `1433`
- User: `sa`
- Password: `SmartIoT@2229!`
- Database: `SmartIoTDB`
- Trust Server Certificate: `true`

## API Auth Note (2026-03-04)

### `GET /api/users` ต้องส่ง Token

ถ้าไม่ส่ง `Authorization` header จะได้:

```json
{"error":"No token provided"}
```

### ลำดับทดสอบเร็ว

1) Login เพื่อเอา token

```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"123456"}'
```

2) เอา `token` จากผลลัพธ์ แล้วเรียก `/api/users`

```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### หมายเหตุ Nest wrapper

- ตอนนี้ backend รันผ่าน `server/nest-server.js`
- API contract เดิมยังเหมือนเดิม (route/method/response เดิม)
