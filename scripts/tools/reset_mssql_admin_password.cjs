const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'server/.env' }); // Adjust path if needed

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'SmartIoT@2229!',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'SmartIoTDB',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: false, // For Docker/Localhost without SSL cert
        trustServerCertificate: true,
    }
};

async function resetPassword() {
    try {
        console.log('Connecting to MSSQL...');
        const pool = await sql.connect(config);
        console.log('Connected!');

        const newPassword = 'password123'; // Using 'password123' as requested OR '123456'
        // Let's use '123456' as user tried recently, but 'password123' is safer default if user forgets.
        // User tried '123456' in last step. Let's use '123456'.
        const targetConfigPassword = '123456'; 
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(targetConfigPassword, salt);

        // Update User ID 2 (assuming that's the one we want) or email 'phongsagonsk@gmail.com'
        const email = 'phongsagonsk@gmail.com'; // Based on recent login attempt
        
        // First check if user exists
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        if (result.recordset.length === 0) {
            console.log(`User with email ${email} not found. Creating new user...`);
            // Create user if not exists
             await pool.request()
                .input('name', sql.NVarChar, 'Phongsagon SK')
                .input('email', sql.NVarChar, email)
                .input('password', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .query(`
                    INSERT INTO Users (name, email, password, role, created_at, updated_at)
                    VALUES (@name, @email, @password, @role, GETDATE(), GETDATE())
                `);
             console.log('User created successfully with ID (please check DB).');
        } else {
            console.log(`User found (ID: ${result.recordset[0].id}). Updating password...`);
            await pool.request()
                .input('password', sql.NVarChar, hashedPassword)
                .input('email', sql.NVarChar, email)
                .query('UPDATE Users SET password = @password WHERE email = @email');
            console.log('Password updated successfully.');
        }

        console.log(`\n✅ Credentials ready:\nEmail: ${email}\nPassword: ${targetConfigPassword}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

resetPassword();
