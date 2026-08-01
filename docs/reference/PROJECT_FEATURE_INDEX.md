# GreenCrop NAT Feature Index

This index contains user-facing project capabilities only. It intentionally excludes environment files, credentials, private source internals, and user data.

## Dashboard

The dashboard shows the active paired device, live connection state, machine state, sensor values, pumps, water-level inputs, alarms, and recent telemetry. Live values are account-scoped and may be stale when the board or MQTT connection is offline.

## Device pairing and settings

Device Pairing links a device identifier to the authenticated account. Farm Settings lists that user's paired devices and supports name, location, primary-device selection, and unpairing. A user cannot read or control a device merely by knowing its identifier.

## Monitoring and reports

Device Monitor and Machine Performance present device telemetry and operating state. Tank Levels presents tank and water-level information. Crop Reports and Wolffia Analytics present stored production/analytics information. Weather Data uses the weather feature service. Export availability depends on the current page and loaded data.

## NAT AI and support

NAT AI provides local Ollama-backed free-form conversation, authenticated project/live-data context, local voice capture, local STT, and local TTS. Support Chat is a separate user-to-admin conversation channel. AI chat history is stored per authenticated user/session.

## Administration

Admin Overview, User Management, Database Viewer, Audit Logs, and Admin Chat Inbox require the admin role. Normal users must not receive admin database or other-user records.

## Authenticated live data tools

`GET /api/sensor-data` reads sensor data in authenticated tenant/device scope. `GET /api/devices/me` lists paired devices for the current user. `/api/ai/voice/tools/context` reads the selected paired device for voice tools. Control preparation and execution routes validate user, tenant, device pairing, action schema, and confirmation proof before MQTT publication.

## Missing or stale information

If a live query returns no permitted rows, the assistant should state that no data was found for the current account/device. If telemetry is old, it should label the value as saved/stale rather than current. Documentation evidence must be labeled with its source path; live account data must be labeled separately.
