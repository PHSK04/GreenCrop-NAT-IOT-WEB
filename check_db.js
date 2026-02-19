import db from './server/database_mssql.js';

async function checkData() {
    try {
        console.log("Checking sensor_data...");
        const data = await db.all("SELECT TOP 5 * FROM sensor_data ORDER BY timestamp DESC");
        console.log("Latest Sensor Data:", JSON.stringify(data, null, 2));
        
        const counts = await db.raw("SELECT tenant_id, COUNT(*) as count FROM sensor_data GROUP BY tenant_id");
        console.log("Rows by Tenant:", JSON.stringify(counts, null, 2));

        const publicData = await db.all("SELECT TOP 1 * FROM sensor_data WHERE tenant_id = 'public' ORDER BY timestamp DESC");
        console.log("Public Data:", JSON.stringify(publicData, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkData();
