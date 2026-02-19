import db from './server/database_mssql.js';

async function checkUsers() {
    try {
        const users = await db.all("SELECT id, name, email FROM users");
        console.log("Users:", JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkUsers();
