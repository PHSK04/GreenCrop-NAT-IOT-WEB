const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'SmartIoT@2229!',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'SmartIoTDB',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    port: parseInt(process.env.DB_PORT) || 1433
};

async function testConnection() {
    console.log('Testing MSSQL Connection...');
    console.log(`Config: User=${config.user}, Server=${config.server}, Port=${config.port}, DB=${config.database}`);
    
    try {
        const pool = await sql.connect(config);
        console.log('✅ Connection Successful!');
        
        try {
            const result = await pool.request().query('SELECT COUNT(*) as count FROM users');
            console.log('✅ Query Successful! User count:', result.recordset[0].count);
        } catch (queryErr) {
            console.error('❌ Query Failed:', queryErr.message);
        }
        
        await pool.close();
    } catch (err) {
        console.error('❌ Connection Failed:', err.originalError ? err.originalError.message : err.message);
        console.error('Full Error:', err);
    }
}

testConnection();
