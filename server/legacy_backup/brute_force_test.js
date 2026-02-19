const sql = require('mssql');

const passwords = [
    'SA_Password123!',
    'AdminOfSmartIoT123',
    'YourPassword!123',
    'Password123!',
    'admin',
    'password',
    'sa'
];

async function tryConnect(password) {
    const config = {
        user: 'sa',
        password: password,
        server: '127.0.0.1',
        database: 'SmartIoTDB',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 2000
        }
    };

    try {
        await sql.connect(config);
        console.log(`✅ FOUND PASSWORD: ${password}`);
        return true;
    } catch (err) {
        // console.log(`❌ Failed: ${password}`);
        return false;
    }
}

async function run() {
    console.log("Brute forcing passwords...");
    for (const p of passwords) {
        if (await tryConnect(p)) {
            process.exit(0);
        }
    }
    console.log("❌ No password worked.");
}

run();
