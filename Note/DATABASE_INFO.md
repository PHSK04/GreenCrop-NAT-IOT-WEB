# Database System - Microsoft SQL Server (MSSQL)

โปรเจคนี้ใช้ **Microsoft SQL Server** (Azure SQL Edge) เป็นฐานข้อมูล

## 📊 ข้อมูลการเชื่อมต่อ

### สำหรับ GUI Tools (Azure Data Studio / SSMS)

```
Server: localhost
Port: 1433 (default - ไม่ต้องระบุ)
Authentication: SQL Login
Username: sa
Password: SmartIoT@2229!
Database: SmartIoTDB
Trust Server Certificate: Yes
```

### สำหรับ Application (.env file)

```
DB_USER=sa
DB_PASSWORD=SmartIoT@2229!
DB_HOST=localhost
DB_NAME=SmartIoTDB
DB_PORT=1433
```

## 🐳 Docker Container

SQL Server ทำงานใน Docker container:

- **Container Name:** `azuresqledge`
- **Image:** `mcr.microsoft.com/azure-sql-edge`
- **Port:** `1433:1433`

### ตรวจสอบสถานะ Container

```bash
docker ps | grep azuresqledge
```

### รีสตาร์ท Container (หากมีปัญหา)

```bash
docker restart azuresqledge
sleep 15  # รอให้ SQL Server พร้อม
```

## 🔧 การแก้ปัญหา

หากพบข้อผิดพลาด "Login failed for user 'sa'":

1. รีสตาร์ท container: `docker restart azuresqledge`
2. รอ 15 วินาที
3. ลองเชื่อมต่อใหม่

ดูรายละเอียดเพิ่มเติมใน: `SQL_AUTH_FIX.md`

## 📝 วิธีดูข้อมูล

### 1. ผ่าน GUI Tool (แนะนำ)

- ใช้ **Azure Data Studio** หรือ **SQL Server Management Studio**
- เชื่อมต่อด้วยข้อมูลด้านบน
- เลือก database `SmartIoTDB`
- ดูตาราง: `users`, `audit_logs`, `sensor_data`, `otp_codes`

### 2. ผ่าน Admin Panel

- Login เป็น Admin
- ไปที่ **User Management**
- ดูข้อมูล users ทั้งหมด

## 🚀 การรันระบบ

ต้องเปิด **2 Terminal** เสมอ:

### Terminal ที่ 1 - Frontend

```bash
npm run dev
```

→ เข้าเว็บได้ที่ `http://localhost:5173`

### Terminal ที่ 2 - Backend

```bash
cd server
node server.js
```

→ API Server ทำงานที่ `http://localhost:3001`

## ✅ ทดสอบการเชื่อมต่อ

```bash
node server/test_db_connection.js
```

ควรเห็น:

```
✅ Connection Successful!
✅ Query Successful! User count: X
```
