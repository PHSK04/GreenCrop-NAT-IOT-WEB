require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcrypt');

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword!123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'SmartIoTDB',
    options: {
        encrypt: false, // Use true for Azure, false for local dev/docker
        trustServerCertificate: true // Self-signed certs
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(async pool => {
        console.log('✅ Connected to Microsoft SQL Server');
        await initDb(pool);
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed!', err);
    });

async function initDb(pool) {
    try {
        // 1. Create table if not exists (including new columns)
        const createTableQuery = `
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
        )`;
        await pool.request().query(createTableQuery);

        // 2. Migration: Check and Add columns if they don't exist
        const columns = ['location', 'bio', 'avatar', 'title', 'notes', 'plain_password', 'phone'];
        for (const col of columns) {
            // Need dynamic SQL for column check that works reliably
            const checkCol = `
            IF COL_LENGTH('users', '${col}') IS NULL
            BEGIN
                ALTER TABLE users ADD ${col} NVARCHAR(MAX)
            END`;
            await pool.request().query(checkCol);
        }

        // 3. Admin Check
        const request = new sql.Request(pool);
        const adminCheck = await request
            .input('email_check', sql.NVarChar, 'admin@smartiot.com')
            .query('SELECT * FROM users WHERE email = @email_check');

        if (adminCheck.recordset.length === 0) {
            const hash = await bcrypt.hash("password123", 10);
            const insertRequest = new sql.Request(pool);
            await insertRequest
                .input('name', sql.NVarChar, 'System Administrator')
                .input('email', sql.NVarChar, 'admin@smartiot.com')
                .input('password', sql.NVarChar, hash)
                .input('plain_password', sql.NVarChar, 'password123')
                .input('role', sql.NVarChar, 'admin')
                .query("INSERT INTO users (name, email, password, plain_password, role) VALUES (@name, @email, @password, @plain_password, @role)");
            console.log("Default admin account created.");
        }

    } catch (err) {
        console.error("Error creating table or admin user:", err);
    }
}

// Helper to convert `?` to `@p0`, `@p1`... for MSSQL compatibility
function prepareStatement(pool, sqlQuery, params = []) {
    let query = sqlQuery;
    const request = pool.request();
    
    params.forEach((param, index) => {
        const paramName = `p${index}`;
        query = query.replace('?', `@${paramName}`);
        request.input(paramName, param);
    });
    
    return { request, query };
}

const db = {
    // Return single row
    get: async (sqlQuery, params = []) => {
        const pool = await poolPromise;
        const { request, query } = prepareStatement(pool, sqlQuery, params);
        const result = await request.query(query);
        return result.recordset[0];
    },
    // Return all rows
    all: async (sqlQuery, params = []) => {
        const pool = await poolPromise;
        const { request, query } = prepareStatement(pool, sqlQuery, params);
        const result = await request.query(query);
        return result.recordset;
    },
    // Execute command (Insert/Update/Delete)
    run: async (sqlQuery, params = []) => {
        const pool = await poolPromise;
        const { request, query } = prepareStatement(pool, sqlQuery, params);
        
        // MSSQL doesn't return `lastID` like SQLite automatically.
        // For INSERTs, we might need SCOPE_IDENTITY() if we really need the ID.
        // But for allowed generic usage, we'll try to execute.
        
        // If it's an INSERT, append SELECT SCOPE_IDENTITY() to get ID
        let modifiedQuery = query;
        const isInsert = query.trim().toUpperCase().startsWith('INSERT');
        if (isInsert) {
             modifiedQuery += '; SELECT SCOPE_IDENTITY() AS id;';
        }

        const result = await request.query(modifiedQuery);
        
        return {
            id: isInsert ? result.recordset[0]?.id : null,
            changes: result.rowsAffected[0]
        };
    }
};

module.exports = db;
