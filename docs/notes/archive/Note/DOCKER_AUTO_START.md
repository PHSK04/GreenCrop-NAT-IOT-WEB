# 🐳 Docker Auto-Start Configuration

## ✅ การตั้งค่าเสร็จสิ้น

ตอนนี้ SQL Server containers ถูกตั้งค่าให้ **เริ่มทำงานอัตโนมัติ** แล้ว!

## 📦 แนวทางตอนติดตั้ง (ครั้งแรก)

ใช้แนวทางนี้เพื่อลดปัญหา EULA/พอร์ตชนตั้งแต่เริ่มติดตั้ง:

1. ตรวจสอบว่าพอร์ตยังว่างก่อนสร้าง container

```bash
lsof -nP -iTCP:1433 -sTCP:LISTEN
lsof -nP -iTCP:1434 -sTCP:LISTEN
```

2. สร้าง container หลักของโปรเจค (Azure SQL Edge)

```bash
docker run -d \
  --name azuresqledge \
  -e ACCEPT_EULA=1 \
  -e MSSQL_SA_PASSWORD='SmartIoT@2229!' \
  -e MSSQL_PID=Developer \
  -p 1433:1433 \
  --restart unless-stopped \
  mcr.microsoft.com/azure-sql-edge
```

3. (ถ้าจำเป็น) สร้าง SQL Server ตัวรองสำหรับเรียนรู้/ทดสอบ แยกพอร์ตเป็น `1434`

```bash
docker run -d \
  --name SQL_Server_2022 \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='SmartIoT@2229!' \
  -p 1434:1433 \
  --restart unless-stopped \
  mcr.microsoft.com/mssql/server:2022-latest
```

4. ตรวจสอบสถานะหลังติดตั้ง

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

5. ทดสอบการเชื่อมต่อจากโปรเจค

```bash
node server/test_db_connection.js
```

ควรเห็น `Connection Successful` และ `Query Successful`

### Containers ที่ตั้งค่าแล้ว:

- ✅ **azuresqledge** (Project Database - Port 1433)
- ✅ **SQL_Server_2022** (Learning Database - Port 1434)

## 🎯 ประโยชน์

### ก่อนตั้งค่า:

❌ เปิด Mac ใหม่ → Container หยุด → ต้อง start ด้วยตนเอง  
❌ Docker Desktop restart → Container หยุด → ต้อง start ด้วยตนเอง  
❌ Container crash → ต้อง start ด้วยตนเอง

### หลังตั้งค่า:

✅ เปิด Mac ใหม่ → Container **เริ่มอัตโนมัติ**  
✅ Docker Desktop restart → Container **เริ่มอัตโนมัติ**  
✅ Container crash → Container **restart อัตโนมัติ**

## 📋 คำสั่งที่ใช้

```bash
# ตั้งค่า auto-start สำหรับ container
docker update --restart unless-stopped azuresqledge
docker update --restart unless-stopped SQL_Server_2022
```

## 🔍 ตรวจสอบการตั้งค่า

```bash
# ดู restart policy ของ container
docker inspect azuresqledge | grep -A 3 "RestartPolicy"
```

ควรเห็น:

```json
"RestartPolicy": {
    "Name": "unless-stopped",
    "MaximumRetryCount": 0
}
```

## 📚 Restart Policy Options

Docker มี restart policy หลายแบบ:

| Policy           | คำอธิบาย                           |
| ---------------- | ---------------------------------- |
| `no`             | ไม่ restart อัตโนมัติ (default)    |
| `on-failure`     | restart เฉพาะตอน error             |
| `always`         | restart เสมอ แม้ manual stop       |
| `unless-stopped` | restart เสมอ ยกเว้น manual stop ✅ |

**เราใช้ `unless-stopped`** เพราะ:

- ✅ Auto-start เมื่อ Docker Desktop เริ่มทำงาน
- ✅ Auto-restart เมื่อ crash
- ✅ ไม่ restart ถ้าเรา stop ด้วยตนเอง

## 🚀 การใช้งาน

### เมื่อเปิด Mac ใหม่:

1. เปิด **Docker Desktop**
2. รอ 10-20 วินาที
3. ✅ SQL Server containers จะเริ่มทำงานอัตโนมัติ
4. เริ่มใช้งาน Backend และ Frontend ได้เลย

### ตรวจสอบว่า containers ทำงานหรือไม่:

```bash
docker ps
```

ควรเห็น:

```
CONTAINER ID   IMAGE                              STATUS         PORTS                    NAMES
b57ac7ddd6c0   mcr.microsoft.com/azure-sql-edge   Up X minutes   0.0.0.0:1433->1433/tcp   azuresqledge
8289e38d55a8   mcr.microsoft.com/mssql/server     Up X minutes   0.0.0.0:1434->1433/tcp   SQL_Server_2022
```

### หาก container ไม่ทำงาน:

```bash
# Start ด้วยตนเอง
docker start azuresqledge

# หรือ restart
docker restart azuresqledge
```

## 🛑 วิธีหยุด Container ชั่วคราว

หากต้องการหยุด container ชั่วคราว:

```bash
docker stop azuresqledge
```

Container จะ**ไม่ restart อัตโนมัติ** จนกว่าคุณจะ:

- Start ด้วยตนเอง: `docker start azuresqledge`
- หรือ Restart Docker Desktop

## 🔄 วิธียกเลิก Auto-Start

หากต้องการยกเลิก auto-start:

```bash
docker update --restart no azuresqledge
```

## 📝 สรุป

✅ **ตั้งค่าเสร็จแล้ว** - SQL Server containers จะเริ่มอัตโนมัติทุกครั้ง  
✅ **ไม่ต้องกังวล** - ไม่ต้อง start container ด้วยตนเอง  
✅ **ประหยัดเวลา** - เปิด Mac แล้วใช้งานได้เลย

---

**หมายเหตุ:** Docker Desktop ต้องเปิดอยู่เสมอ containers ถึงจะทำงาน  
ถ้า Docker Desktop ปิด → containers จะไม่ทำงาน

## 🛠️ บันทึกการแก้ไขล่าสุด (February 19, 2026)

### อาการที่พบ

- `docker ps -a` พบว่า container หลักหยุดทำงาน (`azuresqledge`, `SQL_Server_2022`)
- มี container เก่าที่ไม่ผ่าน EULA (`gifted_visvesvaraya` → `Exited (1)`)
- มี container ซ้ำที่ชนพอร์ต `1433` (`SQL_Server_Docker` → `Created` พร้อม error `port is already allocated`)

### สาเหตุหลัก

1. มีหลาย SQL containers ในเครื่องพร้อมกัน ทำให้พอร์ตชนกัน
2. มี container เก่าที่ตั้งค่าไม่ครบ (EULA) ปะปนในระบบ
3. หลัง Docker restart, service หลักยังไม่ถูก start ขึ้นมาใช้งานทันที

### วิธีแก้ที่ทำแล้ว

```bash
# Start ตัวหลักของโปรเจค
docker start azuresqledge
docker start SQL_Server_2022

# ตรวจสอบสถานะ
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# ทดสอบว่า backend ต่อ DB ได้จริง
node server/test_db_connection.js
```

ผลทดสอบล่าสุด:

- `azuresqledge` = Up (`0.0.0.0:1433->1433/tcp`)
- `SQL_Server_2022` = Up (`0.0.0.0:1434->1433/tcp`)
- DB test ผ่าน (`Connection Successful`)

### ข้อแนะนำป้องกันปัญหาซ้ำ

- ใช้ `azuresqledge` เป็น DB หลักของโปรเจค (port `1433`) เพียงตัวเดียวสำหรับงานจริง
- ไม่ควรสร้าง container ใหม่ด้วยพอร์ต `1433` ซ้ำ
- ตรวจสอบก่อนทุกครั้งด้วย `docker ps -a`
- ถ้าไม่ใช้ container เก่าแล้ว ควรลบออกเพื่อลดความสับสน
