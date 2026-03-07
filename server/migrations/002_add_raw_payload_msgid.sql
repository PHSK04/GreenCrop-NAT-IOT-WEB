-- Migration: add raw_payload and msg_id for idempotency
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'raw_payload' AND Object_ID = Object_ID(N'dbo.sensor_data'))
BEGIN
    ALTER TABLE dbo.sensor_data ADD raw_payload NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'msg_id' AND Object_ID = Object_ID(N'dbo.sensor_data'))
BEGIN
    ALTER TABLE dbo.sensor_data ADD msg_id NVARCHAR(128) NULL;
END

-- Optional unique constraint to prevent exact duplicate messages by msg_id per tenant
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ux_sensor_msgid_tenant')
BEGIN
    CREATE UNIQUE INDEX ux_sensor_msgid_tenant ON dbo.sensor_data(tenant_id, msg_id) WHERE msg_id IS NOT NULL;
END

PRINT 'Migration 002_add_raw_payload_msgid applied';
