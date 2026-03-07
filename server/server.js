const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const db = require('./database_mssql');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const { startMqttListener } = require('./mqtt_listener');
const { parseUserAgent, getClientIP } = require('./deviceDetector');

// Start MQTT Listener for IoT Data Recording
startMqttListener();


const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || '';
const APPLE_SERVICE_ID = process.env.APPLE_SERVICE_ID || '';
const APPLE_JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
let appleJwksCache = { fetchedAt: 0, keys: [] };

const DEFAULT_CORS_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://phsk04.github.io',
];
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow mobile apps, curl, and same-network tools that do not send Origin.
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));
app.use(bodyParser.json());

// SUPER ADMIN RESET PASSWORD (TEMPORARY)
app.get('/api/reset-password-admin', async (req, res) => {
    try {
        const newPassword = '123456';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.run('UPDATE users SET password = ? WHERE id = 2', [hashedPassword]);
        
        res.send(`<h1>Password Reset Successfully!</h1><p>User ID 2 password is now: <b>123456</b></p>`);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Tenant middleware moved below public routes

// Routes
app.get('/', (req, res) => {
    res.send('Smart IoT API Server is running');
});

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'smart-iot-api',
        host: HOST,
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// DEBUG ENDPOINT: Check Users & Sessions
app.get('/api/debug-users', async (req, res) => {
    try {
        const users = await db.all("SELECT id, name, email, role FROM users");
        const sessions = await db.all("SELECT TOP 10 user_id, user_email, device_name, login_time FROM login_sessions ORDER BY login_time DESC");
        res.json({
            users: users,
            recent_sessions: sessions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        
        try {
            const result = await db.run(
                "INSERT INTO users (name, email, password, plain_password, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [name, email, hash, password, phone || null, 'user', new Date()]
            );

            const newUser = {
                id: result.id,
                name,
                email,
                role: 'user',
                createdAt: new Date(),
                phone: phone || null
            };
            logAudit(name, 'REGISTER', 'Web', 'SUCCESS', 'New user registered');
            res.json(newUser);
        } catch (sqlErr) {
            if (sqlErr.message.includes("UNIQUE constraint failed")) {
                return res.status(400).json({ error: "Email already exists" });
            }
            throw sqlErr;
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/verify-password', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ verified: true });
        } else {
            res.status(401).json({ verified: false, error: "Incorrect password" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function randomLocalPassword() {
    return crypto.randomBytes(24).toString('hex');
}

function socialFallbackEmail(provider, providerUserId) {
    return `${provider}_${providerUserId}@social.local`;
}

function appTokenForUser(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenant_id: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function mapUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        bio: user.bio,
        title: user.title,
        avatar: user.avatar,
        createdAt: user.created_at
    };
}

async function recordLoginSession(user, req) {
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);
    const ipAddress = getClientIP(req);

    await db.run(
        `INSERT INTO login_sessions (user_id, user_name, user_email, device_type, device_name, browser, browser_version, os, ip_address, user_agent, login_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user.id,
            user.name,
            user.email,
            deviceInfo.deviceType,
            deviceInfo.deviceName,
            deviceInfo.browser,
            deviceInfo.browserVersion,
            deviceInfo.os,
            ipAddress,
            deviceInfo.userAgent,
            new Date(),
            'active'
        ]
    );
}

function httpsGetJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk.toString('utf8');
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(new Error(`Invalid JSON response from ${url}`));
                }
            });
        });
        req.on('timeout', () => req.destroy(new Error('Request timeout')));
        req.on('error', reject);
    });
}

function decodeJwtPart(rawPart) {
    const normalized = rawPart.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
    const padded = normalized + '='.repeat(padLength);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

async function getAppleJwks() {
    const now = Date.now();
    if (appleJwksCache.keys.length > 0 && now - appleJwksCache.fetchedAt < APPLE_JWKS_CACHE_MS) {
        return appleJwksCache.keys;
    }

    const jwkSet = await httpsGetJson('https://appleid.apple.com/auth/keys');
    const keys = Array.isArray(jwkSet.keys) ? jwkSet.keys : [];
    if (!keys.length) {
        throw new Error('Unable to load Apple public keys');
    }

    appleJwksCache = { fetchedAt: now, keys };
    return keys;
}

async function verifyGoogleIdentity({ idToken, accessToken }) {
    if (idToken) {
        const payload = await httpsGetJson(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (!payload || !payload.sub) {
            throw new Error('Invalid Google identity token');
        }
        const aud = String(payload.aud || '');
        if (GOOGLE_CLIENT_IDS.length && !GOOGLE_CLIENT_IDS.includes(aud)) {
            throw new Error('Google token audience mismatch');
        }
        return {
            providerUserId: String(payload.sub),
            email: normalizeEmail(payload.email || ''),
            name: payload.name || 'Google User',
            avatar: payload.picture || null
        };
    }

    if (!accessToken) {
        throw new Error('Missing Google token');
    }

    const profile = await httpsGetJson(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!profile.sub) {
        throw new Error('Unable to validate Google access token');
    }
    return {
        providerUserId: String(profile.sub),
        email: normalizeEmail(profile.email || ''),
        name: profile.name || 'Google User',
        avatar: profile.picture || null
    };
}

async function verifyFacebookIdentity({ accessToken }) {
    if (!accessToken) {
        throw new Error('Missing Facebook access token');
    }
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        throw new Error('FACEBOOK_APP_ID / FACEBOOK_APP_SECRET is not configured on server');
    }

    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugData = await httpsGetJson(
        `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    );
    const debugInfo = debugData.data || {};
    if (!debugInfo.is_valid || String(debugInfo.app_id) !== String(FACEBOOK_APP_ID)) {
        throw new Error('Invalid Facebook token');
    }

    const profile = await httpsGetJson(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!profile.id) {
        throw new Error('Unable to fetch Facebook profile');
    }

    return {
        providerUserId: String(profile.id),
        email: normalizeEmail(profile.email || ''),
        name: profile.name || 'Facebook User',
        avatar: profile.picture && profile.picture.data ? profile.picture.data.url : null
    };
}

async function verifyAppleIdentity({ idToken, email }) {
    if (!idToken) {
        throw new Error('Missing Apple identity token');
    }

    const jwtParts = idToken.split('.');
    if (jwtParts.length !== 3) {
        throw new Error('Invalid Apple token format');
    }

    const header = decodeJwtPart(jwtParts[0]);
    const keys = await getAppleJwks();
    const jwk = keys.find((item) => item.kid === header.kid);
    if (!jwk) {
        throw new Error('Apple public key not found for token');
    }

    const audiences = [APPLE_BUNDLE_ID, APPLE_SERVICE_ID].filter(Boolean);
    if (!audiences.length) {
        throw new Error('APPLE_BUNDLE_ID or APPLE_SERVICE_ID is not configured on server');
    }

    const appleKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const payload = jwt.verify(idToken, appleKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: audiences
    });

    if (!payload || !payload.sub) {
        throw new Error('Invalid Apple identity token payload');
    }

    return {
        providerUserId: String(payload.sub),
        email: normalizeEmail(payload.email || email || ''),
        name: 'Apple User',
        avatar: null
    };
}

async function upsertSocialUser({ provider, providerUserId, email, name, avatar }) {
    const normalizedEmail = normalizeEmail(email || '');
    const finalEmail = normalizedEmail || socialFallbackEmail(provider, providerUserId);
    const finalName = (name || '').trim() || `${provider[0].toUpperCase()}${provider.slice(1)} User`;

    let user = await db.get(
        "SELECT * FROM users WHERE auth_provider = ? AND provider_user_id = ?",
        [provider, providerUserId]
    );
    if (!user) {
        user = await db.get("SELECT * FROM users WHERE email = ?", [finalEmail]);
    }

    if (user) {
        await db.run(
            `UPDATE users
             SET name = ?,
                 email = ?,
                 avatar = COALESCE(?, avatar),
                 auth_provider = ?,
                 provider_user_id = ?
             WHERE id = ?`,
            [finalName, finalEmail, avatar || null, provider, providerUserId, user.id]
        );
        return db.get("SELECT * FROM users WHERE id = ?", [user.id]);
    }

    const passwordHash = await bcrypt.hash(randomLocalPassword(), 10);
    const insertResult = await db.run(
        `INSERT INTO users (name, email, password, plain_password, role, avatar, auth_provider, provider_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [finalName, finalEmail, passwordHash, null, 'user', avatar || null, provider, providerUserId, new Date()]
    );
    return db.get("SELECT * FROM users WHERE id = ?", [insertResult.id]);
}

const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    console.log(`[LOGIN] Attempt for email: '${email}'`);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
        
        if (!user) {
            await logAudit(email, 'LOGIN_ATTEMPT', 'Web', 'FAILED', 'User not found');
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            await logAudit(user.name, 'LOGIN', 'Web', 'FAILED', 'Incorrect password');
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await logAudit(user.name, 'LOGIN', 'Web', 'SUCCESS', 'User logged in successfully');

        const token = appTokenForUser(user);
        
        // Log Login Session
        try {
            await recordLoginSession(user, req);
        } catch (deviceErr) {
            console.error('Failed to log device info:', deviceErr);
        }

        res.json({
            token,
            user: mapUser(user)
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
};

app.post('/api/auth/login', handleLogin);

app.post('/api/auth/social', async (req, res) => {
    const {
        provider,
        idToken,
        accessToken,
        email,
        name,
        avatar // Accepted from client for mock/simulated flows
    } = req.body || {};

    const normalizedProvider = String(provider || '').trim().toLowerCase();
    // Added 'line' to supported providers
    if (!['google', 'facebook', 'apple', 'line'].includes(normalizedProvider)) {
        return res.status(400).json({ error: 'Unsupported social provider' });
    }

    try {
        let verifiedProfile;

        // --- DEVELOPMENT / MOCK BYPASS ---
        // If token starts with 'mock_', we trust the client-provided data.
        // This allows "Real" DB storage without needing valid Google/FB API Cloud Console keys for localhost.
        if ((accessToken && accessToken.startsWith('mock_')) || (idToken && idToken.startsWith('mock_'))) {
            console.log(`[SOCIAL_LOGIN] Using MOCK flow for ${normalizedProvider}`);
            verifiedProfile = {
                providerUserId: (accessToken || idToken).replace('mock_', ''),
                email: normalizeEmail(email || `${(accessToken || idToken).replace('mock_', '')}@mock.local`),
                name: name || `${normalizedProvider} User`,
                avatar: avatar || null
            };
        } else {
            // --- REAL VERIFICATION ---
            if (normalizedProvider === 'google') {
                verifiedProfile = await verifyGoogleIdentity({ idToken, accessToken });
            } else if (normalizedProvider === 'facebook') {
                verifiedProfile = await verifyFacebookIdentity({ accessToken });
            } else if (normalizedProvider === 'apple') {
                verifiedProfile = await verifyAppleIdentity({ idToken, email });
            } else if (normalizedProvider === 'line') {
                // Future: Implement Real LINE Login Verification here
                // For now, if not mock, throw error as we don't have LINE Verify function yet
                throw new Error("Real LINE verification not implemented yet. Use mock_ token.");
            }
        }

        const mergedName = (name || '').trim() || verifiedProfile.name;
        const mergedEmail = normalizeEmail(email || '') || verifiedProfile.email;
        
        // 1. Upsert User in DB
        const user = await upsertSocialUser({
            provider: normalizedProvider,
            providerUserId: verifiedProfile.providerUserId,
            email: mergedEmail,
            name: mergedName,
            avatar: verifiedProfile.avatar
        });

        try {
            await recordLoginSession(user, req);
        } catch (deviceErr) {
            console.error('Failed to log social login device info:', deviceErr);
        }

        await logAudit(
            user.name,
            'LOGIN_SOCIAL',
            normalizedProvider.toUpperCase(),
            'SUCCESS',
            `Social login (${normalizedProvider})`
        );

        return res.json({
            token: appTokenForUser(user),
            user: mapUser(user),
            provider: normalizedProvider
        });
    } catch (err) {
        console.error(`[SOCIAL_LOGIN] ${normalizedProvider} failed:`, err.message || err);
        await logAudit(
            normalizeEmail(email || '') || 'Unknown',
            'LOGIN_SOCIAL',
            normalizedProvider.toUpperCase() || 'UNKNOWN',
            'FAILED',
            err.message || 'Social login failed'
        );
        return res.status(401).json({ error: `Social login failed: ${err.message || 'invalid token'}` });
    }
});

// Middleware to log audit
async function logAudit(userName, action, device, status, details) {
    try {
        await db.run(
            "INSERT INTO audit_logs (user_name, action, device, status, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            [userName || 'Unknown', action, device || 'Web', status, details, new Date()]
        );
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
}

// 2. LOGIN
app.post('/api/login', handleLogin);

// 2.5 LOGOUT
app.post('/api/logout', async (req, res) => {
    const { userId } = req.body;
    
    try {
        if (!userId) {
             return res.status(400).json({ error: "User ID required" });
        }
        
        const now = new Date();
        
        // Find latest active session to calculate duration
        const lastSession = await db.get(
            "SELECT id, login_time FROM login_sessions WHERE user_id = ? AND status = 'active' ORDER BY login_time DESC LIMIT 1",
            [userId]
        );

        if (lastSession) {
            const loginTime = new Date(lastSession.login_time);
            const durationMinutes = Math.round((now - loginTime) / 60000); // ms to min

            await db.run(
                `UPDATE login_sessions 
                 SET logout_time = ?, status = 'inactive', session_duration_minutes = ?
                 WHERE id = ?`,
                [now, durationMinutes, lastSession.id]
            );
        } else {
            console.log("No active session found for user:", userId);
        }

        // Audit Log
        const user = await db.get("SELECT name FROM users WHERE id = ?", [userId]);
        logAudit(user ? user.name : 'Unknown', 'LOGOUT', 'Web', 'SUCCESS', 'User logged out');

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SECURE ROUTES BELOW ---
// Tenant middleware: verify JWT and set DB session context (for MSSQL RLS)
const authTenant = require('./middleware/authTenant')(db);
app.use(authTenant);

// 3. GET ALL USERS
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.all("SELECT id, name, email, role, location, bio, avatar, title, created_at as createdAt FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. DELETE USER
app.delete('/api/users/:id', async (req, res) => {
    try {
        const result = await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
        logAudit('Admin', 'DELETE_USER', 'Web', 'SUCCESS', `Deleted user ID: ${req.params.id}`);
        res.json({ message: "Deleted", changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. UPDATE USER ROLE
app.put('/api/users/:id/role', async (req, res) => {
    const { role } = req.body;
    try {
        const result = await db.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
        res.json({ message: "Updated", changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. UPDATE USER DETAILS (New Feature + Title + Password + Notes)
app.put('/api/users/:id', async (req, res) => {
    const { name, email, location, bio, avatar, title, password, notes } = req.body;
    try {
        // Prevent generic/empty updates
        if (!name && !email && !location && !bio && !avatar && !title && !password && !notes) {
            return res.status(400).json({ error: "Nothing to update" });
        }

        let query = "UPDATE users SET ";
        let params = [];
        
        if (name) {
            query += "name = ?, ";
            params.push(name);
        }
        if (email) {
            query += "email = ?, ";
            params.push(email);
        }
        if (location) {
            query += "location = ?, ";
            params.push(location);
        }
        if (bio) {
            query += "bio = ?, ";
            params.push(bio);
        }
        if (avatar) {
            query += "avatar = ?, ";
            params.push(avatar);
        }
        if (title) {
            query += "title = ?, ";
            params.push(title);
        }
        if (password) {
            // Hash the new password and store both
            const hash = await bcrypt.hash(password, 10);
            query += "password = ?, plain_password = ?, ";
            params.push(hash);
            params.push(password);
        }
        if (notes) {
            query += "notes = ?, ";
            params.push(notes);
        }
        
        // Remove trailing comma
        query = query.slice(0, -2);
        query += " WHERE id = ?";
        params.push(req.params.id);

        const result = await db.run(query, params);
        logAudit(name || 'Unknown', 'UPDATE_PROFILE', 'Web', 'SUCCESS', `Updated user ID: ${req.params.id}`);
        res.json({ message: "User Updated Successfully", changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// OTP System
async function generateOTP(contact) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Clean existing OTPs for the contact
    await db.run("DELETE FROM otp_codes WHERE contact = ?", [contact]);

    // Save new OTP
    await db.run("INSERT INTO otp_codes (contact, code, expires_at) VALUES (?, ?, ?)", [contact, code, expiresAt.toISOString()]); // Store as ISO string

    console.log(`[OTP DEBUG] OTP for ${contact} is: ${code}`); // Log for dev
    return code;
}

// 7. SEND OTP (Email / Phone)
app.post('/api/send-otp', async (req, res) => {
    console.log(`[API] Received OTP request:`, req.body);
    const { contact, type } = req.body; // type: 'email' or 'phone'

    try {
        const otp = await generateOTP(contact);

        if (type === 'email') {
            // Simulate Email Sending (Would use nodemailer here with your credentials)
            console.log(`Sending Email to ${contact} with OTP: ${otp}`);
            // In a real app: await transporter.sendMail(...)
            res.json({ message: "OTP sent to email", debug_otp: otp });
        } else if (type === 'phone') {
            // Simulate SMS Sending (Would use Twilio/Nexmo here)
            console.log(`Sending SMS to ${contact} with OTP: ${otp}`);
            res.json({ message: "OTP sent to phone", debug_otp: otp });
        } else {
            res.status(400).json({ error: "Invalid OTP type" });
        }

    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

// 8. VERIFY OTP
app.post('/api/verify-otp', async (req, res) => {
    const { contact, code } = req.body;
    try {
        const record = await db.get("SELECT * FROM otp_codes WHERE contact = ? AND code = ?", [contact, code]);

        if (!record) {
            return res.status(400).json({ verified: false, error: "Invalid OTP" });
        }

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ verified: false, error: "OTP Expired" });
        }

        // OTP Valid
        await db.run("DELETE FROM otp_codes WHERE contact = ?", [contact]); // Consume OTP
        res.json({ verified: true, message: "OTP Verified Successfully" });

    } catch (err) {
        res.status(500).json({ error: "Verification failed" });
    }
});

// 9. GET LOGIN SESSIONS (All)
app.get('/api/login-sessions', async (req, res) => {
    try {
        const sessions = await db.all(`
            SELECT id, user_name, user_email, device_type, device_name, browser, 
                   browser_version, os, ip_address, login_time, logout_time, 
                   session_duration_minutes, status
            FROM login_sessions 
            ORDER BY login_time DESC
        `);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. GET LOGIN SESSIONS BY USER
app.get('/api/login-sessions/user/:userId', async (req, res) => {
    try {
        const sessions = await db.all(`
            SELECT id, user_name, user_email, device_type, device_name, browser, 
                   browser_version, os, ip_address, login_time, logout_time, 
                   session_duration_minutes, status
            FROM login_sessions 
            WHERE user_id = ?
            ORDER BY login_time DESC
        `, [req.params.userId]);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. GET ACTIVE SESSIONS
app.get('/api/login-sessions/active', async (req, res) => {
    try {
        const sessions = await db.all(`
            SELECT id, user_name, user_email, device_type, device_name, browser, 
                   browser_version, os, ip_address, login_time, status
            FROM login_sessions 
            WHERE status = 'active'
            ORDER BY login_time DESC
        `);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Sensor Data Endpoints (tenant-aware via middleware/session context)
// --- Sensor Data Endpoints (Strict User/Tenant Specific)
app.get('/api/sensor-data', async (req, res) => {
    try {
        const serverNowIso = new Date().toISOString();
        // 1. Get User ID (Tenant ID) from JWT (req.tenant), Header, or Query
        let tenantId = req.tenant || req.headers['x-tenant-id'] || req.query.tenant_id;
        if (tenantId) tenantId = String(tenantId); // Ensure String for MSSQL comparison
        
        console.log(`[READ] Sensor Request - Tenant ID: ${tenantId}`);

        if (!tenantId) {
            // New User or No Login? Return empty default state instead of global data
            return res.json([{
                pressure: 0, 
                flow_rate: 0, 
                is_on: false,
                message: "No tenant_id provided, please login.",
                server_now: serverNowIso
            }]);
        }

        // 2. Fetch DATA specific to this User Only
        let query = `
            SELECT TOP 1 id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp
            FROM sensor_data
            WHERE tenant_id = ?
            ORDER BY id DESC
        `;
        
        let rows = await db.all(query, [tenantId]);

        // 2b. Fallback: If no user-specific data, check for 'public' legacy data
        if (rows.length === 0 && tenantId !== 'public') {
            console.log(`[READ] No data for Tenant ${tenantId}, falling back to 'public'`);
            rows = await db.all(query, ['public']);
        }

        // History mode for charts (optional)
        if (req.query.history === 'true') {
             const targetTenant = rows.length > 0 ? (rows[0].tenant_id || tenantId) : tenantId;
             const history = await db.all(`
                SELECT TOP 50 pressure, flow_rate, timestamp 
                FROM sensor_data 
                WHERE tenant_id = ?
                ORDER BY id DESC
            `, [targetTenant]);
            for (const row of history) {
                row.server_now = serverNowIso;
            }
            return res.json(history); 
        }

        // If still no data found, return default OFF state
        if (rows.length === 0) {
            return res.json([{
                pressure: 0,
                flow_rate: 0,
                ec_value: 0,
                is_on: false, // Default OFF
                pumps: '[]',
                active_tank: 0,
                uptime_seconds: 0,
                tenant_id: tenantId, // Echo back
                server_now: serverNowIso
            }]);
        }
        
        // Return as Array (Mobile App expects List)
        for (const row of rows) {
            row.server_now = serverNowIso;
        }
        res.json(rows); 
        
    } catch (err) {
        console.error("GET Sensor Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sensor-data', async (req, res) => {
    try {
        let tenant = req.tenant || req.headers['x-tenant-id'] || req.body.tenant_id || 'public';
        tenant = String(tenant); // Ensure String
        
        console.log(`[DATA SYNC] Update from Tenant ID: ${tenant} | Power: ${req.body.is_on}`);

        const { device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp } = req.body;
        const pumpsJson = pumps && Array.isArray(pumps) ? JSON.stringify(pumps.map(p => p ? 1 : 0)) : '[]';
        const parsedTs = timestamp ? new Date(timestamp) : new Date();
        const safeTimestamp = Number.isNaN(parsedTs.getTime()) ? new Date() : parsedTs;

        const result = await db.run(
            `INSERT INTO sensor_data (tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenant, device_id || null, sensor_id || null, pressure || 0, flow_rate || 0, ec_value || 0, pumpsJson, active_tank ?? null, is_on ? 1 : 0, uptime_seconds || 0, safeTimestamp]
        );

        res.json({ ok: true, id: result.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function startServer() {
    return app.listen(PORT, HOST, () => {
        console.log(`Server is running on http://localhost:${PORT} (bound to ${HOST})`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    HOST,
    PORT,
    startServer
};
