const sql = require('mssql');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function buildConfig(dbUser) {
    return {
        user: dbUser,
        password: process.env.DB_PASSWORD || 'Password123!',
        server: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'SmartIoTDB',
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

async function connectToDatabase() {
    try {
        if (!pool) {
            const dbUser = process.env.DB_USER || 'sa';
            const dbHost = process.env.DB_HOST || 'localhost';
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
                    break;
                } catch (err) {
                    lastErr = err;
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


    } catch (err) {
        console.error('❌ Error initializing database tables:', err);
    }
}

// --- Helper to execute Query with Parameters ---
async function executeQuery(sqlText, params = []) {
    if (!pool) await connectToDatabase();
    if (!pool) {
        throw new Error('Database is unavailable. Please verify DB host/network/firewall settings.');
    }
    
    const request = pool.request();
    let query = sqlText;

    // Convert ? to @p1, @p2... and bind parameters
    // Note: This logic assumes parameters appear in order '?'.
    // If params is an object (named params), logic would differ but SQLite wrapper usually uses array.
    if (Array.isArray(params)) {
        params.forEach((value, index) => {
            const paramName = `p${index + 1}`;
            // If value is undefined, tedious might throw. Use null instead.
            request.input(paramName, value === undefined ? null : value);
            // Replace the FIRST occurrence of ? with @pX
            query = query.replace('?', `@${paramName}`);
        });
    }

    try {       
        const result = await request.query(query);
        return result;
    } catch (err) {
        console.error('SQL Error:', err);
        console.error('Query:', query);
        console.error('Params:', params);
        throw err;
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

module.exports = Object.assign({}, db, { setSessionContext });
