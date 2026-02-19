# 🔧 คำสั่งติดตั้ง SQL Server ใหม่ทั้งหมด

## ⚠️ เก็บไฟล์นี้ไว้! เผื่อต้องติดตั้งใหม่

---

## 📦 ติดตั้ง SQL Server Container ใหม่

### 1. ลบ Container เก่า (ถ้ามี)

```bash
# หยุด container
docker stop azuresqledge

# ลบ container
docker rm azuresqledge

# ลบ volume (ถ้าต้องการเริ่มต้นใหม่หมด - ข้อมูลจะหาย!)
docker volume rm azuresqledge_data
```

---

### 2. สร้าง SQL Server Container ใหม่

```bash
docker run -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" \
  -p 1433:1433 \
  --name azuresqledge \
  --restart unless-stopped \
  -v azuresqledge_data:/var/opt/mssql \
  -d mcr.microsoft.com/azure-sql-edge
```

**อธิบาย:**

- `ACCEPT_EULA=Y` - ยอมรับข้อตกลง
- `MSSQL_SA_PASSWORD=SmartIoT@2229!` - รหัสผ่าน sa
- `-p 1433:1433` - เปิด port 1433
- `--name azuresqledge` - ตั้งชื่อ container
- `--restart unless-stopped` - เริ่มอัตโนมัติ ✅
- `-v azuresqledge_data:/var/opt/mssql` - เก็บข้อมูลถาวร
- `-d` - รันเป็น background

---

### 3. รอให้ SQL Server พร้อม

```bash
# รอ 20 วินาที
sleep 20

# ตรวจสอบว่าทำงานหรือไม่
docker ps | grep azuresqledge

# ดู logs
docker logs azuresqledge --tail 30
```

---

### 4. ทดสอบการเชื่อมต่อ

```bash
# ใช้สคริปต์ทดสอบ
node server/test_db_connection.js
```

ควรเห็น:

```
✅ Connection Successful!
✅ Query Successful! User count: X
```

---

## 📦 ติดตั้ง SQL Server 2022 (Learning) - Port 1434

```bash
docker run -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" \
  -p 1434:1433 \
  --name SQL_Server_2022 \
  --restart unless-stopped \
  -v sql2022_data:/var/opt/mssql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

---

## 🔄 ตั้งค่า Auto-Start (ถ้าลืมใส่ตอนสร้าง)

```bash
# สำหรับ Project Database
docker update --restart unless-stopped azuresqledge

# สำหรับ Learning Database
docker update --restart unless-stopped SQL_Server_2022
```

---

## 📋 ตรวจสอบการติดตั้ง

### 1. ดูว่า Container ทำงานหรือไม่

```bash
docker ps
```

ควรเห็น:

```
CONTAINER ID   IMAGE                              STATUS         PORTS                    NAMES
xxxxxxxxxx     mcr.microsoft.com/azure-sql-edge   Up X seconds   0.0.0.0:1433->1433/tcp   azuresqledge
```

### 2. ตรวจสอบ Restart Policy

```bash
docker inspect azuresqledge | grep -A 3 "RestartPolicy"
```

ควรเห็น:

```json
"RestartPolicy": {
    "Name": "unless-stopped",
    "MaximumRetryCount": 0
}
```

### 3. ทดสอบเชื่อมต่อ

```bash
node server/test_db_connection.js
```

---

## 🗂️ ข้อมูลการเชื่อมต่อ

### Project Database (Port 1433)

```
Server: localhost
Port: 1433
Username: sa
Password: SmartIoT@2229!
Database: SmartIoTDB
Trust Server Certificate: Yes
```

### Learning Database (Port 1434)

```
Server: localhost
Port: 1434
Username: sa
Password: SmartIoT@2229!
Database: master
Trust Server Certificate: Yes
```

---

## 🔐 ข้อมูล Environment Variables (.env)

```env
DB_USER=sa
DB_PASSWORD=SmartIoT@2229!
DB_HOST=localhost
DB_NAME=SmartIoTDB
DB_PORT=1433
JWT_SECRET=super-secret-key-123
```

---

## 📦 คำสั่งจัดการ Docker Volume

### ดู Volumes ทั้งหมด

```bash
docker volume ls
```

### ดูข้อมูล Volume

```bash
docker volume inspect azuresqledge_data
```

### สำรองข้อมูล (Backup)

```bash
# สำรอง volume เป็น tar file
docker run --rm \
  -v azuresqledge_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/azuresqledge_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### กลับคืนข้อมูล (Restore)

```bash
# กลับคืนจาก tar file
docker run --rm \
  -v azuresqledge_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/azuresqledge_backup_YYYYMMDD.tar.gz -C /data
```

---

## 🚨 คำสั่งฉุกเฉิน

### ลบทุกอย่างและเริ่มใหม่หมด

```bash
# ⚠️ คำเตือน: ข้อมูลทั้งหมดจะหาย!

# 1. หยุดและลบ containers
docker stop azuresqledge SQL_Server_2022
docker rm azuresqledge SQL_Server_2022

# 2. ลบ volumes (ข้อมูลจะหาย!)
docker volume rm azuresqledge_data sql2022_data

# 3. สร้างใหม่
docker run -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" \
  -p 1433:1433 \
  --name azuresqledge \
  --restart unless-stopped \
  -v azuresqledge_data:/var/opt/mssql \
  -d mcr.microsoft.com/azure-sql-edge

# 4. รอ 20 วินาที
sleep 20

# 5. ทดสอบ
node server/test_db_connection.js
```

---

## 📝 คำสั่งที่ใช้บ่อย

```bash
# ดูสถานะ containers
docker ps

# ดูทุก containers (รวมที่หยุด)
docker ps -a

# Start container
docker start azuresqledge

# Stop container
docker stop azuresqledge

# Restart container
docker restart azuresqledge

# ดู logs
docker logs azuresqledge --tail 50

# ดู logs แบบ real-time
docker logs -f azuresqledge

# เข้าไปใน container
docker exec -it azuresqledge /bin/bash

# ดูการใช้ resources
docker stats azuresqledge
```

---

## 🎯 Checklist หลังติดตั้งใหม่

- [ ] 1. Container ทำงานหรือไม่: `docker ps`
- [ ] 2. Restart policy ตั้งค่าแล้วหรือไม่: `docker inspect azuresqledge | grep RestartPolicy`
- [ ] 3. เชื่อมต่อได้หรือไม่: `node server/test_db_connection.js`
- [ ] 4. Database tables สร้างแล้วหรือไม่: ดูใน Azure Data Studio
- [ ] 5. Admin account มีหรือไม่: ลอง login ที่ web

---

## 💾 สำรองข้อมูลก่อนลบ Container

```bash
# 1. Export database เป็น SQL file (ผ่าน Azure Data Studio)
# หรือใช้คำสั่ง:

docker exec -it azuresqledge /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "SmartIoT@2229!" -C \
  -Q "BACKUP DATABASE SmartIoTDB TO DISK = '/var/opt/mssql/backup/SmartIoTDB.bak'"

# 2. Copy backup file ออกมา
docker cp azuresqledge:/var/opt/mssql/backup/SmartIoTDB.bak ./SmartIoTDB_backup.bak
```

---

## 📌 หมายเหตุสำคัญ

1. **Password ต้องเป็น:** `SmartIoT@2229!` (ตรงกับ .env)
2. **Port ต้องเป็น:** `1433` (Project) และ `1434` (Learning)
3. **Restart policy:** `unless-stopped` (เริ่มอัตโนมัติ)
4. **Volume:** ใช้ named volume เพื่อเก็บข้อมูลถาวร
5. **รอ 15-20 วินาที** หลังสร้าง container ใหม่

---

## ✅ คำสั่งสำเร็จรูป - Copy & Paste ได้เลย!

### สร้าง Project Database (Port 1433)

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" -p 1433:1433 --name azuresqledge --restart unless-stopped -v azuresqledge_data:/var/opt/mssql -d mcr.microsoft.com/azure-sql-edge && sleep 20 && docker ps | grep azuresqledge
```

### สร้าง Learning Database (Port 1434)

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" -p 1434:1433 --name SQL_Server_2022 --restart unless-stopped -v sql2022_data:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest && sleep 20 && docker ps | grep SQL_Server_2022
```

---

_เก็บไฟล์นี้ไว้ดีๆ นะครับ! 🔐_  
_อัพเดทล่าสุด: 15 กุมภาพันธ์ 2569 เวลา 21:31 น._
