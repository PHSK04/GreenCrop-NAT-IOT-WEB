const db = require('./server/database_mssql');

async function testConnection() {
    try {
        console.log("Testing MSSQL Connection...");
        const users = await db.all("SELECT * FROM users");
        console.log("✅ Connection Successful!");
        console.log(`Found ${users.length} users.`);
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));
    } catch (err) {
        console.error("❌ Connection Failed:", err);
    }
}

testConnection();
