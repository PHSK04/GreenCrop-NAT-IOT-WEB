-- Migration: add tenant_id/device_id/sensor_id to sensor_data and ensure unique constraint
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'tenant_id' AND Object_ID = Object_ID(N'dbo.sensor_data'))
BEGIN
    ALTER TABLE dbo.sensor_data ADD tenant_id NVARCHAR(64) NOT NULL CONSTRAINT DF_sensor_data_tenant DEFAULT 'public';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'device_id' AND Object_ID = Object_ID(N'dbo.sensor_data'))
BEGIN
    ALTER TABLE dbo.sensor_data ADD device_id NVARCHAR(64) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'sensor_id' AND Object_ID = Object_ID(N'dbo.sensor_data'))
BEGIN
    ALTER TABLE dbo.sensor_data ADD sensor_id NVARCHAR(64) NULL;
END

-- Add unique constraint if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'UQ' AND name = 'uq_tenant_device_sensor_ts')
BEGIN
    ALTER TABLE dbo.sensor_data ADD CONSTRAINT uq_tenant_device_sensor_ts UNIQUE (tenant_id, device_id, sensor_id, timestamp);
END

PRINT 'Migration 001_add_tenant_sensor_data applied';
