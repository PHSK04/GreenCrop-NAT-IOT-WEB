const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'phsk',
    host: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'SmartIoTDB',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
});

// Initialize Database
async function initDb() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(255),
                plain_password TEXT,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                location VARCHAR(255),
                bio TEXT,
                avatar TEXT,
                title VARCHAR(100),
                notes TEXT,
                phone VARCHAR(20)
            )
        `);
        
        // Migration: Add columns if they don't exist
        try {
            await pool.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
            `);
        } catch (err) {
            // Columns might already exist, ignore error
        }
        
        console.log('✅ Users table ready');

        // Check for admin user
        const adminCheck = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            ['admin@smartiot.com']
        );

        if (adminCheck.rows.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            await pool.query(
                'INSERT INTO users (name, email, password, plain_password, role) VALUES ($1, $2, $3, $4, $5)',
                ['System Administrator', 'admin@smartiot.com', hash, 'password123', 'admin']
            );
            console.log('✅ Default admin account created');
        }

        // Create audit_logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(100),
                action VARCHAR(100),
                device VARCHAR(100),
                status VARCHAR(50),
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Audit logs table ready');

        // Create OTP table
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS otp_codes (
                    id SERIAL PRIMARY KEY,
                    contact VARCHAR(100), -- Email or Phone
                    code VARCHAR(6),
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ OTP table ready');
        } catch (err) {
            console.error('⚠️ OTP table error:', err);
        }

    } catch (err) {
        console.error('❌ Error in general database initialization:', err);
    }
}

// Initialize on startup
initDb();

// Database wrapper functions (compatible with existing code)
const db = {
    get: async (sql, params = []) => {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const result = await pool.query(pgSql, params);
        return result.rows[0];
    },
    
    all: async (sql, params = []) => {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const result = await pool.query(pgSql, params);
        return result.rows;
    },
    
    run: async (sql, params = []) => {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        // For INSERT statements, add RETURNING id
        let finalSql = pgSql;
        if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
            finalSql += ' RETURNING id';
        }
        
        const result = await pool.query(finalSql, params);
        
        return {
            id: result.rows[0]?.id || null,
            changes: result.rowCount
        };
    }
};

module.exports = db;
