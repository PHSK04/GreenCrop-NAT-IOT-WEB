# Sensor records by account, device and measurement time

The account API reads and writes only the authenticated user's currently paired device. `device_id` is required. A user-supplied tenant, shared-stream configuration, administrator role, or a device's historical tenants cannot widen this scope. Administrative database endpoints remain separate.

New MQTT rows resolve the owner from `device_pairings`. The topic and payload device IDs must agree. An explicit non-public tenant must match the paired owner. A legacy `public` topic can be attributed only when the payload/topic identifies an existing paired device. MQTT broker credentials and topic ACLs must independently restrict who can publish for a device; a device ID alone is not a credential.

Each record stores:

- `tenant_id`: authenticated account ID / server-resolved owner.
- `device_id`: the paired device ID.
- `timestamp`: measurement time as a UTC instant when supplied by the device.
- `received_at`: server receive time, separately recorded in UTC.
- `timestamp_source`: `device`, or `received` when the device supplies no usable measurement clock.
- `msg_id`: device-scoped delivery identity. Firmware should supply a stable ID such as `boot_uuid:sequence` and an ISO 8601 `measured_at` or `timestamp` with a timezone.

A supplied malformed, timezone-free, pre-2000, or more-than-five-minutes-future timestamp is rejected. Valid older measurements keep their original time. Measurements preceding the current pairing are rejected, preventing delayed data from a previous owner being assigned to a new owner. Missing device time is explicitly marked; true offline measurement time cannot be reconstructed from receipt time.

Latest reads and limited history use measurement time before insertion ID, so an older offline batch does not replace the current reading. Date-only history filters are interpreted as Thai calendar days (Asia/Bangkok, UTC+7). Explicit timezone-bearing filters retain their instant. Delivery retries hit a unique `(tenant_id, device_id, msg_id)` index. Timestamp collisions are not resolved by inventing later measurement times.

## Deployment and existing records

Application startup adds the nullable `received_at` and `timestamp_source` columns and the account/device/time index. PostgreSQL and SQL Server initialization are updated. The old account-wide message index is replaced with a device-scoped one. Existing records are retained and are not reassigned to whoever currently owns a device. Existing receive times and time provenance remain unknown (`NULL`) rather than being fabricated during migration.

Before production rollout, back up the database and verify the current pairings. Existing readings under `public` or another owner's tenant will no longer appear in the account API. Do not bulk reassign historical samples without verified ownership history. Review all clients for the now-required `device_id`, and provision device clocks and MQTT permissions. SQL Server changes have syntax review only; the database integration test covers PostgreSQL.

## Verification

Run `node --test services/telemetry_scope.test.js` for ownership, API/MQTT ingestion, time conversion, replay identity, delayed history, and device transfer cases. These tests use fake network/database services and do not contact devices.

To test actual schema initialization, its repeatability, device-scoped uniqueness and time-ordered reads, use a disposable PostgreSQL database whose name ends in `_test`:

```sh
TELEMETRY_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/wolffia_telemetry_test node --test services/telemetry_postgres.test.js
```

This integration test creates fixtures only in that explicitly selected database. It is skipped unless the variable is set. The full service suite also has an existing unrelated `nat_ai_chat.test.js` failure (`db.all is not a function` in its follow-up mock).
