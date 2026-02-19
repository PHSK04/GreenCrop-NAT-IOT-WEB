Server README — Quick start

Prerequisites
- Node.js >= 16
- npm
- MSSQL Server reachable from this machine
- (optional) mosquitto or any MQTT publisher for testing

1) Copy environment file

cp .env.example .env
# Edit .env with real DB credentials if needed

2) Install deps

cd server
npm install

3) Run migrations

npm run migrate

4) Start server (dev)

npm run dev

Endpoints
- POST /api/test-token  -> create a temporary JWT for testing
  Body: { "tenant_id": "my-tenant", "user_id": "u1", "email": "a@b.com" }
  Response: { token }

- POST /api/sensor-data -> insert sensor reading via HTTP
  Header: Authorization: Bearer <token>
  Body: { device_id, sensor_id, pressure, flow_rate, ec_value, pumps }

MQTT testing example
- Publish to: tenants/<tenant_id>/devices/<device_id>/sensors
- Example payload: {"device_id":"dev1","sensor_id":"s1","pressure":1.2,"flow":3.4,"pumps":[1,0]}

Recommended payload schema
- Minimal fields: `device_id`, `sensor_id`, `ts` (ISO timestamp) and one or more measurement fields.
- Optional: `msg_id` (string) for idempotency.

Example (simple):
```
{
  "device_id": "dev1",
  "sensor_id": "s1",
  "ts": "2026-02-15T10:00:00Z",
  "pressure": 1.23,
  "flow": 3.45,
  "pumps": [1,0],
  "msg_id": "msg-20260215-0001"
}
```

Example (new sensor with arbitrary fields):
```
{
  "device_id": "dev2",
  "sensor_id": "soil-abc",
  "ts": "2026-02-15T10:01:00Z",
  "moisture": 12.5,
  "ec": 0.8,
  "battery": 3.7,
  "msg_id": "msg-20260215-0002"
}
```

Device provisioning checklist
- Each device should have credentials (client cert / username+password or token) and be allowed to publish only to its tenant topic: `tenants/<tenant_id>/devices/<device_id>/#`.
- Use TLS and broker ACLs to restrict publishing rights.
- Devices should include `msg_id` for idempotency and `ts` for accurate timestamps.
- Start with a public test topic during development, then migrate devices to authenticated broker accounts for production.

Storage strategy used here
- Backend stores the parsed fields (pressure/flow/etc) in columns and the full `raw_payload` JSON in `raw_payload`. This lets you add new sensor types without immediate DB migration. For high-volume metrics, consider a time-series DB or separate denormalized table for common queries.

Notes
- `POST /api/test-token` is intended for local development only. Do NOT expose it in production.
- Migrations script runs all .sql files in `server/migrations` in lexical order.

Production checklist
- Set `NODE_ENV=production` and provide a strong `JWT_SECRET` in your `.env`.
- Do NOT enable the test-token endpoint in production. Leave `ENABLE_DEV_TOKEN=false` or unset.
- Use a process manager (pm2/systemd) to run `node server.js` and ensure logs and restarts are handled.
- Secure your MSSQL server (use private network, strong DB creds, TLS) and configure automated backups.
- If using MQTT in production, use a broker with authentication/TLS and set broker credentials in your config (replace public broker).
- Consider removing or protecting `/api/sensor-data` POST endpoints behind proper auth scopes and rate limits.

Deploy commands (example using pm2)
```
npm install --production
pm2 start server.js --name smart-iot-api
pm2 save
```

For backups and restore
- Use SQL Server native backup (`BACKUP DATABASE` / `RESTORE DATABASE`) or managed DB snapshots.
- Schedule backups and test restores regularly.
