const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const rawConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const connectionString = String(rawConnectionString)
    .trim()
    .replace(/^['"]|['"]$/g, '');

function isLocalPostgresHost(host) {
    return ['localhost', '127.0.0.1', '::1'].includes(String(host || '').toLowerCase());
}

function normalizeSslMode(value) {
    return String(value || '').trim().toLowerCase();
}

function getSslConfig({ sslMode, host, hasConnectionString }) {
    const mode = normalizeSslMode(process.env.DB_SSL_MODE || process.env.PGSSLMODE || sslMode);
    const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true';

    if (mode === 'disable' || mode === 'false' || mode === 'off') return false;
    if (!hasConnectionString && process.env.NODE_ENV !== 'production') return false;
    if (!hasConnectionString && isLocalPostgresHost(host)) return false;

    // Keep hosted database compatibility by default, but make strict verification opt-in.
    return { rejectUnauthorized };
}

function parseConnectionString(raw) {
    if (!raw) return { connectionString: '', sslMode: '', host: '' };
    try {
        const parsed = new URL(raw);
        const sslMode = parsed.searchParams.get('sslmode') || '';
        parsed.searchParams.delete('sslmode');
        return {
            connectionString: parsed.toString(),
            sslMode,
            host: parsed.hostname,
        };
    } catch {
        return { connectionString: raw, sslMode: '', host: '' };
    }
}

const parsedConnection = parseConnectionString(connectionString);

const pool = new Pool(
    connectionString
        ? {
              connectionString: parsedConnection.connectionString,
              ssl: getSslConfig({
                  sslMode: parsedConnection.sslMode,
                  host: parsedConnection.host,
                  hasConnectionString: true,
              }),
          }
        : {
              user: process.env.DB_USER || 'postgres',
              host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
              database: process.env.DB_NAME || process.env.PGDATABASE || 'postgres',
              password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
              port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
              ssl: getSslConfig({
                  sslMode: '',
                  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
                  hasConnectionString: false,
              }),
          }
);

let lastConnectionError = null;
let lastConnectionAttemptAt = null;

pool.on('connect', () => {
    lastConnectionError = null;
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    lastConnectionError = err?.message || String(err);
    console.error('❌ PostgreSQL connection error:', err);
});

function getStatus() {
    return {
        driver: 'postgres',
        connected: !lastConnectionError,
        lastConnectionError,
        lastConnectionAttemptAt,
    };
}

function normalizeSql(sqlText) {
    let sql = String(sqlText || '');

    sql = sql.replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP');
    sql = sql.replace(/DATEDIFF\s*\(\s*HOUR\s*,\s*([^,]+?)\s*,\s*CURRENT_TIMESTAMP\s*\)/gi, "EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1)) / 3600");

    if (/OUTER APPLY/i.test(sql)) {
        sql = sql.replace(
            /OUTER APPLY\s*\(\s*SELECT(?:\s+TOP\s+1)?\s+sender_role,\s*sender_name\s*FROM chat_messages\s*WHERE thread_id = t\.id\s*ORDER BY created_at DESC,\s*id DESC\s*\)\s*lm/gi,
            `LEFT JOIN LATERAL (
                SELECT sender_role, sender_name
                FROM chat_messages
                WHERE thread_id = t.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) lm ON true`
        );
    }

    sql = sql.replace(/SELECT\s+TOP\s+(\d+)\s+/gi, 'SELECT ');
    if (/SELECT\s+/i.test(sql) && /TOP\s+\d+/i.test(sqlText)) {
        const match = sqlText.match(/SELECT\s+TOP\s+(\d+)\s+/i);
        if (match) {
            sql = `${sql} LIMIT ${match[1]}`;
        }
    }

    return sql;
}

function toPgSql(sqlText) {
    const normalized = normalizeSql(sqlText);
    let paramIndex = 1;
    return normalized.replace(/\?/g, () => `$${paramIndex++}`);
}

async function initDb() {
    lastConnectionAttemptAt = new Date().toISOString();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            password VARCHAR(255),
            plain_password TEXT,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            location VARCHAR(255),
            bio TEXT,
            avatar TEXT,
            title VARCHAR(100),
            notes TEXT,
            phone VARCHAR(20),
            auth_provider VARCHAR(32),
            provider_user_id VARCHAR(191)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_provider_user_id
        ON users(auth_provider, provider_user_id)
        WHERE provider_user_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_name VARCHAR(100),
            action VARCHAR(100),
            device VARCHAR(100),
            status VARCHAR(50),
            details TEXT,
            timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
            id SERIAL PRIMARY KEY,
            contact VARCHAR(100),
            code VARCHAR(6),
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sensor_data (
            id SERIAL PRIMARY KEY,
            tenant_id VARCHAR(64) NOT NULL,
            device_id VARCHAR(64),
            sensor_id VARCHAR(64),
            msg_id VARCHAR(128),
            pressure DOUBLE PRECISION,
            flow_rate DOUBLE PRECISION,
            ec_value DOUBLE PRECISION,
            pumps TEXT,
            raw_payload TEXT,
            source VARCHAR(32),
            mqtt_topic VARCHAR(191),
            ph_value DOUBLE PRECISION,
            temp_c DOUBLE PRECISION,
            wls1 BOOLEAN,
            wls2 BOOLEAN,
            float_alarm BOOLEAN,
            locked BOOLEAN,
            pump1_on BOOLEAN,
            pump2_on BOOLEAN,
            green_on BOOLEAN,
            red_on BOOLEAN,
            ph_ok BOOLEAN,
            start_button BOOLEAN,
            stop_button BOOLEAN,
            alarm_muted BOOLEAN,
            pairing_status VARCHAR(32),
            active_tank INTEGER,
            is_on BOOLEAN,
            uptime_seconds DOUBLE PRECISION DEFAULT 0,
            timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_device_sensor_ts
        ON sensor_data(tenant_id, device_id, sensor_id, timestamp);

        CREATE UNIQUE INDEX IF NOT EXISTS uq_sensor_data_msg_id
        ON sensor_data(tenant_id, msg_id)
        WHERE msg_id IS NOT NULL;

        CREATE INDEX IF NOT EXISTS ix_sensor_data_tenant_ts
        ON sensor_data(tenant_id, timestamp DESC);

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS source VARCHAR(32);

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS mqtt_topic VARCHAR(191);

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS ph_value DOUBLE PRECISION;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS temp_c DOUBLE PRECISION;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS wls1 BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS wls2 BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS float_alarm BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS locked BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS pump1_on BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS pump2_on BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS green_on BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS red_on BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS ph_ok BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS start_button BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS stop_button BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS alarm_muted BOOLEAN;

        ALTER TABLE sensor_data
        ADD COLUMN IF NOT EXISTS pairing_status VARCHAR(32);

        CREATE TABLE IF NOT EXISTS login_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_name VARCHAR(100),
            user_email VARCHAR(100),
            device_type VARCHAR(50),
            device_name VARCHAR(255),
            browser VARCHAR(100),
            browser_version VARCHAR(50),
            os VARCHAR(100),
            ip_address VARCHAR(50),
            user_agent TEXT,
            login_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            logout_time TIMESTAMPTZ,
            session_duration_minutes INTEGER,
            status VARCHAR(20) DEFAULT 'active'
        );

        CREATE TABLE IF NOT EXISTS device_pairings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_email VARCHAR(100),
            device_id VARCHAR(64) NOT NULL UNIQUE,
            device_name VARCHAR(120),
            location VARCHAR(120),
            pairing_code VARCHAR(16) NOT NULL,
            status VARCHAR(20) DEFAULT 'paired',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            paired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMPTZ,
            is_primary BOOLEAN DEFAULT false,
            updated_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS ix_device_pairings_user_id ON device_pairings(user_id);
        CREATE INDEX IF NOT EXISTS ix_device_pairings_user_primary ON device_pairings(user_id, is_primary);

        CREATE TABLE IF NOT EXISTS chat_threads (
            id SERIAL PRIMARY KEY,
            customer_user_id INTEGER NOT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_email VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(30),
            subject VARCHAR(200),
            status VARCHAR(30) DEFAULT 'open',
            priority VARCHAR(20) DEFAULT 'normal',
            assigned_admin_id INTEGER,
            assigned_admin_name VARCHAR(100),
            is_archived BOOLEAN DEFAULT false,
            is_pinned BOOLEAN DEFAULT false,
            last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            last_message_preview VARCHAR(500),
            customer_unread_count INTEGER DEFAULT 0,
            admin_unread_count INTEGER DEFAULT 0,
            customer_last_read_at TIMESTAMPTZ,
            admin_last_read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS ix_chat_threads_customer_user_id ON chat_threads(customer_user_id, last_message_at DESC);
        CREATE INDEX IF NOT EXISTS ix_chat_threads_status ON chat_threads(status, is_archived, last_message_at DESC);
        CREATE INDEX IF NOT EXISTS ix_chat_threads_assigned_admin_id ON chat_threads(assigned_admin_id, last_message_at DESC);

        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            thread_id INTEGER NOT NULL,
            sender_user_id INTEGER NOT NULL,
            sender_name VARCHAR(100) NOT NULL,
            sender_role VARCHAR(20) NOT NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            body TEXT,
            attachment_name VARCHAR(255),
            attachment_url TEXT,
            reply_to_message_id INTEGER,
            edited_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ,
            deleted_for_user_at TIMESTAMPTZ,
            deleted_for_admin_at TIMESTAMPTZ,
            deleted_for_everyone_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS ix_chat_messages_thread_id_created_at
        ON chat_messages(thread_id, created_at, id);

        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_name VARCHAR(100),
            user_email VARCHAR(100),
            device_id VARCHAR(64),
            title VARCHAR(200),
            status VARCHAR(30) DEFAULT 'active',
            escalated_thread_id INTEGER,
            last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            last_message_preview VARCHAR(500),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS ix_ai_chat_sessions_user_device
        ON ai_chat_sessions(user_id, device_id, status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS ix_ai_chat_sessions_escalated
        ON ai_chat_sessions(escalated_thread_id);

        CREATE TABLE IF NOT EXISTS ai_chat_messages (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL,
            sender_role VARCHAR(20) NOT NULL,
            body TEXT NOT NULL,
            intent VARCHAR(80),
            page_context VARCHAR(120),
            machine_status VARCHAR(120),
            should_escalate BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS ix_ai_chat_messages_session_created
        ON ai_chat_messages(session_id, created_at, id);

        CREATE TABLE IF NOT EXISTS ai_sensor_samples (
            id SERIAL PRIMARY KEY,
            tenant_id VARCHAR(64) NOT NULL,
            user_id INTEGER,
            device_id VARCHAR(64),
            sensor_data_id INTEGER,
            sample_source VARCHAR(32) DEFAULT 'sensor',
            feature_json TEXT NOT NULL,
            label VARCHAR(40) NOT NULL,
            risk_score DOUBLE PRECISION DEFAULT 0,
            action_hint VARCHAR(80),
            captured_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_sensor_samples_sensor_data_id
        ON ai_sensor_samples(sensor_data_id)
        WHERE sensor_data_id IS NOT NULL;

        CREATE INDEX IF NOT EXISTS ix_ai_sensor_samples_tenant_device_time
        ON ai_sensor_samples(tenant_id, device_id, captured_at DESC);

        CREATE INDEX IF NOT EXISTS ix_ai_sensor_samples_user_time
        ON ai_sensor_samples(user_id, captured_at DESC);
    `);

    const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@smartiot.com']);
    if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash('password123', 10);
        await pool.query(
            'INSERT INTO users (name, email, password, plain_password, role, auth_provider) VALUES ($1, $2, $3, $4, $5, $6)',
            ['System Administrator', 'admin@smartiot.com', hash, 'password123', 'admin', 'local']
        );
        console.log('✅ Default admin account created');
    }

    await pool.query(`
        UPDATE users
        SET auth_provider = 'local'
        WHERE auth_provider IS NULL
          AND password IS NOT NULL
    `);

    await pool.query(`
        ALTER TABLE chat_threads
        DROP CONSTRAINT IF EXISTS uq_chat_threads_customer_user_id;

        DO $$
        DECLARE idx RECORD;
        BEGIN
            FOR idx IN
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = ANY (current_schemas(false))
                  AND tablename = 'chat_threads'
                  AND indexdef ILIKE '%UNIQUE%'
                  AND indexdef ILIKE '%customer_user_id%'
            LOOP
                EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
            END LOOP;
        END $$;

        CREATE INDEX IF NOT EXISTS ix_chat_threads_customer_user_id
        ON chat_threads(customer_user_id, last_message_at DESC);
    `);

    await pool.query(`
        ALTER TABLE chat_messages
        ADD COLUMN IF NOT EXISTS deleted_for_user_at TIMESTAMPTZ;
        ALTER TABLE chat_messages
        ADD COLUMN IF NOT EXISTS deleted_for_admin_at TIMESTAMPTZ;
        ALTER TABLE chat_messages
        ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMPTZ;
    `);
}

const ready = initDb().catch((err) => {
    lastConnectionError = err?.message || String(err);
    console.error('❌ Error initializing PostgreSQL schema:', err);
});

async function query(sqlText, params = []) {
    await ready;
    lastConnectionAttemptAt = new Date().toISOString();
    return pool.query(toPgSql(sqlText), params);
}

const db = {
    get: async (sqlText, params = []) => {
        const result = await query(sqlText, params);
        return result.rows[0];
    },

    all: async (sqlText, params = []) => {
        const result = await query(sqlText, params);
        return result.rows;
    },

    run: async (sqlText, params = []) => {
        const trimmed = String(sqlText || '').trim();
        const isInsert = /^insert\s+/i.test(trimmed);
        const finalSql = isInsert ? `${trimmed} RETURNING id` : trimmed;
        const result = await query(finalSql, params);
        return {
            id: result.rows[0]?.id || null,
            changes: result.rowCount || 0,
        };
    },

    getStatus,
};

module.exports = Object.assign({}, db, {
    pool,
    ready,
    setSessionContext: async () => {},
});
