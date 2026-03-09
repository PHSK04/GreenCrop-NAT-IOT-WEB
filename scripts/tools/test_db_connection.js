import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_DATABASE || 'SmartIoTDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 5000,
        enableArithAbort: true
    },
    port: 1433
};

console.log("-----------------------------------------");
console.log("Testing SQL Connection...");
console.log(`Server: ${config.server}`);
console.log(`User: ${config.user}`);
console.log(`Database: ${config.database}`);
console.log("-----------------------------------------");

async function testConnection() {
    try {
        console.log("Connecting...");
        let pool = await sql.connect(config);
        console.log("✅ SUCCESS! Connected to SQL Server.");
        
        let result = await pool.request().query('SELECT @@version as version');
        console.log("SQL Version:", result.recordset[0].version);
        
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ FAILED TO CONNECT:");
        console.error(err.message);
        if (err.originalError) {
            console.error("Original Error:", err.originalError.message);
        }
        process.exit(1);
    }
}

testConnection();
