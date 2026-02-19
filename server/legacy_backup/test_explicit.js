const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'YourPassword!123',
    server: '127.0.0.1',
    database: 'SmartIoTDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 5000
    }
};

async function test() {
    try {
        console.log(`Connecting to ${config.server} with user ${config.user} and password ${config.password}...`);
        await sql.connect(config);
        console.log("✅ Connected!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed:", err);
        if (err.originalError) console.error(" original:", err.originalError.message);
        process.exit(1);
    }
}

test();
