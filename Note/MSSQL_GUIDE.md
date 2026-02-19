# คู่มือการติดตั้งและใช้งานระบบ Smart IoT Web (SQL Server Edition)

เอกสารนี้รวบรวมขั้นตอนตั้งแต่เริ่มต้น (Zero to Hero) สำหรับการติดตั้งและรันโปรเจกต์ที่เชื่อมต่อกับ **Microsoft SQL Server**

---

## 1. การเตรียมเครื่อง (Prerequisites)

ก่อนเริ่มใช้งาน คุณต้องมีโปรแกรมเหล่านี้ในเครื่อง:

1.  **Node.js**: (รุ่น 18 หรือใหม่กว่า) - [ดาวน์โหลด](https://nodejs.org/)
2.  **Docker Desktop**: จำเป็นสำหรับรัน SQL Server บน Mac - [ดาวน์โหลด Docker for Mac](https://www.docker.com/products/docker-desktop/)

---

## 2. ขั้นตอนการติดตั้ง (Installation)

### 2.1 ติดตั้งและรัน Microsoft SQL Server (ผ่าน Docker)

เนื่องจาก Mac ไม่สามารถลง SQL Server แบบ Native ได้ เราต้องใช้ Docker ครับ

1.  เปิดโปรแกรม **Docker Desktop** รอจนมันขึ้น status ว่า running (สีเขียว)
2.  เปิด **Terminal** แล้วรันคำสั่งนี้เพื่อดาวน์โหลดและเริ่ม SQL Server:

    ```bash
    docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourPassword!123" \
       -p 1433:1433 --name sql_server \
       -d mcr.microsoft.com/mssql/server:2022-latest
    ```

    > **สำคัญมาก:**
    >
    > - `YourPassword!123` คือรหัสผ่านของ `sa` (admin สูงสุด) **ต้องตั้งให้ยาก** (มีตัวเล็ก, ตัวใหญ่, ตัวเลข, สัญลักษณ์) ไม่งั้นมันจะไม่รัน
    > - ถ้าคุณเปลี่ยนรหัสตรงนี้ ต้องไปแก้ในไฟล์ `.env` ด้วย

3.  ตรวจสอบว่า SQL Server รันอยู่หรือไม่ พิมพ์คำสั่ง:
    ```bash
    docker ps
    ```
    _ถ้าเห็นชื่อ `sql_server` ในรายการ แปลว่าพร้อมใช้งาน!_

---

### 2.2 ติดตั้งโปรกเจต์ (Project Setup)

เปิด Terminal แล้วทำตามขั้นตอนนี้:

1.  **ติดตั้ง Backend (Server):**

    ```bash
    cd "/Users/phsk/Documents/PROJECT ETE/Smart Iot Web/Smart iot 293764 Experimental/server"
    npm install
    # ติดตั้ง Library เชื่อมต่อ SQL Server เพิ่มเติม (ถ้ายังไม่มี)
    npm install mssql dotenv cors express bcrypt body-parser
    ```

    > **💡 คำสั่งนี้คืออะไร?**
    >
    > - `npm install`: เป็นการบอกให้ Node.js ไปดาวน์โหลดเครื่องมือเสริมมาใส่ในโปรเจกต์
    > - `mssql`: คือ **"ล่าม"** ที่ช่วยให้โปรแกรม Node.js ของเราพูดคุยภาษาเดียวกับ SQL Server ได้
    > - `dotenv`: คือ **"ตู้เซฟ"** ที่ช่วยโหลดค่ารหัสผ่านลับๆ จากไฟล์ `.env` มาใช้งาน โดยไม่ต้องเขียนแปะไว้ในโค้ดตรงๆ (เพื่อความปลอดภัย)

2.  **ติดตั้ง Frontend (Web):**
    ```bash
    # ถอยออกมาที่โฟลเดอร์หลัก
    cd ..
    npm install
    ```

---

## 3. การตั้งค่าการเชื่อมต่อ (Configuration)

แก้ไขไฟล์ `server/.env` เพื่อให้โปรแกรมรู้ว่าจะคุยกับ Database ตัวไหน:

**ไฟล์: `/server/.env`**

```env
DB_USER=sa
DB_PASSWORD=YourPassword!123
DB_SERVER=localhost
DB_DATABASE=SmartIoTDB
```

- **DB_PASSWORD**: ต้องตรงกับที่คุณตั้งตอน `docker run`
- **DB_SERVER**: ถ้าใช้ Docker บนเครื่องตัวเองใช้ `localhost` ได้เลย

---

## 4. เริ่มต้นใช้งาน (Running)

เราต้องรัน 2 หน้าต่างพร้อมกัน (เปิด Terminal 2 Tabs):

**Tab 1: รัน Backend API (Port 3001)**

```bash
cd server
npm run dev
```

_รอจนขึ้น: `Connected to Microsoft SQL Server` และ `Default admin account created.`_

**Tab 2: รัน Frontend Web (Port 3000)**

```bash
# อยู่ที่ Root Folder
npm run dev
```

_เข้าใช้งานได้ที่: `http://localhost:3000`_

---

## 5. ข้อมูลสำหรับเข้าใช้งาน (Default Login)

เมื่อรันครั้งแรก ระบบจะสร้าง Admin ให้โดยอัตโนมัติ:

- **Email:** `admin@smartiot.com`
- **Password:** `password123`

---

## 6. การแก้ปัญหาที่พบบ่อย (Troubleshooting)

- **Error: `Login failed for user 'sa'`**
  -> เช็ค `DB_PASSWORD` ในไฟล์ `.env` ว่าตรงกับ Docker ไหม

- **Error: `ClientNetworkError: Connection failed`**
  -> Docker รันอยู่ไหม? เช็คด้วยคำสั่ง `docker ps`
  -> ถ้าไม่รัน ให้ start docker container ใหม่: `docker start sql_server`

- **Error: `EADDRINUSE :::3001`**
  -> Port 3001 ไม่ว่าง (มี Server เก่าค้าง)
  -> พิมพ์ `lsof -i :3001` แล้วเอาเลข PID มา `kill -9 <PID>`
