# วิธีเชื่อมต่อ Azure Data Studio กับ PostgreSQL

## ขั้นตอนการเชื่อมต่อ:

1. **เปิด Azure Data Studio**

2. **คลิก "New Connection"** (หรือกด Ctrl+N / Cmd+N)

3. **เลือก Connection Type:**
   - เลือก **PostgreSQL** จาก dropdown

4. **กรอกข้อมูลการเชื่อมต่อ:**

   ```
   Server:   localhost
   Port:     5432
   Database: SmartIoTDB
   User:     phsk
   Password: (เว้นว่าง - กด Enter)
   ```

5. **คลิก "Connect"**

## ตรวจสอบข้อมูล:

หลังจากเชื่อมต่อสำเร็จ คุณจะเห็น:

- Database: `SmartIoTDB`
- Tables:
  - `users` - ข้อมูลผู้ใช้ทั้งหมด
  - `audit_logs` - ประวัติการใช้งาน

## Query ตัวอย่าง:

```sql
-- ดูผู้ใช้ทั้งหมด
SELECT * FROM users;

-- ดูเฉพาะ Admin
SELECT * FROM users WHERE role = 'admin';

-- ดูข้อมูลโปรไฟล์
SELECT name, email, location, bio, title FROM users;
```

## หมายเหตุ:

- PostgreSQL รันอยู่บนเครื่องของคุณ (localhost)
- ไม่ต้องใช้รหัสผ่านสำหรับ local connection
- ข้อมูลจะถาวรและไม่หายแม้ปิดเครื่อง
