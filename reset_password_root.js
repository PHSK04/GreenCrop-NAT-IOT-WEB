import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Database (assuming server/database.sqlite or similar)
// Let's check where the DB is. Usually server/database.sqlite
const dbPath = path.resolve(__dirname, 'server/database.sqlite'); 

const db = new sqlite3.verbose().Database(dbPath);

async function resetPassword() {
    const userId = 2; // ID ของคุณ
    const newPassword = '123456';
    
    // Hash ใหม่ให้ถูกต้อง
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`Resetting password for User ID ${userId} to '${newPassword}'...`);
    // console.log(`New Hash: ${hashedPassword}`);

    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, userId], function(err) {
        if (err) {
            return console.error("Database Update Error:", err.message);
        }
        console.log(`Row(s) updated: ${this.changes}`);
        
        if (this.changes === 0) {
            console.log("No user found with ID 2. Please check your User ID.");
        } else {
            console.log("Password reset successful! Try logging in now with '123456'.");
        }
        db.close();
    });
}

resetPassword();
