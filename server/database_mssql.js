const sql = require('mssql');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function getRequiredDbConfig() {
    return {
        DB_HOST: process.env.DB_HOST || '',
        DB_PORT: process.env.DB_PORT || '',
        DB_USER: process.env.DB_USER || '',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        DB_NAME: process.env.DB_NAME || '',
    };
}

function getMissingDbEnvKeys() {
    return Object.entries(getRequiredDbConfig())
        .filter(([, value]) => !String(value || '').trim())
        .map(([key]) => key);
}

let lastConnectionError = null;
let lastConnectionAttemptAt = null;

function getStatus() {
    return {
        driver: 'mssql',
        connected: Boolean(pool) && !lastConnectionError,
        lastConnectionError,
        lastConnectionAttemptAt,
    };
}

function buildConfig(dbUser) {
    return {
        user: dbUser,
        password: process.env.DB_PASSWORD || (isProduction ? '' : 'Password123!'),
        server: process.env.DB_HOST || (isProduction ? '' : 'localhost'),
        database: process.env.DB_NAME || (isProduction ? '' : 'SmartIoTDB'),
        options: {
            encrypt: true, // Required for Azure SQL
            trustServerCertificate: true // Keep true to simplify cert chain on hosted envs
        },
        port: parseInt(process.env.DB_PORT, 10) || 1433
    };
}

function getAzureSqlServerName(host) {
    if (!host) return '';
    return host.replace(/\.database\.windows\.net$/i, '');
}

let pool;

function isTransientSqlError(err) {
    const message = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toLowerCase();
    return (
        message.includes('closed') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('socket') ||
        message.includes('transport') ||
        code === 'econnreset' ||
        code === 'etimeout'
    );
}

async function resetPool() {
    if (pool) {
        try {
            await pool.close();
        } catch (closeErr) {
            console.warn('Warning: failed to close MSSQL pool cleanly:', closeErr.message);
        }
    }
    pool = null;
}

async function connectToDatabase() {
    try {
        if (!pool) {
            lastConnectionAttemptAt = new Date().toISOString();
            const missingEnvKeys = getMissingDbEnvKeys();
            if (isProduction && missingEnvKeys.length > 0) {
                lastConnectionError = `Missing DB env vars: ${missingEnvKeys.join(', ')}`;
                console.error(`❌ Database configuration error: ${lastConnectionError}`);
                return null;
            }

            const dbUser = process.env.DB_USER || (isProduction ? '' : 'sa');
            const dbHost = process.env.DB_HOST || (isProduction ? '' : 'localhost');
            const candidateUsers = [dbUser];

            // Azure SQL often requires user@servername login format.
            if (!dbUser.includes('@') && /\.database\.windows\.net$/i.test(dbHost)) {
                const serverName = getAzureSqlServerName(dbHost);
                if (serverName) {
                    candidateUsers.push(`${dbUser}@${serverName}`);
                }
            }

            let lastErr = null;
            for (const candidateUser of candidateUsers) {
                try {
                    pool = await sql.connect(buildConfig(candidateUser));
                    console.log(`✅ Connected to MSSQL Database as ${candidateUser}`);
                    lastConnectionError = null;
                    break;
                } catch (err) {
                    lastErr = err;
                    lastConnectionError = err?.message || String(err);
                    console.warn(`⚠️ DB connect failed for user ${candidateUser}: ${err.message}`);
                }
            }

            if (!pool) {
                throw lastErr || new Error('Unable to connect to MSSQL');
            }
            await initDb();
        }
        return pool;
    } catch (err) {
        lastConnectionError = err?.message || String(err);
        console.error('❌ Database Connection Failed! Make sure SQL Server is running.', err);
        // Keep API process alive; routes using DB will fail per-request until connection works.
        return null;
    }
}

async function initDb() {
    try {
        // Create Users Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100),
                email NVARCHAR(100) UNIQUE,
                password NVARCHAR(255),
                plain_password NVARCHAR(MAX),
                role NVARCHAR(50) DEFAULT 'user',
                created_at DATETIME DEFAULT GETDATE(),
                location NVARCHAR(255),
                bio NVARCHAR(MAX),
                avatar NVARCHAR(MAX),
                title NVARCHAR(100),
                notes NVARCHAR(MAX),
                phone NVARCHAR(20)
            )
        `);
        console.log('✅ Users table ready');

        // Social auth compatibility (safe additive migration)
        await pool.request().query(`
            IF COL_LENGTH('users', 'auth_provider') IS NULL
                ALTER TABLE users ADD auth_provider NVARCHAR(32) NULL;
            IF COL_LENGTH('users', 'provider_user_id') IS NULL
                ALTER TABLE users ADD provider_user_id NVARCHAR(191) NULL;
        `);
        await pool.request().query(`
            IF COL_LENGTH('users', 'auth_provider') IS NOT NULL
               AND COL_LENGTH('users', 'provider_user_id') IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                   FROM sys.indexes
                   WHERE name = 'ux_users_provider_user_id'
                     AND object_id = OBJECT_ID('users')
               )
            BEGIN
                EXEC('CREATE UNIQUE INDEX ux_users_provider_user_id
                      ON users(auth_provider, provider_user_id)
                      WHERE provider_user_id IS NOT NULL');
            END
        `);
        await pool.request().query(`
            UPDATE users
            SET auth_provider = 'local'
            WHERE auth_provider IS NULL
              AND password IS NOT NULL
        `);
        console.log('✅ Users social-auth columns ready');

        // Check for admin user
        const adminCheck = await pool.request().query("SELECT * FROM users WHERE email = 'admin@smartiot.com'");
        
        if (adminCheck.recordset.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            await pool.request()
                .input('name', sql.NVarChar, 'System Administrator')
                .input('email', sql.NVarChar, 'admin@smartiot.com')
                .input('pass', sql.NVarChar, hash)
                .input('plain', sql.NVarChar, 'password123')
                .input('role', sql.NVarChar, 'admin')
                .query("INSERT INTO users (name, email, password, plain_password, role) VALUES (@name, @email, @pass, @plain, @role)");
            console.log('✅ Default admin account created');
        }

        // Create Audit Logs Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_logs' and xtype='U')
            CREATE TABLE audit_logs (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_name NVARCHAR(100),
                action NVARCHAR(100),
                device NVARCHAR(100),
                status NVARCHAR(50),
                details NVARCHAR(MAX),
                timestamp DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('✅ Audit logs table ready');

        // Create OTP Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='otp_codes' and xtype='U')
            CREATE TABLE otp_codes (
                id INT IDENTITY(1,1) PRIMARY KEY,
                contact NVARCHAR(100), -- Email or Phone
                code NVARCHAR(6),
                expires_at DATETIME,
                created_at DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('✅ OTP table ready');

        // Create Sensor Data Table (IoT)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sensor_data' and xtype='U')
            BEGIN
                CREATE TABLE sensor_data (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    tenant_id NVARCHAR(64) NOT NULL,
                    device_id NVARCHAR(64) NULL,
                    sensor_id NVARCHAR(64) NULL,
                    msg_id NVARCHAR(128) NULL,
                    pressure FLOAT,
                    flow_rate FLOAT,
                    ec_value FLOAT,
                    pumps NVARCHAR(MAX), 
                    raw_payload NVARCHAR(MAX) NULL,
                    active_tank INT,
                    is_on BIT,
                    uptime_seconds FLOAT DEFAULT 0,
                    timestamp DATETIME DEFAULT GETDATE(),
                    CONSTRAINT uq_tenant_device_sensor_ts UNIQUE (tenant_id, device_id, sensor_id, timestamp)
                )
            END
            ELSE
            BEGIN
                -- Robust Column Migration
                IF COL_LENGTH('sensor_data', 'tenant_id') IS NULL
                    ALTER TABLE sensor_data ADD tenant_id NVARCHAR(64) NULL;
                IF COL_LENGTH('sensor_data', 'device_id') IS NULL
                    ALTER TABLE sensor_data ADD device_id NVARCHAR(64) NULL;
                IF COL_LENGTH('sensor_data', 'sensor_id') IS NULL
                    ALTER TABLE sensor_data ADD sensor_id NVARCHAR(64) NULL;
                IF COL_LENGTH('sensor_data', 'msg_id') IS NULL
                    ALTER TABLE sensor_data ADD msg_id NVARCHAR(128) NULL;
                IF COL_LENGTH('sensor_data', 'raw_payload') IS NULL
                    ALTER TABLE sensor_data ADD raw_payload NVARCHAR(MAX) NULL;
                IF COL_LENGTH('sensor_data', 'uptime_seconds') IS NULL
                    ALTER TABLE sensor_data ADD uptime_seconds FLOAT DEFAULT 0;
            END
        `);
        console.log('✅ Sensor Data table validated');

        // Create Login Sessions Table (Device Tracking)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='login_sessions' and xtype='U')
            CREATE TABLE login_sessions (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT,
                user_name NVARCHAR(100),
                user_email NVARCHAR(100),
                device_type NVARCHAR(50),      -- Mobile, Tablet, Desktop
                device_name NVARCHAR(255),     -- iPhone 17, iPad Pro, MacBook Pro
                browser NVARCHAR(100),         -- Chrome, Safari, Firefox
                browser_version NVARCHAR(50),
                os NVARCHAR(100),              -- iOS 18.2, macOS 15.1, Windows 11
                ip_address NVARCHAR(50),
                user_agent NVARCHAR(MAX),      -- Full user agent string
                login_time DATETIME DEFAULT GETDATE(),
                logout_time DATETIME,
                session_duration_minutes INT,
                status NVARCHAR(20) DEFAULT 'active'  -- active, logged_out, expired
            )
        `);
        console.log('✅ Login Sessions table ready');

        // Create Device Pairings Table (Hardware Ownership)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='device_pairings' and xtype='U')
            BEGIN
                CREATE TABLE device_pairings (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    user_email NVARCHAR(100),
                    device_id NVARCHAR(64) NOT NULL,
                    device_name NVARCHAR(120) NULL,
                    location NVARCHAR(120) NULL,
                    pairing_code NVARCHAR(16) NOT NULL,
                    status NVARCHAR(20) DEFAULT 'paired',
                    created_at DATETIME DEFAULT GETDATE(),
                    paired_at DATETIME DEFAULT GETDATE(),
                    last_seen DATETIME NULL,
                    is_primary BIT DEFAULT 0,
                    updated_at DATETIME NULL
                );
                CREATE UNIQUE INDEX uq_device_pairings_device_id ON device_pairings(device_id);
                CREATE INDEX ix_device_pairings_user_id ON device_pairings(user_id);
                CREATE INDEX ix_device_pairings_user_primary ON device_pairings(user_id, is_primary);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('device_pairings', 'user_email') IS NULL
                    ALTER TABLE device_pairings ADD user_email NVARCHAR(100) NULL;
                IF COL_LENGTH('device_pairings', 'device_name') IS NULL
                    ALTER TABLE device_pairings ADD device_name NVARCHAR(120) NULL;
                IF COL_LENGTH('device_pairings', 'location') IS NULL
                    ALTER TABLE device_pairings ADD location NVARCHAR(120) NULL;
                IF COL_LENGTH('device_pairings', 'pairing_code') IS NULL
                    ALTER TABLE device_pairings ADD pairing_code NVARCHAR(16) NULL;
                IF COL_LENGTH('device_pairings', 'status') IS NULL
                    ALTER TABLE device_pairings ADD status NVARCHAR(20) DEFAULT 'paired';
                IF COL_LENGTH('device_pairings', 'paired_at') IS NULL
                    ALTER TABLE device_pairings ADD paired_at DATETIME NULL;
                IF COL_LENGTH('device_pairings', 'last_seen') IS NULL
                    ALTER TABLE device_pairings ADD last_seen DATETIME NULL;
                IF COL_LENGTH('device_pairings', 'is_primary') IS NULL
                    ALTER TABLE device_pairings ADD is_primary BIT DEFAULT 0;
                IF COL_LENGTH('device_pairings', 'updated_at') IS NULL
                    ALTER TABLE device_pairings ADD updated_at DATETIME NULL;
            END
        `);
        console.log('✅ Device pairings table ready');

        // Create Chat Threads Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_threads' and xtype='U')
            BEGIN
                CREATE TABLE chat_threads (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    customer_user_id INT NOT NULL,
                    customer_name NVARCHAR(100) NOT NULL,
                    customer_email NVARCHAR(100) NOT NULL,
                    customer_phone NVARCHAR(30) NULL,
                    subject NVARCHAR(200) NULL,
                    status NVARCHAR(30) DEFAULT 'open',
                    priority NVARCHAR(20) DEFAULT 'normal',
                    assigned_admin_id INT NULL,
                    assigned_admin_name NVARCHAR(100) NULL,
                    is_archived BIT DEFAULT 0,
                    is_pinned BIT DEFAULT 0,
                    last_message_at DATETIME DEFAULT GETDATE(),
                    last_message_preview NVARCHAR(500) NULL,
                    customer_unread_count INT DEFAULT 0,
                    admin_unread_count INT DEFAULT 0,
                    customer_last_read_at DATETIME NULL,
                    admin_last_read_at DATETIME NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    closed_at DATETIME NULL
                );
                CREATE UNIQUE INDEX uq_chat_threads_customer_user_id ON chat_threads(customer_user_id);
                CREATE INDEX ix_chat_threads_status ON chat_threads(status, is_archived, last_message_at);
                CREATE INDEX ix_chat_threads_assigned_admin_id ON chat_threads(assigned_admin_id, last_message_at);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('chat_threads', 'customer_phone') IS NULL
                    ALTER TABLE chat_threads ADD customer_phone NVARCHAR(30) NULL;
                IF COL_LENGTH('chat_threads', 'subject') IS NULL
                    ALTER TABLE chat_threads ADD subject NVARCHAR(200) NULL;
                IF COL_LENGTH('chat_threads', 'status') IS NULL
                    ALTER TABLE chat_threads ADD status NVARCHAR(30) DEFAULT 'open';
                IF COL_LENGTH('chat_threads', 'priority') IS NULL
                    ALTER TABLE chat_threads ADD priority NVARCHAR(20) DEFAULT 'normal';
                IF COL_LENGTH('chat_threads', 'assigned_admin_id') IS NULL
                    ALTER TABLE chat_threads ADD assigned_admin_id INT NULL;
                IF COL_LENGTH('chat_threads', 'assigned_admin_name') IS NULL
                    ALTER TABLE chat_threads ADD assigned_admin_name NVARCHAR(100) NULL;
                IF COL_LENGTH('chat_threads', 'is_archived') IS NULL
                    ALTER TABLE chat_threads ADD is_archived BIT DEFAULT 0;
                IF COL_LENGTH('chat_threads', 'is_pinned') IS NULL
                    ALTER TABLE chat_threads ADD is_pinned BIT DEFAULT 0;
                IF COL_LENGTH('chat_threads', 'last_message_at') IS NULL
                    ALTER TABLE chat_threads ADD last_message_at DATETIME DEFAULT GETDATE();
                IF COL_LENGTH('chat_threads', 'last_message_preview') IS NULL
                    ALTER TABLE chat_threads ADD last_message_preview NVARCHAR(500) NULL;
                IF COL_LENGTH('chat_threads', 'customer_unread_count') IS NULL
                    ALTER TABLE chat_threads ADD customer_unread_count INT DEFAULT 0;
                IF COL_LENGTH('chat_threads', 'admin_unread_count') IS NULL
                    ALTER TABLE chat_threads ADD admin_unread_count INT DEFAULT 0;
                IF COL_LENGTH('chat_threads', 'customer_last_read_at') IS NULL
                    ALTER TABLE chat_threads ADD customer_last_read_at DATETIME NULL;
                IF COL_LENGTH('chat_threads', 'admin_last_read_at') IS NULL
                    ALTER TABLE chat_threads ADD admin_last_read_at DATETIME NULL;
                IF COL_LENGTH('chat_threads', 'updated_at') IS NULL
                    ALTER TABLE chat_threads ADD updated_at DATETIME DEFAULT GETDATE();
                IF COL_LENGTH('chat_threads', 'closed_at') IS NULL
                    ALTER TABLE chat_threads ADD closed_at DATETIME NULL;
            END
        `);
        console.log('✅ Chat threads table ready');

        // Create Chat Messages Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_messages' and xtype='U')
            BEGIN
                CREATE TABLE chat_messages (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    thread_id INT NOT NULL,
                    sender_user_id INT NOT NULL,
                    sender_name NVARCHAR(100) NOT NULL,
                    sender_role NVARCHAR(20) NOT NULL,
                    message_type NVARCHAR(20) DEFAULT 'text',
                    body NVARCHAR(MAX) NULL,
                    attachment_name NVARCHAR(255) NULL,
                    attachment_url NVARCHAR(MAX) NULL,
                    reply_to_message_id INT NULL,
                    edited_at DATETIME NULL,
                    deleted_at DATETIME NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                CREATE INDEX ix_chat_messages_thread_id_created_at ON chat_messages(thread_id, created_at);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('chat_messages', 'message_type') IS NULL
                    ALTER TABLE chat_messages ADD message_type NVARCHAR(20) DEFAULT 'text';
                IF COL_LENGTH('chat_messages', 'attachment_name') IS NULL
                    ALTER TABLE chat_messages ADD attachment_name NVARCHAR(255) NULL;
                IF COL_LENGTH('chat_messages', 'attachment_url') IS NULL
                    ALTER TABLE chat_messages ADD attachment_url NVARCHAR(MAX) NULL;
                IF COL_LENGTH('chat_messages', 'reply_to_message_id') IS NULL
                    ALTER TABLE chat_messages ADD reply_to_message_id INT NULL;
                IF COL_LENGTH('chat_messages', 'edited_at') IS NULL
                    ALTER TABLE chat_messages ADD edited_at DATETIME NULL;
                IF COL_LENGTH('chat_messages', 'deleted_at') IS NULL
                    ALTER TABLE chat_messages ADD deleted_at DATETIME NULL;
            END
        `);
        console.log('✅ Chat messages table ready');


    } catch (err) {
        console.error('❌ Error initializing database tables:', err);
    }
}

// --- Helper to execute Query with Parameters ---
async function executeQuery(sqlText, params = []) {
    if (!pool) await connectToDatabase();
    if (!pool) {
        const missingEnvKeys = getMissingDbEnvKeys();
        if (isProduction && missingEnvKeys.length > 0) {
            throw new Error(`Database is unavailable. Missing DB env vars: ${missingEnvKeys.join(', ')}`);
        }
        throw new Error('Database is unavailable. Please verify DB host/network/firewall settings.');
    }

    const runOnce = async () => {
        const request = pool.request();
        let query = sqlText;

        if (Array.isArray(params)) {
            params.forEach((value, index) => {
                const paramName = `p${index + 1}`;
                request.input(paramName, value === undefined ? null : value);
                query = query.replace('?', `@${paramName}`);
            });
        }

        try {
            return await request.query(query);
        } catch (err) {
            console.error('SQL Error:', err);
            console.error('Query:', query);
            console.error('Params:', params);
            throw err;
        }
    };

    try {
        return await runOnce();
    } catch (err) {
        if (!isTransientSqlError(err)) {
            throw err;
        }
        console.warn('Transient MSSQL error detected, retrying query once...');
        await resetPool();
        await connectToDatabase();
        if (!pool) {
            throw new Error('Database is temporarily unavailable. Please try again.');
        }
        return await runOnce();
    }
}

// Database wrapper functions (compatible with SQLite/Postgres wrapper)
const db = {
    // get: Returns first row
    get: async (sqlText, params = []) => {
        // Simple conversion from MySQL/SQLite 'LIMIT 1' to MSSQL 'TOP 1'
        let modifiedSql = sqlText;
        if (sqlText.toLowerCase().includes('limit 1')) {
            modifiedSql = sqlText.replace(/select/i, 'SELECT TOP 1').replace(/limit 1/i, '');
        }
        const result = await executeQuery(modifiedSql, params);
        return result.recordset[0];
    },
    
    // all: Returns all rows
    all: async (sqlText, params = []) => {
        const result = await executeQuery(sqlText, params);
        return result.recordset;
    },
    
    // run: Execute and return { id (lastID), changes }
    run: async (sqlText, params = []) => {
        // Special Handling for INSERT to get ID
        let modifiedSql = sqlText;
        let isInsert = sqlText.trim().toUpperCase().startsWith('INSERT');
        
        if (isInsert) {
             // Append SELECT SCOPE_IDENTITY() to get the ID
             modifiedSql += "; SELECT SCOPE_IDENTITY() AS id;";
        }

        const result = await executeQuery(modifiedSql, params);
        
        let lastId = null;
        if (isInsert && result.recordset && result.recordset.length > 0) {
            lastId = result.recordset[0].id;
        }

        return {
            id: lastId,
            changes: result.rowsAffected[0]
        };
    }
};

// Initialize on require for consistency with other modules
connectToDatabase().catch((err) => {
    // Defensive fallback: avoid unhandled startup rejection from crashing the service.
    console.error('Initial DB connect failed (service stays up):', err.message);
});

// Allow setting tenant context for Row-Level Security (MSSQL)
async function setSessionContext(tenantId) {
    if (!tenantId) return; // Skip if no tenant ID
    if (!pool) await connectToDatabase();
    if (!pool) return;
    try {
        await pool.request()
            .input('key', sql.NVarChar, 'tenant_id')
            .input('value', sql.NVarChar, String(tenantId)) // Ensure string
            .query('EXEC sp_set_session_context @key=@key, @value=@value;');
    } catch (err) {
        console.error('Failed to set session context for tenant:', tenantId, err.message);
        // Don't throw, just log
    }
}

module.exports = Object.assign({}, db, { setSessionContext, getStatus });
