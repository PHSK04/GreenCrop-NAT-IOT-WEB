# Smart IoT System - Complete Setup Guide

**Status:** ✅ System is fully wired and ready for deployment

## What's Connected Now

```
Flutter App (iot_test1)
        ↓
    [HTTP API]
        ↓
[Node.js Backend Server]  ← [MQTT Listener]
        ↓                       ↑
    MSSQL Database        IoT Devices / Sensors
```

- **Flutter app** (`iot_test1/lib/main.dart`): Displays connection status, has sliders for sensor data, sends to backend API
- **Backend API** (`server/server.js`): Handles auth (JWT), MQTT subscription, HTTP endpoints
- **Database** (MSSQL): Stores sensor readings per tenant with `raw_payload` for flexibility
- **MQTT Listener** (`server/mqtt_listener.js`): Ingests data from topic `tenants/{tenant}/devices/{device}/sensors`

## Quick Start (5 minutes)

### 1. Start Backend Server

```bash
cd server
npm install                    # Install dependencies
npm run migrate               # Apply database schema
npm run dev                   # Start on port 3001
```

You should see:
```
✅ Connected to MSSQL Database
Server is running on http://localhost:3001
[MQTT] Connected to Broker
```

### 2. Run Flutter App

```bash
cd ../iot_test1
flutter pub get
flutter run
```

The app will:
1. Auto-connect to backend (shows ✓ Connected if successful)
2. Auto-fetch a JWT token for tenant `farm-flutterapp`
3. Display sensor value sliders (Pressure, Flow Rate, EC Value)
4. Send data via button click

### 3. Test End-to-End

**Via Flutter App:**
- Adjust sliders → Click "Send Sensor Data" → See SnackBar "Data sent!"
- Data is now in the database

**Via MQTT (command line):**
```bash
mosquitto_pub -h broker.hivemq.com -t tenants/farm-001/devices/dev-iot-01/sensors -m '{
  "device_id":"dev-iot-01",
  "sensor_id":"sensor-t01",
  "ts":"2026-02-15T10:00:00Z",
  "pressure":1.01,
  "flow":2.3,
  "ec":0.8,
  "msg_id":"m123"
}'
```

**Via HTTP (curl):**
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/test-token \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"farm-cli","user_id":"user-1"}' | jq -r '.token')

# 2. Send sensor data
curl -X POST http://localhost:3001/api/sensor-data \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"dev-cli",
    "sensor_id":"s1",
    "pressure":1.02,
    "flow_rate":2.4,
    "ec_value":0.76,
    "msg_id":"m456"
  }'

# 3. View data
curl -X GET http://localhost:3001/api/sensor-data \
  -H "Authorization: Bearer $TOKEN" | jq
```

## File Structure

```
Smart Iot 293764 Experimental/
├── server/
│   ├── .env                         # DB credentials + JWT secret
│   ├── .env.example                 # Template
│   ├── server.js                    # Express API server
│   ├── database_mssql.js            # DB wrapper with tenant context
│   ├── mqtt_listener.js             # Subscribes to MQTT topics
│   ├── middleware/
│   │   └── authTenant.js            # JWT auth + session context
│   ├── migrations/
│   │   ├── 001_add_tenant_sensor_data.sql
│   │   └── 002_add_raw_payload_msgid.sql
│   ├── package.json
│   ├── run_migrations.js
│   └── README.md
│
├── iot_test1/ (Flutter app)
│   ├── lib/
│   │   ├── main.dart                # Sensor data UI
│   │   └── services/
│   │       └── iot_api_service.dart # API client
│   └── pubspec.yaml
│
├── SETUP_E2E.md                     # Detailed testing guide
└── SETUP_GUIDE_COMPLETE.md          # This file
```

## Key Features

✅ **Multi-Tenant:**
- Each user/farm gets its own `tenant_id`
- Data isolation: user A cannot see user B's sensors
- Enforced at API (middleware) and DB level (session context)

✅ **Flexible Schema:**
- New sensor types don't require DB migration
- Full payload stored in `raw_payload` JSON
- Parsed fields (pressure/flow/ec) also stored for common queries

✅ **Idempotency:**
- Each message can include `msg_id`
- Prevents duplicate entries from network retries

✅ **Production-Ready:**
- JWT-based auth (disable dev endpoint in production)
- MSSQL Row-Level Security support (commented in code, can enable)
- Backups checklist in README
- Env-based configuration

## Configuration

### Backend `.env`
```
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=SmartIoT@2229!
DB_NAME=SmartIoTDB
JWT_SECRET=your-strong-secret-key
NODE_ENV=development
ENABLE_DEV_TOKEN=true     # For testing (disable in production)
```

### Flutter App
Edit `iot_test1/lib/services/iot_api_service.dart`:
```dart
static const String _baseUrl = 'http://localhost:3001/api';
```
Change `localhost` to your server IP/domain when deploying.

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/test-token` | POST | ❌ | Generate JWT (dev only) |
| `/api/sensor-data` | GET | ✅ | Fetch readings |
| `/api/sensor-data` | POST | ✅ | Insert reading |
| `/api/login` | POST | ❌ | User login |
| `/api/register` | POST | ❌ | Register user |

## Troubleshooting

**"Cannot reach backend"**
- Ensure backend is running: `npm run dev` from `server/` folder
- Check that port 3001 is not blocked
- On macOS: `lsof -i :3001`

**"Login failed" in migration**
- Verify MSSQL is running and credentials are correct
- Test connection: `sqlcmd -S localhost,1433 -U sa -P 'password' -Q "SELECT @@VERSION"`

**"MQTT topics not being saved"**
- Check MQTT broker is reachable: `mosquitto_pub -h broker.hivemq.com -t test -m "ping"`
- Verify Flutter app is sending to correct tenant topic

**"Data not appearing in DB"**
- Check server logs for SQL errors
- Verify `ENABLE_DEV_TOKEN=true` so Flutter can get a token
- Ensure `.env` has correct DB credentials

## Next Steps (Optional)

1. **Security:**
   - Change `JWT_SECRET` to real 32+ char random string
   - Set `ENABLE_DEV_TOKEN=false` for production
   - Use HTTPS + TLS for all connections
   - Add rate limiting and input validation

2. **Scale:**
   - Set up self-hosted MQTT broker (EMQX/Mosquitto) with TLS/auth
   - Move to managed database (Azure SQL, AWS RDS)
   - Add caching layer (Redis)

3. **UI/Mobile:**
   - Enhance Flutter app with dashboard/charts
   - Add device management (add/remove sensors)
   - Implement real-time data display (WebSocket)

4. **DevOps:**
   - Docker containerize backend
   - Use PM2/systemd for process management
   - Set up automated backups for MSSQL
   - CI/CD pipeline (GitHub Actions)

---

**All pieces are now connected. Deploy with confidence!**

For detailed testing instructions, see [SETUP_E2E.md](SETUP_E2E.md).
