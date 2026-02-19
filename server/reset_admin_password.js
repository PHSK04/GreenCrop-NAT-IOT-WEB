const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function resetPassword() {
    const userId = 2; // ID ของคุณ
    const newPassword = '123456';
    
    // Hash ใหม่ให้ถูกต้อง
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`Resetting password for User ID ${userId} to '${newPassword}'...`);
    console.log(`New Hash: ${hashedPassword}`);

    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, userId], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Row(s) updated: ${this.changes}`);
        console.log("Password reset successful! Try logging in now.");
        db.close();
    });
}

resetPassword();
