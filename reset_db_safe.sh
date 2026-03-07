#!/bin/bash
# สคริปต์กู้ชีพ SQL Server (เปลี่ยนรหัสผ่านโดยไม่ลบข้อมูล)

echo "1. Stopping current SQL Server..."
docker stop SQL_Server_Docker

echo "2. Backing up data to image 'sql_backup_auto'..."
docker commit SQL_Server_Docker sql_backup_auto

echo "3. Removing old container..."
docker rm SQL_Server_Docker

echo "4. Strating NEW SQL Server with password 'Admin@2026'..."
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=Admin@2026' \
   -p 1433:1433 --name SQL_Server_Docker \
   -d sql_backup_auto

echo "--- DONE! ---"
echo "New Password is: Admin@2026"
