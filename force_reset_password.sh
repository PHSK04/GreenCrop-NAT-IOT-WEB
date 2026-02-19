#!/bin/bash
echo "1. Stopping SQL Server..."
# Ignore errors if container doesn't exist
docker stop SQL_Server_Docker >/dev/null 2>&1
docker rm -f sql_temp_fixer >/dev/null 2>&1
docker rm -f sql_fixed_final >/dev/null 2>&1

echo "2. Starting in maintenance mode (using image sql_backup_auto)..."
# Start container with 'sleep' so SQL Server doesn't start automatically
docker run -d --name sql_temp_fixer sql_backup_auto sleep 3600

echo "3. Forcing password reset to 'Admin@2026'..."
# Send new password to mssql-conf tool twice (once for input, once for confirm)
# Using printf to simulate typing
docker exec -u root sql_temp_fixer bash -c "printf 'Admin@2026\nAdmin@2026\n' | /opt/mssql/bin/mssql-conf set-sa-password"

echo "4. Saving changes..."
docker stop sql_temp_fixer
docker commit sql_temp_fixer sql_fixed_final

echo "5. Cleaning up old containers..."
docker rm -f sql_temp_fixer
docker rm -f SQL_Server_Docker

echo "6. Starting Final SQL Server..."
docker run -e 'ACCEPT_EULA=Y' -p 1433:1433 --name SQL_Server_Docker -d sql_fixed_final

echo "--- SUCCESS! ---"
echo "Your password has been FORCE RESET to: Admin@2026"
