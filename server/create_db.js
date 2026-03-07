const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Password123!', // <-- New Clean Password
    server: 'localhost', 
    database: 'master', 
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function createDatabase() {
    try {
        const pool = await sql.connect(config);
        
        // Disable "Connected" log since we just want to create DB
        const result = await pool.request().query("SELECT * FROM sys.databases WHERE name = 'SmartIoTDB'");
        
        if (result.recordset.length === 0) {
            console.log('Creating database SmartIoTDB...');
            await pool.request().query("CREATE DATABASE SmartIoTDB");
            console.log('✅ Database SmartIoTDB created successfully!');
        } else {
            console.log('ℹ️ Database SmartIoTDB already exists, skipping.');
        }

        await pool.close();
    } catch (err) {
        console.error('❌ Error creating database:', err);
    }
}

createDatabase();
