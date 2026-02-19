const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Connect to SQLite file
const dbPath = path.resolve(__dirname, 'smart_iot.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('SQLite connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database:', dbPath);
        initDb();
    }
});

function initDb() {
    // Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, async (err) => {
        if (err) {
            console.error("Error creating table:", err);
        } else {
            console.log("Users table ready.");
            
            // Migration: Add new columns if not exist
            const columnsToAdd = ['location TEXT', 'bio TEXT', 'avatar TEXT', 'title TEXT'];
            columnsToAdd.forEach(columnDef => {
                const columnName = columnDef.split(' ')[0];
                db.all(`PRAGMA table_info(users)`, [], (pragmaErr, rows) => {
                    if (!pragmaErr) {
                        const columnExists = rows.some(row => row.name === columnName);
                        if (!columnExists) {
                            db.run(`ALTER TABLE users ADD COLUMN ${columnDef}`, (alterErr) => {
                                if (alterErr) console.error(`Error adding column ${columnName}:`, alterErr);
                                else console.log(`Added column: ${columnName}`);
                            });
                        }
                    }
                });
            });

            // Check for Admin
            db.get("SELECT * FROM users WHERE email = ?", ['admin@smartiot.com'], async (err, row) => {
                if (!row) {
                    const hash = await bcrypt.hash("password123", 10);
                    const insert = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
                    insert.run("System Administrator", "admin@smartiot.com", hash, "admin");
                    insert.finalize();
                    console.log("Default admin account created.");
                }
            });
        }
    });

    // Create Audit Logs Table (Bonus for your request)
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT,
        action TEXT,
        device TEXT,
        status TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Wrapper to use Promise like MSSQL style
const dbAsync = {
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

module.exports = dbAsync;
