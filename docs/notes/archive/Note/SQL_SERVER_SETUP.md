# 📘 SQL Server Setup Guide (Final Version)

## 🐳 Docker Containers

ตอนนี้มี SQL Server **2 ตัว** รันอยู่พร้อมกัน:

### 1️⃣ **azuresqledge** (สำหรับโปรเจกต์)

- **Image**: `mcr.microsoft.com/azure-sql-edge`
- **Port**: `1433`
- **Username**: `sa`
- **Password**: `SmartIoT@2229!`
- **Database**: `SmartIoTDB`
- **วัตถุประสงค์**: ใช้กับ Smart IoT Web Application
- **คุณสมบัติ**: รันเร็วบน Mac M-series, เสถียร, ฟีเจอร์ครบสำหรับ Development

### 2️⃣ **SQL_Server_2022** (สำหรับเรียน)

- **Image**: `mcr.microsoft.com/mssql/server:2022-latest`
- **Port**: `1434`
- **Username**: `sa`
- **Password**: `P@ssw0rd141047!`
- **Database**: `master` (default)
- **วัตถุประสงค์**: ใช้สำหรับการเรียนรู้ SQL Server แบบเต็มรูปแบบ
- **คุณสมบัติ**: SQL Server ฟีเจอร์ครบ (อาจรันช้าบน Mac M-series)

---

## 🔌 การเชื่อมต่อ

### สำหรับโปรเจกต์ (Port 1433)

```
Server: localhost
Port: 1433
User: sa
Password: SmartIoT@2229!
Database: SmartIoTDB
Trust server certificate: True
```

### สำหรับเรียน (Port 1434)

```
Server: localhost,1434
Port: 1434
User: sa
Password: P@ssw0rd141047!
Database: master
Trust server certificate: True
Encrypt: Optional
```

**⚠️ สำคัญ:** สำหรับ Port 1434 ให้ใส่ **`,1434`** ต่อท้าย localhost (เครื่องหมายลูกน้ำ)

---

## 💻 คำสั่งที่ใช้บ่อย

### ดู Container ที่กำลังทำงาน

```bash
docker ps
```

### หยุด/เริ่ม Container

```bash
docker stop azuresqledge
docker stop SQL_Server_2022

docker start azuresqledge
docker start SQL_Server_2022
```

---

## 📂 ไฟล์สำคัญในโปรเจกต์

### `server/.env`

ไฟล์นี้เก็บค่า Configuration ของโปรเจกต์:

```env
DB_USER=sa
DB_PASSWORD=SmartIoT@2229!
DB_HOST=localhost
DB_NAME=SmartIoTDB
DB_PORT=1433
JWT_SECRET=super-secret-key-123
```

---

**อัปเดตล่าสุด:** 15 กุมภาพันธ์ 2026
