const db = require('./database');

async function testConnection() {
    try {
        console.log("Testing MSSQL Connection...");
        const users = await db.all("SELECT * FROM users");
        console.log("✅ Connection Successful!");
        console.log(`Found ${users.length} users.`);
        if (users.length === 0) {
            console.log("⚠️ No users found. You might need to check if the database was migrated correctly or if it's empty.");
        }
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));
    } catch (err) {
        console.error("❌ Connection Failed:", err);
    }
}

testConnection();
