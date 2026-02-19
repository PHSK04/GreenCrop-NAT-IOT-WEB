# Smart IoT Backend - End-to-End Setup & Testing Guide

This guide walks you through setting up the entire system and testing it end-to-end.

## Prerequisites
- Node.js >= 16
- npm
- MSSQL Server running and accessible at `DB_HOST:DB_PORT` (default: `localhost:1433`)
- (optional) `mosquitto_pub` for MQTT testing or Postman for HTTP testing

## Step 1: Verify `.env` Configuration

Check that `server/.env` has your MSSQL credentials:

```
DB_HOST=localhost          # Your MSSQL server address
DB_PORT=1433               # MSSQL port
DB_USER=sa                 # SQL Server admin user
DB_PASSWORD=SmartIoT@2229! # Your SA password
DB_NAME=SmartIoTDB         # Database name
JWT_SECRET=super-secret-key-123
NODE_ENV=development
ENABLE_DEV_TOKEN=true      # Enables /api/test-token for testing
```

**Warning:** In production, change `JWT_SECRET` to a cryptographically secure value and set `NODE_ENV=production`.

## Step 2: Install Dependencies & Run Migrations

From the `server` directory:

```bash
cd server
npm install
npm run migrate
```

This will:
1. Connect to your MSSQL server
2. Create/update all tables (users, sensor_data, audit_logs, etc.)
3. Add tenant_id, device_id, sensor_id, msg_id, raw_payload columns
4. Create unique constraints and indexes

## Step 3: Start the Backend Server

```bash
npm run dev
```

You should see:
```
✅ Connected to MSSQL Database
✅ Users table ready
✅ Sensor Data table ready
... (other tables)
[MQTT] Connecting to mqtt://broker.hivemq.com:1883...
[MQTT] Connected to Broker
[MQTT] Subscribed to smartfarm/sensors and tenants/+/devices/+/sensors
Server is running on http://localhost:3001
```

## Step 4: Create a Test JWT Token

To test protected endpoints, you need a JWT token containing `tenant_id`. Use the test endpoint:

```bash
curl -X POST http://localhost:3001/api/test-token \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"farm-001","user_id":"user-1","email":"user@farm.com"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Save this token as `TOKEN` for the next steps.

## Step 5: Test HTTP API - Sensor Data Insert

```bash
TOKEN="<paste-token-from-step-4>"

curl -X POST http://localhost:3001/api/sensor-data \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "dev-1",
    "sensor_id": "sensor-temp-01",
    "pressure": 1.013,
    "flow_rate": 2.5,
    "ec_value": 0.8,
    "pumps": [1, 0, 1],
    "active_tank": 1,
    "is_on": true
  }'
```

Response (success):
```json
{
  "ok": true,
  "id": 1
}
```

## Step 6: Test HTTP API - Get Sensor Data

```bash
curl -X GET http://localhost:3001/api/sensor-data \
  -H "Authorization: Bearer $TOKEN"
```

Should return the data you just inserted.

## Step 7: Test MQTT Ingestion

Publish a test message to the MQTT broker (using tenant-based topic):

```bash
mosquitto_pub -h broker.hivemq.com -t tenants/farm-001/devices/dev-2/sensors -m '{
  "device_id":"dev-2",
  "sensor_id":"sensor-moisture-01",
  "ts":"2026-02-15T12:00:00Z",
  "pressure":1.010,
  "flow":2.3,
  "ec":0.75,
  "msg_id":"msg-001"
}'
```

Check the server console for:
```
[MQTT] Received data on tenants/farm-001/devices/dev-2/sensors: {...}
[DB] Saved sensor data for tenant=farm-001 device=dev-2 msg_id=msg-001
```

Then verify the data was inserted:

```bash
curl -X GET http://localhost:3001/api/sensor-data \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {device_id, tenant_id, timestamp, raw_payload}'
```

## Step 8: Test Multi-Tenant Isolation

Create a token for a different tenant:

```bash
curl -X POST http://localhost:3001/api/test-token \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"farm-002","user_id":"user-2","email":"user2@farm.com"}'
```

Insert data for the new tenant and verify that each tenant only sees its own data via the API.

## Common Issues & Debugging

- **"Connection refused" at localhost:1433** — Ensure MSSQL is running. On macOS with Docker: `docker ps | grep mssql`
- **"Login failed"** — Check DB_USER, DB_PASSWORD in `.env`
- **MQTT not connecting** — The public broker (broker.hivemq.com) is used by default. Check your network.
- **Migration errors** — Check server logs for SQL syntax errors. Ensure MSSQL version supports the features used.

## Next Steps (Production)

1. Set `NODE_ENV=production` in `.env`
2. Set `ENABLE_DEV_TOKEN=false` (remove test endpoint)
3. Use a strong `JWT_SECRET` (e.g., `openssl rand -base64 32`)
4. Set up a self-hosted or managed MQTT broker with authentication/TLS
5. Configure automated MSSQL backups
6. Use a process manager (pm2, systemd) to keep the server running
7. Deploy the Flutter app to connect to this API

## Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST   | /api/register | No | Register user |
| POST   | /api/login | No | User login |
| POST   | /api/test-token | No* | Generate JWT for testing (*dev only) |
| POST   | /api/sensor-data | Yes | Insert sensor reading |
| GET    | /api/sensor-data | Yes | Fetch all sensor readings |
| GET    | /api/login-sessions | Yes | View login sessions |

\* Disabled in production by default

---

Questions? Check `server/README.md` for more details.
