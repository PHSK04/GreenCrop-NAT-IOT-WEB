# 🔧 SQL Server Authentication Issue - แก้ไขปัญหา "Login failed for user 'sa'"

## 🔍 ปัญหาที่พบ

เมื่อพยายามเชื่อมต่อกับ SQL Server จาก GUI tools (เช่น Azure Data Studio, SQL Server Management Studio) จะพบข้อผิดพลาด:

```
Connection error
Login failed for user 'sa'.
```

แต่การเชื่อมต่อจาก Node.js application ทำงานได้ปกติ

## 🎯 สาเหตุ

ปัญหานี้เกิดจาก:

1. **SQL Server ยังไม่พร้อมรับการเชื่อมต่อ** - หลังจาก start container SQL Server ต้องใช้เวลาประมาณ 10-15 วินาทีในการ initialize
2. **Authentication mode ไม่ถูกต้อง** - บางครั้ง SQL Server อาจไม่ enable SQL Authentication mode
3. **Container restart** - หลังจาก restart container อาจต้องรอให้ SQL Server พร้อมใช้งาน

## ✅ วิธีแก้ไข

### วิธีที่ 1: รีสตาร์ท Container (แนะนำ)

```bash
# รีสตาร์ท SQL Server container
docker restart azuresqledge

# รอ 15 วินาที
sleep 15

# ทดสอบการเชื่อมต่อ
node server/test_db_connection.js
```

### วิธีที่ 2: ใช้สคริปต์อัตโนมัติ

```bash
./fix_sql_auth.sh
```

### วิธีที่ 3: ตรวจสอบและแก้ไขด้วยตนเอง

1. **ตรวจสอบว่า container ทำงานอยู่**

   ```bash
   docker ps | grep azuresqledge
   ```

2. **ตรวจสอบ logs**

   ```bash
   docker logs azuresqledge --tail 50
   ```

3. **รอให้ SQL Server พร้อม** - มองหา log message:

   ```
   SQL Server is now ready for client connections
   ```

4. **ทดสอบการเชื่อมต่อ**
   ```bash
   node server/test_db_connection.js
   ```

## 📝 ข้อมูลการเชื่อมต่อ

```
Server: localhost
Port: 1433
User: sa
Password: SmartIoT@2229!
Database: SmartIoTDB
```

## 🔐 การตั้งค่า Authentication

SQL Server container ถูกตั้งค่าให้ใช้:

- **SQL Server Authentication** (Mixed Mode)
- **Trust Server Certificate**: Yes
- **Encrypt**: Yes

## 🚨 หมายเหตุสำคัญ

1. **รอให้ SQL Server พร้อม** - หลัง start/restart container ต้องรอ 10-15 วินาที
2. **ตรวจสอบ password** - ต้องตรงกับที่ตั้งไว้ใน `.env` file
3. **Port conflict** - ตรวจสอบว่า port 1433 ไม่ถูกใช้งานโดยโปรแกรมอื่น

## 🔄 การแก้ปัญหาเพิ่มเติม

หากยังพบปัญหา ให้ลองขั้นตอนต่อไปนี้:

### 1. ลบและสร้าง Container ใหม่

```bash
# หยุดและลบ container เก่า
docker stop azuresqledge
docker rm azuresqledge

# สร้าง container ใหม่
docker run -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=SmartIoT@2229!" \
  -p 1433:1433 \
  --name azuresqledge \
  -d mcr.microsoft.com/azure-sql-edge

# รอ 20 วินาที
sleep 20

# ทดสอบ
node server/test_db_connection.js
```

### 2. ตรวจสอบ Environment Variables

```bash
# ตรวจสอบว่า container มี environment variables ถูกต้อง
docker inspect azuresqledge | grep -A 10 "Env"
```

### 3. เข้าไปใน Container เพื่อตรวจสอบ

```bash
# เข้าไปใน container
docker exec -it azuresqledge /bin/bash

# ตรวจสอบ SQL Server process
ps aux | grep sqlservr
```

## 📊 การทดสอบ

หลังจากแก้ไขแล้ว ให้ทดสอบด้วย:

1. **Node.js Test Script**

   ```bash
   node server/test_db_connection.js
   ```

   ควรเห็น:

   ```
   ✅ Connection Successful!
   ✅ Query Successful! User count: 1
   ```

2. **GUI Tool** (Azure Data Studio / SSMS)
   - Server: `localhost`
   - Authentication: SQL Login
   - Username: `sa`
   - Password: `SmartIoT@2229!`
   - Trust server certificate: Yes

## 🎉 สรุป

ปัญหา "Login failed for user 'sa'" มักเกิดจาก SQL Server ยังไม่พร้อมรับการเชื่อมต่อหลัง start/restart container

**วิธีแก้ไขง่ายที่สุด:**

```bash
docker restart azuresqledge && sleep 15 && node server/test_db_connection.js
```

หากยังพบปัญหา ให้ตรวจสอบ:

- Container logs: `docker logs azuresqledge`
- Port availability: `lsof -i :1433`
- Password correctness: ตรวจสอบใน `.env` file
