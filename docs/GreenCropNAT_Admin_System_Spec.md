# GreenCropNAT Admin System Specification

Project: GreenCropNAT Smart IoT Platform

## 1) Scope (Current Production)

This document is deduplicated from the original list and aligned with the current backend/database state.

### Implemented Core Modules
1. Dashboard
2. User Management
3. Login Activity Monitoring
4. Sensor Data Monitoring
5. Activity Logs
6. Database Viewer (Admin-only read view)

## 2) Current Database Coverage

Current core tables in DB:
- `users`
- `login_sessions`
- `sensor_data`
- `audit_logs`
- `otp_codes`

Admin read views now map directly to these tables.

## 3) Functional Specification (Current + Cleaned)

### 3.1 Dashboard
Displays:
- Total Users
- Active Admins
- Recent user activity (from sessions/logs)

### 3.2 User Management
Information:
- User ID
- Name / Email
- Role (`admin` / `user`)
- Registration Date
- Profile fields (location, title, bio)

Actions:
- Edit profile fields
- Change role
- Delete user
- View user details

### 3.3 Login Activity Monitoring
Data:
- Login Time
- User
- Device Type / Device Name
- Browser / OS / IP
- Login Status (`active` / `inactive`)

### 3.4 Sensor Data Monitoring
Data:
- Tenant ID
- Device ID
- Sensor ID
- Pressure / Flow / EC
- Active tank / Machine on-off / Uptime
- Timestamp

### 3.5 Activity Logs
Data:
- Time
- User/Source
- Action
- Target device/system
- Status
- Details

### 3.6 Database Viewer (Admin-only)
Read-only consolidated view for:
- `users`
- `login_sessions`
- `sensor_data`
- `audit_logs`
- `otp_codes` (contact masked)

## 4) Items Removed as Duplicate
- Separate “Device History” section merged into Sensor + Activity Logs.
- Repeated login/event tracking merged under Login Activity + Activity Logs.

## 5) Not Yet in DB (Recommended for Full-Cycle)

To reach full enterprise admin coverage, add these tables/features:

1. `devices`
- device_id, name, owner_user_id, type, firmware, status, last_seen

2. `alerts`
- alert_id, tenant_id, device_id, severity, type, message, created_at, resolved_at, resolved_by

3. `notifications`
- id, user_id, channel (email/line/push), template, payload, status, sent_at

4. `system_settings`
- key, value, scope, updated_by, updated_at

5. `role_permissions`
- role, permission_key, is_allowed

## 6) Access Control

Role model (current + recommended):
- Admin: full access
- User: own data only
- Viewer (recommended): read-only subset

## 7) Safety Requirements

Non-breaking rules:
- Existing API contracts must remain backward-compatible.
- New admin APIs should be additive and read-only unless explicitly required.
- Sensitive values must be masked in admin list endpoints (e.g., OTP contacts).
- Avoid schema-breaking migrations without rollback scripts.
