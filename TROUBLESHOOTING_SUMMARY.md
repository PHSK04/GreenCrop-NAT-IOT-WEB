# 📋 สรุปการแก้ไขปัญหา SQL Server - วันที่ 15 ก.พ. 2569

## 🔴 ปัญหาที่พบ

### 1. "Login failed for user 'sa'"

- **อาการ:** ไม่สามารถเชื่อมต่อ SQL Server จาก GUI tools (Azure Data Studio)
- **สาเหตุ:** SQL Server ยังไม่พร้อมรับการเชื่อมต่อหลัง start/restart container
- **วิธีแก้:** รอ 10-15 วินาทีหลัง start container

### 2. Docker Container หยุดทำงาน

- **อาการ:** Container `azuresqledge` หยุดทำงาน (Exited)
- **สาเหตุ:** Docker Desktop restart หรือ system restart
- **วิธีแก้:** ตั้งค่า auto-start policy

### 3. ดูข้อมูลใน Database ไม่ได้

- **อาการ:** ไม่สามารถดูข้อมูลจาก GUI tools
- **สาเหตุ:** SQL Server ไม่ทำงาน หรือ Backend/Frontend ไม่ได้รัน
- **วิธีแก้:** Start ทุก components ให้ครบ

---

## ✅ วิธีแก้ไขที่ทำไปแล้ว

### 1. แก้ปัญหา Authentication

```bash
# รีสตาร์ท container และรอให้พร้อม
docker restart azuresqledge
sleep 15

# ทดสอบการเชื่อมต่อ
node server/test_db_connection.js
```

### 2. ตั้งค่า Auto-Start

```bash
# ตั้งค่าให้ container เริ่มอัตโนมัติ
docker update --restart unless-stopped azuresqledge
docker update --restart unless-stopped SQL_Server_2022
```

### 3. สร้างสคริปต์ช่วยเหลือ

- ✅ `fix_sql_auth.sh` - แก้ปัญหา authentication
- ✅ `test_db_connection.js` - ทดสอบการเชื่อมต่อ

---

## 📊 ข้อมูลการเชื่อมต่อ SQL Server

### สำหรับ GUI Tools (Azure Data Studio / SSMS)

```
Server: localhost
Port: 1433 (ไม่ต้องระบุ - เป็น default)
Authentication: SQL Login
Username: sa
Password: SmartIoT@2229!
Database: SmartIoTDB
Trust Server Certificate: Yes
```

### สำหรับ Application (.env file)

```env
DB_USER=sa
DB_PASSWORD=SmartIoT@2229!
DB_HOST=localhost
DB_NAME=SmartIoTDB
DB_PORT=1433
```

---

## 🐳 Docker Containers

### Container ที่ใช้งาน:

| Container Name  | Image             | Port | Database             | Status        |
| --------------- | ----------------- | ---- | -------------------- | ------------- |
| azuresqledge    | azure-sql-edge    | 1433 | SmartIoTDB (Project) | Auto-start ✅ |
| SQL_Server_2022 | mssql/server:2022 | 1434 | Learning             | Auto-start ✅ |

### คำสั่งที่ใช้บ่อย:

```bash
# ดูสถานะ containers
docker ps

# ดูทุก containers (รวมที่หยุด)
docker ps -a

# Start container
docker start azuresqledge

# Restart container
docker restart azuresqledge

# Stop container
docker stop azuresqledge

# ดู logs
docker logs azuresqledge --tail 50

# ตรวจสอบ restart policy
docker inspect azuresqledge | grep -A 3 "RestartPolicy"
```

---

## 🚀 วิธีรันระบบ

### ต้องเปิด 3 ส่วน:

#### 1. Database (SQL Server)

```bash
# ตรวจสอบว่าทำงานอยู่
docker ps | grep azuresqledge

# ถ้าไม่ทำงาน ให้ start
docker start azuresqledge
```

#### 2. Backend API Server

```bash
cd server
node server.js
```

→ ทำงานที่ `http://localhost:3001`

#### 3. Frontend Web

```bash
npm run dev
```

→ ทำงานที่ `http://localhost:3000`

---

## 🔧 การแก้ปัญหาเบื้องต้น

### ปัญหา: "Login failed for user 'sa'"

**วิธีแก้:**

```bash
# 1. รีสตาร์ท container
docker restart azuresqledge

# 2. รอ 15 วินาที
sleep 15

# 3. ทดสอบ
node server/test_db_connection.js
```

### ปัญหา: Container หยุดทำงาน

**วิธีแก้:**

```bash
# Start container
docker start azuresqledge

# ตรวจสอบ logs หาสาเหตุ
docker logs azuresqledge --tail 50
```

### ปัญหา: ดูข้อมูลไม่ได้

**ตรวจสอบ:**

1. ✅ SQL Server ทำงานหรือไม่: `docker ps | grep azuresqledge`
2. ✅ Backend ทำงานหรือไม่: `lsof -i :3001`
3. ✅ Frontend ทำงานหรือไม่: `lsof -i :3000`

---

## 📝 ไฟล์เอกสารที่สร้างไว้

| ไฟล์                         | คำอธิบาย                                  |
| ---------------------------- | ----------------------------------------- |
| `DATABASE_INFO.md`           | ข้อมูลการเชื่อมต่อและวิธีใช้งาน Database  |
| `SQL_AUTH_FIX.md`            | วิธีแก้ปัญหา "Login failed for user 'sa'" |
| `DOCKER_AUTO_START.md`       | วิธีตั้งค่า Docker auto-start             |
| `MSSQL_GUIDE.md`             | คู่มือการใช้งาน MSSQL                     |
| `fix_sql_auth.sh`            | สคริปต์แก้ปัญหา authentication            |
| `test_db_connection.js`      | สคริปต์ทดสอบการเชื่อมต่อ                  |
| `TROUBLESHOOTING_SUMMARY.md` | เอกสารนี้ - สรุปทุกอย่าง                  |

---

## 🎯 Checklist การเริ่มใช้งาน

เมื่อเปิด Mac ใหม่ ให้ทำตามนี้:

- [ ] 1. เปิด **Docker Desktop**
- [ ] 2. รอ 10-20 วินาที (Container จะ start อัตโนมัติ)
- [ ] 3. ตรวจสอบ: `docker ps | grep azuresqledge`
- [ ] 4. เปิด Terminal 1: `cd server && node server.js`
- [ ] 5. เปิด Terminal 2: `npm run dev`
- [ ] 6. เข้าเว็บ: `http://localhost:3000`

---

## 🔐 Account สำหรับทดสอบ

### Admin Account

```
Email: admin@smartiot.com
Password: password123
```

---

## 📌 หมายเหตุสำคัญ

1. **SQL Server ต้องรอ 10-15 วินาที** หลัง start container ถึงจะพร้อมรับ connection
2. **Docker Desktop ต้องเปิดอยู่** containers ถึงจะทำงาน
3. **ต้องเปิด 2 Terminal** เสมอ: Backend (server.js) + Frontend (npm run dev)
4. **ข้อมูลจะไม่หาย** เพราะเก็บใน Docker volume
5. **Auto-start ตั้งค่าแล้ว** ไม่ต้อง start container ด้วยตนเอง

---

## 🆘 ติดปัญหา?

### ลำดับการแก้ปัญหา:

1. **ตรวจสอบ Docker**

   ```bash
   docker ps -a
   ```

2. **ดู Logs**

   ```bash
   docker logs azuresqledge --tail 50
   ```

3. **ทดสอบการเชื่อมต่อ**

   ```bash
   node server/test_db_connection.js
   ```

4. **Restart ทุกอย่าง**
   ```bash
   docker restart azuresqledge
   sleep 15
   # แล้ว restart Backend และ Frontend
   ```

---

## ✅ สรุป

ตอนนี้ระบบพร้อมใช้งานแล้ว:

- ✅ SQL Server ทำงานปกติ
- ✅ Auto-start ตั้งค่าแล้ว
- ✅ มีเอกสารครบถ้วน
- ✅ มีสคริปต์ช่วยแก้ปัญหา

**เปิด Mac ใหม่ → เปิด Docker Desktop → รอสักครู่ → ใช้งานได้เลย!** 🚀

---

_เอกสารนี้สร้างเมื่อ: 15 กุมภาพันธ์ 2569_  
_อัพเดทล่าสุด: 15 กุมภาพันธ์ 2569 เวลา 21:29 น._
