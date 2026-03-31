const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const db = require('./database');
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
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'public';
const SHARED_SENSOR_TENANT = String(process.env.SHARED_SENSOR_TENANT || 'false').toLowerCase() === 'true';
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || '';
const APPLE_SERVICE_ID = process.env.APPLE_SERVICE_ID || '';
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_REDIRECT_URI = process.env.LINE_REDIRECT_URI || '';
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || '';
const APPLE_JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
let appleJwksCache = { fetchedAt: 0, keys: [] };
const MICROSOFT_JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
let microsoftJwksCache = { fetchedAt: 0, keys: [] };

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
        db: typeof db.getStatus === 'function' ? db.getStatus() : undefined,
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
            const message = String(sqlErr?.message || '');
            if (
                message.includes("UNIQUE constraint failed") ||
                sqlErr?.code === '23505' ||
                sqlErr?.constraint === 'users_email_key' ||
                message.includes('duplicate key value') ||
                message.includes('users_email_key')
            ) {
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

function asBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const v = String(value ?? '').toLowerCase().trim();
    return v === '1' || v === 'true' || v === 'on';
}

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function computeLiveUptimeSeconds(row, nowMs = Date.now()) {
    const baseUptime = Math.max(0, Math.floor(asNumber(row?.uptime_seconds, 0)));
    if (!asBool(row?.is_on)) return baseUptime;

    const rowTimeMs = row?.timestamp ? new Date(row.timestamp).getTime() : NaN;
    if (!Number.isFinite(rowTimeMs) || rowTimeMs <= 0) return baseUptime;

    const elapsed = Math.floor((nowMs - rowTimeMs) / 1000);
    return baseUptime + Math.max(0, elapsed);
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
    const clientPlatform = String(req.headers['x-client-platform'] || '').trim();
    const appVersion = String(req.headers['x-app-version'] || '').trim();
    const headerDeviceName = String(req.headers['x-device-name'] || '').trim();
    const headerOsVersion = String(req.headers['x-os-version'] || '').trim();
    const networkType = String(req.headers['x-network-type'] || '').trim();

    const deviceName = headerDeviceName || deviceInfo.deviceName;
    const osName = headerOsVersion ? `${deviceInfo.os} ${headerOsVersion}` : deviceInfo.os;
    const browser = clientPlatform ? `${clientPlatform}${appVersion ? ` v${appVersion}` : ''}` : deviceInfo.browser;
    const mergedUserAgent = [deviceInfo.userAgent, networkType ? `network=${networkType}` : ''].filter(Boolean).join(' | ');

    await db.run(
        `INSERT INTO login_sessions (user_id, user_name, user_email, device_type, device_name, browser, browser_version, os, ip_address, user_agent, login_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user.id,
            user.name,
            user.email,
            deviceInfo.deviceType,
            deviceName,
            browser,
            deviceInfo.browserVersion,
            osName,
            ipAddress,
            mergedUserAgent,
            new Date(),
            'active'
        ]
    );
}

function parsePositiveInt(raw, fallback, min = 1, max = 1000) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function normalizeDateTime(raw, endOfDay = false) {
    if (!raw) return null;
    const text = String(raw).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return endOfDay ? `${text}T23:59:59.999Z` : `${text}T00:00:00.000Z`;
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function auditDeviceFromRequest(req, fallback = 'Web') {
    const clientPlatform = String(req.headers['x-client-platform'] || '').trim();
    const networkType = String(req.headers['x-network-type'] || '').trim();
    const base = clientPlatform || fallback;
    return networkType ? `${base} (${networkType})` : base;
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

async function verifyLineIdentity({ authorizationCode, redirectUri, accessToken, idToken }) {
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
        throw new Error('LINE_CHANNEL_ID / LINE_CHANNEL_SECRET is not configured on server');
    }

    let lineAccessToken = accessToken || '';
    let lineIdToken = idToken || '';

    if (authorizationCode) {
        const configuredRedirectUri = String(LINE_REDIRECT_URI || '').trim();
        const clientRedirectUri = String(redirectUri || '').trim();
        const effectiveRedirectUri = clientRedirectUri || configuredRedirectUri;
        if (!effectiveRedirectUri) {
            throw new Error('LINE redirect URI is missing');
        }
        if (configuredRedirectUri && clientRedirectUri && configuredRedirectUri !== clientRedirectUri) {
            throw new Error(
                `LINE redirect URI mismatch (server='${configuredRedirectUri}' client='${clientRedirectUri}')`
            );
        }

        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: String(authorizationCode),
            redirect_uri: effectiveRedirectUri,
            client_id: LINE_CHANNEL_ID,
            client_secret: LINE_CHANNEL_SECRET
        });

        const tokenResp = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenBody.toString()
        });
        const tokenData = await tokenResp.json().catch(() => ({}));
        if (!tokenResp.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'LINE token exchange failed');
        }

        lineAccessToken = String(tokenData.access_token || '');
        lineIdToken = String(tokenData.id_token || lineIdToken || '');
    }

    if (!lineAccessToken && !lineIdToken) {
        throw new Error('Missing LINE access token or authorization code');
    }

    let verified = {};
    if (lineIdToken) {
        const verifyBody = new URLSearchParams({
            id_token: lineIdToken,
            client_id: LINE_CHANNEL_ID
        });
        const verifyResp = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyBody.toString()
        });
        verified = await verifyResp.json().catch(() => ({}));
        if (!verifyResp.ok) {
            throw new Error((verified && (verified.error_description || verified.error)) || 'LINE id_token verify failed');
        }
    }

    let profile = {};
    if (lineAccessToken) {
        const profileResp = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${lineAccessToken}` }
        });
        profile = await profileResp.json().catch(() => ({}));
        if (!profileResp.ok) {
            throw new Error((profile && (profile.message || profile.error_description || profile.error)) || 'LINE profile fetch failed');
        }
    }

    const providerUserId = String(verified.sub || profile.userId || '').trim();
    if (!providerUserId) {
        throw new Error('Unable to resolve LINE user id');
    }

    return {
        providerUserId,
        email: normalizeEmail(verified.email || ''),
        name: (verified.name || profile.displayName || 'LINE User'),
        avatar: verified.picture || profile.pictureUrl || null
    };
}

async function getMicrosoftJwks() {
    const now = Date.now();
    if (microsoftJwksCache.keys.length > 0 && now - microsoftJwksCache.fetchedAt < MICROSOFT_JWKS_CACHE_MS) {
        return microsoftJwksCache.keys;
    }

    const jwkSet = await httpsGetJson('https://login.microsoftonline.com/common/discovery/v2.0/keys');
    const keys = Array.isArray(jwkSet.keys) ? jwkSet.keys : [];
    if (!keys.length) {
        throw new Error('Unable to load Microsoft public keys');
    }

    microsoftJwksCache = { fetchedAt: now, keys };
    return keys;
}

async function verifyMicrosoftIdentity({ authorizationCode, redirectUri, accessToken, idToken }) {
    if (!MICROSOFT_CLIENT_ID) {
        throw new Error('MICROSOFT_CLIENT_ID is not configured on server');
    }

    let msAccessToken = accessToken || '';
    let msIdToken = idToken || '';

    if (authorizationCode) {
        const configuredRedirectUri = String(MICROSOFT_REDIRECT_URI || '').trim();
        const clientRedirectUri = String(redirectUri || '').trim();
        const effectiveRedirectUri = clientRedirectUri || configuredRedirectUri;
        if (!effectiveRedirectUri) {
            throw new Error('Microsoft redirect URI is missing');
        }
        if (configuredRedirectUri && clientRedirectUri && configuredRedirectUri !== clientRedirectUri) {
            throw new Error(
                `Microsoft redirect URI mismatch (server='${configuredRedirectUri}' client='${clientRedirectUri}')`
            );
        }

        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: String(authorizationCode),
            client_id: MICROSOFT_CLIENT_ID,
            redirect_uri: effectiveRedirectUri,
            scope: 'openid profile email User.Read'
        });
        if (MICROSOFT_CLIENT_SECRET) {
            tokenBody.set('client_secret', MICROSOFT_CLIENT_SECRET);
        }

        const tokenResp = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenBody.toString()
        });
        const tokenData = await tokenResp.json().catch(() => ({}));
        if (!tokenResp.ok || !(tokenData.id_token || tokenData.access_token)) {
            throw new Error(tokenData.error_description || tokenData.error || 'Microsoft token exchange failed');
        }

        msAccessToken = String(tokenData.access_token || msAccessToken || '');
        msIdToken = String(tokenData.id_token || msIdToken || '');
    }

    if (!msIdToken && !msAccessToken) {
        throw new Error('Missing Microsoft token or authorization code');
    }

    let verified = {};
    if (msIdToken) {
        const jwtParts = msIdToken.split('.');
        if (jwtParts.length !== 3) {
            throw new Error('Invalid Microsoft token format');
        }
        const header = decodeJwtPart(jwtParts[0]);
        const keys = await getMicrosoftJwks();
        const jwk = keys.find((item) => item.kid === header.kid);
        if (!jwk) {
            throw new Error('Microsoft public key not found for token');
        }

        const msKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
        verified = jwt.verify(msIdToken, msKey, {
            algorithms: ['RS256'],
            audience: MICROSOFT_CLIENT_ID
        });
    }

    let profile = {};
    if (msAccessToken) {
        const profileResp = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
            headers: { Authorization: `Bearer ${msAccessToken}` }
        });
        profile = await profileResp.json().catch(() => ({}));
        if (!profileResp.ok) {
            throw new Error((profile && (profile.error?.message || profile.error_description || profile.error)) || 'Microsoft profile fetch failed');
        }
    }

    const providerUserId = String(verified.oid || verified.sub || profile.id || '').trim();
    if (!providerUserId) {
        throw new Error('Unable to resolve Microsoft user id');
    }

    return {
        providerUserId,
        email: normalizeEmail(verified.preferred_username || verified.email || profile.mail || profile.userPrincipalName || ''),
        name: (verified.name || profile.displayName || 'Microsoft User'),
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
            await logAudit(email, 'LOGIN_ATTEMPT', auditDeviceFromRequest(req, 'Web'), 'FAILED', 'User not found');
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            await logAudit(user.name, 'LOGIN', auditDeviceFromRequest(req, 'Web'), 'FAILED', 'Incorrect password');
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await logAudit(user.name, 'LOGIN', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', 'User logged in successfully');

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
        const message = String(err?.message || '');
        if (message.toLowerCase().includes('database is unavailable') || message.toLowerCase().includes('temporarily unavailable')) {
            return res.status(503).json({ error: 'Login service is temporarily unavailable. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
};

app.post('/api/auth/login', handleLogin);

app.post('/api/auth/social', async (req, res) => {
    const {
        provider,
        idToken,
        accessToken,
        authorizationCode,
        redirectUri,
        email,
        name,
        avatar // Accepted from client for mock/simulated flows
    } = req.body || {};

    const normalizedProvider = String(provider || '').trim().toLowerCase();
    if (!['google', 'facebook', 'apple', 'line', 'microsoft'].includes(normalizedProvider)) {
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
                verifiedProfile = await verifyLineIdentity({
                    authorizationCode,
                    redirectUri,
                    accessToken,
                    idToken
                });
            } else if (normalizedProvider === 'microsoft') {
                verifiedProfile = await verifyMicrosoftIdentity({
                    authorizationCode,
                    redirectUri,
                    accessToken,
                    idToken
                });
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
            auditDeviceFromRequest(req, normalizedProvider.toUpperCase()),
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
            auditDeviceFromRequest(req, normalizedProvider.toUpperCase() || 'UNKNOWN'),
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
        logAudit(user ? user.name : 'Unknown', 'LOGOUT', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', 'User logged out');

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SECURE ROUTES BELOW ---
// Tenant middleware: verify JWT and set DB session context (for MSSQL RLS)
const authTenant = require('./middleware/authTenant')(db);
app.use(authTenant);

function requireAdmin(req, res, next) {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin permission required' });
    }
    return next();
}

function maskContact(value) {
    const text = String(value || '');
    if (!text) return '';
    const at = text.indexOf('@');
    if (at > 1) {
        return `${text.slice(0, 2)}***${text.slice(at)}`;
    }
    if (text.length <= 4) return `${text[0] || '*'}***`;
    return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function normalizeChatStatus(value) {
    const allowed = new Set(['open', 'waiting', 'closed']);
    const normalized = String(value || '').trim().toLowerCase();
    return allowed.has(normalized) ? normalized : 'open';
}

function normalizeChatPriority(value) {
    const allowed = new Set(['low', 'normal', 'high', 'urgent']);
    const normalized = String(value || '').trim().toLowerCase();
    return allowed.has(normalized) ? normalized : 'normal';
}

function safeChatSenderName(sender) {
    const senderRole = String(sender?.role || '').toLowerCase();
    if (senderRole === 'admin') {
        return 'Admin nat';
    }
    const baseName = String(sender?.name || sender?.email || '').trim();
    return baseName || 'Customer';
}

function formatAuditTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const CHAT_TYPING_TTL_MS = 7000;
const chatTypingState = new Map();

function getChatTypingSnapshot(threadId) {
    const raw = chatTypingState.get(Number(threadId)) || {};
    const now = Date.now();
    const snapshot = {};

    for (const role of ['user', 'admin']) {
        const entry = raw[role];
        if (entry && entry.expiresAt > now) {
            snapshot[role] = entry;
        }
    }

    if (!snapshot.user && !snapshot.admin) {
        chatTypingState.delete(Number(threadId));
        return {};
    }

    chatTypingState.set(Number(threadId), snapshot);
    return snapshot;
}

function setChatTypingState(threadId, role, payload) {
    const normalizedThreadId = Number(threadId);
    const current = getChatTypingSnapshot(normalizedThreadId);
    const next = { ...current };

    if (!payload) {
        delete next[role];
    } else {
        next[role] = payload;
    }

    if (!next.user && !next.admin) {
        chatTypingState.delete(normalizedThreadId);
        return;
    }

    chatTypingState.set(normalizedThreadId, next);
}

function buildChatAuditDetail(date, text) {
    return `${formatAuditTimestamp(date)} auto: ${text}`;
}

function mapChatThread(row) {
    if (!row) return null;
    return {
        id: row.id,
        customer_user_id: row.customer_user_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        subject: row.subject,
        status: row.status,
        priority: row.priority,
        assigned_admin_id: row.assigned_admin_id,
        assigned_admin_name: row.assigned_admin_name,
        is_archived: Boolean(row.is_archived),
        is_pinned: Boolean(row.is_pinned),
        last_message_at: row.last_message_at,
        last_message_preview: row.last_message_preview,
        last_message_sender_role: row.last_message_sender_role || null,
        last_message_sender_name: row.last_message_sender_name || null,
        customer_unread_count: Number(row.customer_unread_count || 0),
        admin_unread_count: Number(row.admin_unread_count || 0),
        customer_last_read_at: row.customer_last_read_at,
        admin_last_read_at: row.admin_last_read_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        closed_at: row.closed_at,
    };
}

function mapChatMessage(row) {
    if (!row) return null;
    return {
        id: row.id,
        thread_id: row.thread_id,
        sender_user_id: row.sender_user_id,
        sender_name: row.sender_name,
        sender_role: row.sender_role,
        message_type: row.message_type,
        body: row.body,
        attachment_name: row.attachment_name,
        attachment_url: row.attachment_url,
        reply_to_message_id: row.reply_to_message_id,
        edited_at: row.edited_at,
        deleted_at: row.deleted_at,
        created_at: row.created_at,
    };
}

async function ensureChatThreadForUser(user) {
    const userId = user?.id;
    if (!userId) {
        throw new Error('User id is required for chat');
    }

    const normalizedEmail = normalizeEmail(user?.email || '');
    const normalizedName = String(user?.name || '').trim();
    const normalizedPhone = String(user?.phone || '').trim() || null;

    const existing = normalizedEmail
        ? await db.get(
            `SELECT TOP 1 *
             FROM chat_threads
             WHERE customer_user_id = ?
                OR LOWER(customer_email) = ?
             ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC`,
            [userId, normalizedEmail]
        )
        : await db.get(
            `SELECT TOP 1 *
             FROM chat_threads
             WHERE customer_user_id = ?
             ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC`,
            [userId]
        );

    if (existing) {
        const nextName = normalizedName || existing.customer_name;
        const nextEmail = normalizedEmail || existing.customer_email;
        const nextPhone = normalizedPhone || existing.customer_phone || null;
        const shouldRefreshIdentity =
            String(existing.customer_user_id) !== String(userId) ||
            String(existing.customer_name || '') !== String(nextName || '') ||
            String(existing.customer_email || '').toLowerCase() !== String(nextEmail || '').toLowerCase() ||
            String(existing.customer_phone || '') !== String(nextPhone || '');

        if (shouldRefreshIdentity) {
            await db.run(
                `UPDATE chat_threads
                 SET customer_user_id = ?,
                     customer_name = ?,
                     customer_email = ?,
                     customer_phone = ?,
                     updated_at = ?
                 WHERE id = ?`,
                [userId, nextName, nextEmail, nextPhone, new Date(), existing.id]
            );
            const refreshed = await db.get("SELECT * FROM chat_threads WHERE id = ?", [existing.id]);
            return mapChatThread(refreshed);
        }

        return mapChatThread(existing);
    }

    const dbUser = await db.get(
        "SELECT id, name, email, phone FROM users WHERE id = ?",
        [userId]
    );

    const customerName =
        String(user?.name || dbUser?.name || user?.email || dbUser?.email || `User ${userId}`).trim();
    const customerEmail =
        String(user?.email || dbUser?.email || `user${userId}@local.chat`).trim().toLowerCase();
    const customerPhone = user?.phone || dbUser?.phone || null;

    const now = new Date();
    const subject = `Support for ${customerName}`;
    const created = await db.run(
        `INSERT INTO chat_threads (
            customer_user_id, customer_name, customer_email, customer_phone, subject,
            status, priority, last_message_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'open', 'normal', ?, ?, ?)`,
        [userId, customerName, customerEmail, customerPhone, subject, now, now, now]
    );

    const thread = await db.get("SELECT * FROM chat_threads WHERE id = ?", [created.id]);
    return mapChatThread(thread);
}

async function loadRelatedThreadsForUser(user, primaryThread = null) {
    const userId = user?.id;
    const normalizedEmail = normalizeEmail(user?.email || primaryThread?.customer_email || '');

    const rows = normalizedEmail
        ? await db.all(
            `SELECT *
             FROM chat_threads
             WHERE customer_user_id = ?
                OR LOWER(customer_email) = ?
             ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC`,
            [userId, normalizedEmail]
        )
        : await db.all(
            `SELECT *
             FROM chat_threads
             WHERE customer_user_id = ?
             ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC`,
            [userId]
        );

    const seen = new Set();
    const uniqueRows = rows.filter((row) => {
        const key = Number(row?.id || 0);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (primaryThread && !seen.has(Number(primaryThread.id))) {
        uniqueRows.unshift(primaryThread);
    }

    return uniqueRows;
}

async function getChatThreadForRequest(threadId, req) {
    const thread = await db.get("SELECT * FROM chat_threads WHERE id = ?", [threadId]);
    if (!thread) return null;
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
    if (isAdmin) return thread;
    if (String(thread.customer_user_id) !== String(req.user?.id || '')) {
        return null;
    }
    return thread;
}

async function appendChatMessage({ threadId, sender, body, messageType = 'text', replyToMessageId = null, attachmentName = null, attachmentUrl = null }) {
    const now = new Date();
    const preview = String(body || attachmentName || '').trim().slice(0, 400) || '[attachment]';
    const senderRole = String(sender.role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
    const isAdminMessage = senderRole === 'admin';

    const result = await db.run(
        `INSERT INTO chat_messages (
            thread_id, sender_user_id, sender_name, sender_role, message_type, body,
            attachment_name, attachment_url, reply_to_message_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            threadId,
            sender.id,
            safeChatSenderName(sender),
            senderRole,
            messageType,
            body || null,
            attachmentName,
            attachmentUrl,
            replyToMessageId,
            now,
        ]
    );

    await db.run(
        `UPDATE chat_threads
         SET last_message_at = ?,
             last_message_preview = ?,
             updated_at = ?,
             status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
             admin_unread_count = CASE WHEN ? = 1 THEN admin_unread_count ELSE admin_unread_count + 1 END,
             customer_unread_count = CASE WHEN ? = 1 THEN customer_unread_count + 1 ELSE customer_unread_count END
         WHERE id = ?`,
        [now, preview, now, isAdminMessage ? 1 : 0, isAdminMessage ? 1 : 0, threadId]
    );

    const createdMessage = await db.get("SELECT * FROM chat_messages WHERE id = ?", [result.id]);
    return mapChatMessage(createdMessage);
}

async function loadChatThreadMessages(threadId, limit = 500, options = {}) {
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 500));
    const where = ['thread_id = ?'];
    const params = [threadId];

    if (options.startDate) {
        where.push('created_at >= ?');
        params.push(options.startDate);
    }
    if (options.endDate) {
        where.push('created_at <= ?');
        params.push(options.endDate);
    }

    const rows = await db.all(
        `SELECT *
         FROM chat_messages
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`,
        params
    );
    return rows.reverse().map(mapChatMessage);
}

async function loadChatMessagesForThreadIds(threadIds, limit = 500, options = {}) {
    const uniqueThreadIds = Array.from(new Set((threadIds || []).map((id) => Number(id)).filter((id) => id > 0)));
    if (uniqueThreadIds.length === 0) return [];

    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 500));
    const placeholders = uniqueThreadIds.map(() => '?').join(', ');
    const where = [`thread_id IN (${placeholders})`];
    const params = [...uniqueThreadIds];

    if (options.startDate) {
        where.push('created_at >= ?');
        params.push(options.startDate);
    }
    if (options.endDate) {
        where.push('created_at <= ?');
        params.push(options.endDate);
    }

    const rows = await db.all(
        `SELECT *
         FROM chat_messages
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`,
        params
    );

    return rows.reverse().map(mapChatMessage);
}

// --- Chat APIs ---
app.get('/api/chat/thread/me', async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
        const thread = await ensureChatThreadForUser(req.user);
        const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
        const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;
        const relatedThreads = await loadRelatedThreadsForUser(req.user, thread);
        const messages = await loadChatMessagesForThreadIds(
            relatedThreads.map((item) => item.id),
            req.query.limit,
            {
                startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
                endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
            }
        );
        res.json({ thread, messages });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load chat thread' });
    }
});

app.get('/api/chat/threads', async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        const mine = String(req.query.mine || '').toLowerCase() === 'true';
        const unread = String(req.query.unread || '').toLowerCase() === 'true';
        const archived = String(req.query.archived || '').toLowerCase() === 'true';
        const q = String(req.query.q || '').trim();
        const status = req.query.status ? normalizeChatStatus(req.query.status) : '';

        const where = [];
        const params = [];

        if (isAdmin) {
            where.push('t.is_archived = ?');
            params.push(archived);
            if (mine) {
                where.push('t.assigned_admin_id = ?');
                params.push(req.user.id);
            }
            if (unread) {
                where.push('t.admin_unread_count > 0');
            }
            if (status) {
                where.push('t.status = ?');
                params.push(status);
            }
            if (q) {
                where.push('(t.customer_name LIKE ? OR t.customer_email LIKE ? OR t.last_message_preview LIKE ?)');
                params.push(`%${q}%`, `%${q}%`, `%${q}%`);
            }
        } else {
            where.push('t.customer_user_id = ?');
            params.push(req.user.id);
        }

        const sql = `
            SELECT
                t.*,
                lm.sender_role AS last_message_sender_role,
                lm.sender_name AS last_message_sender_name
            FROM chat_threads t
            OUTER APPLY (
                SELECT TOP 1 sender_role, sender_name
                FROM chat_messages
                WHERE thread_id = t.id
                ORDER BY created_at DESC, id DESC
            ) lm
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY t.is_pinned DESC, t.last_message_at DESC, t.id DESC
        `;
        const rows = await db.all(sql, params);
        res.json(rows.map(mapChatThread));
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load chat inbox' });
    }
});

app.get('/api/chat/threads/:threadId/messages', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
        const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;

        const messages = await loadChatThreadMessages(threadId, req.query.limit, {
            startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
            endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
        });
        if (startDate || endDate) {
            const actorName = String(req.user?.role || '').toLowerCase() === 'admin' ? 'Admin nat' : (req.user?.name || 'Customer');
            const rangeStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString().slice(0, 16).replace('T', ' ') : 'start';
            const rangeEnd = endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString().slice(0, 16).replace('T', ' ') : 'now';
            await logAudit(actorName, 'CHAT_HISTORY_FILTER', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(new Date(), `view history chat #${threadId} from ${rangeStart} to ${rangeEnd}`));
        }
        res.json({ thread: mapChatThread(thread), messages });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load chat messages' });
    }
});

app.post('/api/chat/threads/:threadId/messages', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        if (!isAdmin && String(thread.status || '').toLowerCase() === 'closed') {
            return res.status(403).json({ error: 'This case is closed and is now read-only' });
        }

        const body = String(req.body?.body || '').trim();
        if (!body) return res.status(400).json({ error: 'Message body is required' });

        const message = await appendChatMessage({
            threadId,
            sender: req.user,
            body,
            messageType: 'text',
            replyToMessageId: req.body?.reply_to_message_id || null,
        });

        const actorName = isAdmin ? 'Admin nat' : (req.user?.name || 'Customer');
        await logAudit(actorName, 'CHAT_SEND', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(new Date(), `send message chat #${threadId}`));
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to send chat message' });
    }
});

app.post('/api/chat/threads/:threadId/typing', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const senderRole = String(req.user?.role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
        const isTyping = Boolean(req.body?.is_typing);

        if (isTyping) {
            setChatTypingState(threadId, senderRole, {
                sender_name: safeChatSenderName(req.user),
                sender_role: senderRole,
                expiresAt: Date.now() + CHAT_TYPING_TTL_MS,
            });
        } else {
            setChatTypingState(threadId, senderRole, null);
        }

        const snapshot = getChatTypingSnapshot(threadId);
        res.json({
            success: true,
            admin_typing: Boolean(snapshot.admin),
            admin_name: snapshot.admin?.sender_name || null,
            user_typing: Boolean(snapshot.user),
            user_name: snapshot.user?.sender_name || null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update typing state' });
    }
});

app.get('/api/chat/threads/:threadId/typing', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const snapshot = getChatTypingSnapshot(threadId);
        res.json({
            admin_typing: Boolean(snapshot.admin),
            admin_name: snapshot.admin?.sender_name || null,
            user_typing: Boolean(snapshot.user),
            user_name: snapshot.user?.sender_name || null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load typing state' });
    }
});

app.post('/api/chat/threads/:threadId/read', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        const now = new Date();
        if (isAdmin) {
            await db.run(
                "UPDATE chat_threads SET admin_unread_count = 0, admin_last_read_at = ?, updated_at = ? WHERE id = ?",
                [now, now, threadId]
            );
        } else {
            await db.run(
                "UPDATE chat_threads SET customer_unread_count = 0, customer_last_read_at = ?, updated_at = ? WHERE id = ?",
                [now, now, threadId]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to mark chat as read' });
    }
});

app.post('/api/chat/threads/:threadId/meta', requireAdmin, async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await db.get("SELECT * FROM chat_threads WHERE id = ?", [threadId]);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const status = req.body?.status ? normalizeChatStatus(req.body.status) : thread.status;
        const priority = req.body?.priority ? normalizeChatPriority(req.body.priority) : (thread.priority || 'normal');
        const isArchived = req.body?.is_archived === undefined ? Boolean(thread.is_archived) : Boolean(req.body.is_archived);
        const isPinned = req.body?.is_pinned === undefined ? Boolean(thread.is_pinned) : Boolean(req.body.is_pinned);
        const assignedAdminId = req.body?.assigned_admin_id === undefined || req.body?.assigned_admin_id === null || req.body?.assigned_admin_id === ''
            ? null
            : Number(req.body.assigned_admin_id);

        let assignedAdminName = null;
        if (assignedAdminId) {
            const assignedAdmin = await db.get("SELECT id, name FROM users WHERE id = ? AND role = 'admin'", [assignedAdminId]);
            if (!assignedAdmin) return res.status(404).json({ error: 'Assigned admin not found' });
            assignedAdminName = assignedAdmin.name;
        }

        const now = new Date();
        await db.run(
            `UPDATE chat_threads
             SET status = ?, priority = ?, is_archived = ?, is_pinned = ?, assigned_admin_id = ?, assigned_admin_name = ?, updated_at = ?, closed_at = ?
             WHERE id = ?`,
            [status, priority, isArchived, isPinned, assignedAdminId, assignedAdminName, now, status === 'closed' ? now : null, threadId]
        );

        const updated = await db.get("SELECT * FROM chat_threads WHERE id = ?", [threadId]);
        const changeLog = [];
        if (status !== thread.status) {
            changeLog.push(status === 'closed' ? `close case chat #${threadId} by Admin nat` : `set status ${status} for chat #${threadId} by Admin nat`);
        }
        if (Boolean(isPinned) !== Boolean(thread.is_pinned)) {
            changeLog.push(`${isPinned ? 'pin' : 'unpin'} chat #${threadId} by Admin nat`);
        }
        if (Boolean(isArchived) !== Boolean(thread.is_archived)) {
            changeLog.push(`${isArchived ? 'archive' : 'restore'} chat #${threadId} by Admin nat`);
        }
        if (String(assignedAdminId || '') !== String(thread.assigned_admin_id || '')) {
            changeLog.push(`assign chat #${threadId} to ${assignedAdminName || 'unassigned'} by Admin nat`);
        }
        if (priority !== thread.priority) {
            changeLog.push(`set priority ${priority} for chat #${threadId} by Admin nat`);
        }
        for (const detail of changeLog) {
            await logAudit('Admin nat', 'CHAT_META', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(now, detail));
        }
        res.json({ success: true, thread: mapChatThread(updated) });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update chat thread' });
    }
});

app.post('/api/chat/threads/:threadId/delete', requireAdmin, async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });

        const thread = await db.get("SELECT * FROM chat_threads WHERE id = ?", [threadId]);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const now = new Date();
        await db.run("DELETE FROM chat_messages WHERE thread_id = ?", [threadId]);
        await db.run("DELETE FROM chat_threads WHERE id = ?", [threadId]);
        await logAudit('Admin nat', 'CHAT_DELETE', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(now, `delete chat #${threadId} by Admin nat`));

        res.json({ success: true, threadId });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete chat thread' });
    }
});

app.put('/api/chat/messages/:messageId', async (req, res) => {
    try {
        const messageId = parsePositiveInt(req.params.messageId, 0);
        if (!messageId) return res.status(400).json({ error: 'Invalid message id' });
        const nextBody = String(req.body?.body || '').trim();
        if (!nextBody) return res.status(400).json({ error: 'Message body is required' });

        const message = await db.get("SELECT * FROM chat_messages WHERE id = ?", [messageId]);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        const thread = await getChatThreadForRequest(message.thread_id, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        if (!isAdmin && String(thread.status || '').toLowerCase() === 'closed') {
            return res.status(403).json({ error: 'This case is closed and is now read-only' });
        }
        if (!isAdmin && String(message.sender_user_id) !== String(req.user?.id || '')) {
            return res.status(403).json({ error: 'Cannot edit this message' });
        }

        await db.run(
            "UPDATE chat_messages SET body = ?, edited_at = ? WHERE id = ?",
            [nextBody, new Date(), messageId]
        );
        if (Number(messageId) === Number((await db.get("SELECT TOP 1 id FROM chat_messages WHERE thread_id = ? ORDER BY created_at DESC, id DESC", [message.thread_id]))?.id)) {
            await db.run(
                "UPDATE chat_threads SET last_message_preview = ?, updated_at = ? WHERE id = ?",
                [nextBody.slice(0, 400), new Date(), message.thread_id]
            );
        }
        const updated = await db.get("SELECT * FROM chat_messages WHERE id = ?", [messageId]);
        const actorName = isAdmin ? 'Admin nat' : (req.user?.name || 'Customer');
        await logAudit(actorName, 'CHAT_EDIT', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(new Date(), `edit message #${messageId} in chat #${message.thread_id}`));
        res.json({ success: true, message: mapChatMessage(updated) });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to edit message' });
    }
});

app.post('/api/chat/messages/:messageId/delete', async (req, res) => {
    try {
        const messageId = parsePositiveInt(req.params.messageId, 0);
        if (!messageId) return res.status(400).json({ error: 'Invalid message id' });
        const message = await db.get("SELECT * FROM chat_messages WHERE id = ?", [messageId]);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        const thread = await getChatThreadForRequest(message.thread_id, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
        if (!isAdmin && String(thread.status || '').toLowerCase() === 'closed') {
            return res.status(403).json({ error: 'This case is closed and is now read-only' });
        }
        if (!isAdmin && String(message.sender_user_id) !== String(req.user?.id || '')) {
            return res.status(403).json({ error: 'Cannot delete this message' });
        }

        await db.run(
            "UPDATE chat_messages SET body = ?, deleted_at = ? WHERE id = ?",
            ['This message was deleted', new Date(), messageId]
        );
        const updated = await db.get("SELECT * FROM chat_messages WHERE id = ?", [messageId]);
        const actorName = isAdmin ? 'Admin nat' : (req.user?.name || 'Customer');
        await logAudit(actorName, 'CHAT_DELETE', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(new Date(), `delete message #${messageId} in chat #${message.thread_id}`));
        res.json({ success: true, message: mapChatMessage(updated) });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete message' });
    }
});

app.post('/api/chat/threads/:threadId/export-log', async (req, res) => {
    try {
        const threadId = parsePositiveInt(req.params.threadId, 0);
        if (!threadId) return res.status(400).json({ error: 'Invalid thread id' });
        const thread = await getChatThreadForRequest(threadId, req);
        if (!thread) return res.status(404).json({ error: 'Chat thread not found' });

        const format = String(req.body?.format || 'txt').toLowerCase();
        const actorName = String(req.user?.role || '').toLowerCase() === 'admin' ? 'Admin nat' : (req.user?.name || 'Customer');
        await logAudit(actorName, 'CHAT_EXPORT', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', buildChatAuditDetail(new Date(), `export transcript chat #${threadId} (${format})`));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to log export event' });
    }
});

app.get('/api/chat/unread-summary', async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';

        if (isAdmin) {
            const row = await db.get("SELECT COUNT(*) AS threads, COALESCE(SUM(admin_unread_count), 0) AS messages FROM chat_threads WHERE admin_unread_count > 0 AND is_archived = false");
            return res.json({
                unread_threads: Number(row?.threads || 0),
                unread_messages: Number(row?.messages || 0),
            });
        }

        const thread = await ensureChatThreadForUser(req.user);
        return res.json({
            unread_threads: Number(thread?.customer_unread_count > 0 ? 1 : 0),
            unread_messages: Number(thread?.customer_unread_count || 0),
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load unread summary' });
    }
});

// --- Device APIs (for logged-in users) ---
app.get('/api/devices/my', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const devices = await db.all(`
            SELECT id, user_id, user_email, device_id, device_name, location, pairing_code, status, created_at, paired_at, last_seen, is_primary, updated_at
            FROM device_pairings
            WHERE user_id = ?
            ORDER BY is_primary DESC, paired_at DESC
        `, [userId]);

        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/devices/primary', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userName = req.user?.name || 'Unknown';
        const deviceIdRaw = String(req.body?.device_id || '').trim();
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!deviceIdRaw) return res.status(400).json({ error: 'device_id is required' });

        const deviceId = deviceIdRaw.toUpperCase();
        const existing = await db.get(
            "SELECT id FROM device_pairings WHERE user_id = ? AND device_id = ?",
            [userId, deviceId]
        );
        if (!existing) return res.status(404).json({ error: 'Device not found for user' });

        await db.run("UPDATE device_pairings SET is_primary = false WHERE user_id = ?", [userId]);
        await db.run(
            "UPDATE device_pairings SET is_primary = true, updated_at = ? WHERE user_id = ? AND device_id = ?",
            [new Date(), userId, deviceId]
        );

        await logAudit(userName, 'DEVICE_PRIMARY', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', `device_id=${deviceId}`);
        res.json({ success: true, device_id: deviceId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/devices/pair', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userName = req.user?.name || 'Unknown';
        const userEmail = req.user?.email || null;
        const deviceIdRaw = String(req.body?.device_id || '').trim();
        const pairingCodeRaw = String(req.body?.pairing_code || '').trim();
        const deviceName = String(req.body?.device_name || '').trim() || null;
        const location = String(req.body?.location || '').trim() || null;
        const requestPrimary = Boolean(req.body?.is_primary);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!deviceIdRaw) {
            return res.status(400).json({ error: 'device_id is required' });
        }
        if (!pairingCodeRaw) {
            return res.status(400).json({ error: 'pairing_code is required' });
        }

        const deviceId = deviceIdRaw.toUpperCase();
        const pairingCode = pairingCodeRaw;

        const existing = await db.get(
            "SELECT id, user_id FROM device_pairings WHERE device_id = ?",
            [deviceId]
        );

        if (existing && String(existing.user_id) !== String(userId)) {
            await logAudit(userName, 'DEVICE_PAIR', auditDeviceFromRequest(req, 'Web'), 'FAILED', `device_id=${deviceId} already claimed`);
            return res.status(409).json({ error: 'Device already claimed by another account' });
        }

        // Determine primary flag: if user has no devices, make this primary by default
        const existingPrimary = await db.get(
            "SELECT TOP 1 id FROM device_pairings WHERE user_id = ? AND is_primary = true",
            [userId]
        );
        const shouldBePrimary = requestPrimary || !existingPrimary;

        if (shouldBePrimary) {
            await db.run(
                "UPDATE device_pairings SET is_primary = false WHERE user_id = ?",
                [userId]
            );
        }

        if (existing) {
            await db.run(
                `UPDATE device_pairings 
                 SET pairing_code = ?, status = 'paired', paired_at = ?, user_email = ?, device_name = ?, location = ?, is_primary = ?, updated_at = ?
                 WHERE id = ?`,
                [pairingCode, new Date(), userEmail, deviceName, location, shouldBePrimary, new Date(), existing.id]
            );
        } else {
            await db.run(
                `INSERT INTO device_pairings (user_id, user_email, device_id, device_name, location, pairing_code, status, paired_at, is_primary, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'paired', ?, ?, ?)`,
                [userId, userEmail, deviceId, deviceName, location, pairingCode, new Date(), shouldBePrimary, new Date()]
            );
        }

        await logAudit(userName, 'DEVICE_PAIR', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', `device_id=${deviceId}`);
        res.json({ success: true, device_id: deviceId, is_primary: shouldBePrimary });
    } catch (err) {
        console.error('Device pairing error:', err);
        res.status(500).json({ error: err.message || 'Failed to pair device' });
    }
});

app.post('/api/devices/update', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userName = req.user?.name || 'Unknown';
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const deviceIdRaw = String(req.body?.device_id || '').trim();
        if (!deviceIdRaw) return res.status(400).json({ error: 'device_id is required' });
        const deviceId = deviceIdRaw.toUpperCase();

        const deviceName = String(req.body?.device_name || '').trim();
        const location = String(req.body?.location || '').trim();

        const existing = await db.get(
            "SELECT id FROM device_pairings WHERE user_id = ? AND device_id = ?",
            [userId, deviceId]
        );
        if (!existing) return res.status(404).json({ error: 'Device not found for user' });

        await db.run(
            "UPDATE device_pairings SET device_name = ?, location = ?, updated_at = ? WHERE user_id = ? AND device_id = ?",
            [deviceName || null, location || null, new Date(), userId, deviceId]
        );

        await logAudit(userName, 'DEVICE_UPDATE', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', `device_id=${deviceId}`);
        res.json({ success: true, device_id: deviceId });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update device' });
    }
});

app.post('/api/devices/unpair', async (req, res) => {
    try {
        const userId = req.user?.id;
        const userName = req.user?.name || 'Unknown';
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const deviceIdRaw = String(req.body?.device_id || '').trim();
        if (!deviceIdRaw) return res.status(400).json({ error: 'device_id is required' });
        const deviceId = deviceIdRaw.toUpperCase();

        const existing = await db.get(
            "SELECT id FROM device_pairings WHERE user_id = ? AND device_id = ?",
            [userId, deviceId]
        );
        if (!existing) return res.status(404).json({ error: 'Device not found for user' });

        await db.run("DELETE FROM device_pairings WHERE user_id = ? AND device_id = ?", [userId, deviceId]);

        await logAudit(userName, 'DEVICE_UNPAIR', auditDeviceFromRequest(req, 'Web'), 'SUCCESS', `device_id=${deviceId}`);
        res.json({ success: true, device_id: deviceId });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to unpair device' });
    }
});

app.get('/api/admin/db/summary', requireAdmin, async (req, res) => {
    try {
        const [usersCount, loginCount, sensorCount, auditCount, otpCount] = await Promise.all([
            db.get('SELECT COUNT(*) AS total FROM users'),
            db.get('SELECT COUNT(*) AS total FROM login_sessions'),
            db.get('SELECT COUNT(*) AS total FROM sensor_data'),
            db.get('SELECT COUNT(*) AS total FROM audit_logs'),
            db.get('SELECT COUNT(*) AS total FROM otp_codes')
        ]);

        res.json({
            users: Number(usersCount?.total || 0),
            login_sessions: Number(loginCount?.total || 0),
            sensor_data: Number(sensorCount?.total || 0),
            audit_logs: Number(auditCount?.total || 0),
            otp_codes: Number(otpCount?.total || 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/users', requireAdmin, async (req, res) => {
    try {
        const limit = parsePositiveInt(req.query.limit, 300, 1, 1000);
        const q = String(req.query.q || '').trim();
        const role = String(req.query.role || '').trim();
        const startDate = normalizeDateTime(req.query.startDate, false);
        const endDate = normalizeDateTime(req.query.endDate, true);

        const where = [];
        const params = [];
        if (q) {
            where.push('(CAST(id AS NVARCHAR(50)) LIKE ? OR name LIKE ? OR email LIKE ? OR role LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (role) {
            where.push('role = ?');
            params.push(role);
        }
        if (startDate) {
            where.push('created_at >= ?');
            params.push(startDate);
        }
        if (endDate) {
            where.push('created_at <= ?');
            params.push(endDate);
        }

        const users = await db.all(`
            SELECT TOP ${limit} id, name, email, role, location, title, created_at
            FROM users
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY created_at DESC
        `, params);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/users/:id/details', requireAdmin, async (req, res) => {
    try {
        const userId = String(req.params.id);
        const limit = parsePositiveInt(req.query.limit, 120, 1, 1000);
        const startDate = normalizeDateTime(req.query.startDate, false);
        const endDate = normalizeDateTime(req.query.endDate, true);
        const user = await db.get(`
            SELECT id, name, email, role, location, bio, title, notes, plain_password, created_at
            FROM users
            WHERE id = ?
        `, [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const sessionWhere = ['user_id = ?'];
        const sessionParams = [userId];
        if (startDate) {
            sessionWhere.push('login_time >= ?');
            sessionParams.push(startDate);
        }
        if (endDate) {
            sessionWhere.push('login_time <= ?');
            sessionParams.push(endDate);
        }

        const sensorWhere = ['tenant_id = ?'];
        const sensorParams = [userId];
        if (startDate) {
            sensorWhere.push('timestamp >= ?');
            sensorParams.push(startDate);
        }
        if (endDate) {
            sensorWhere.push('timestamp <= ?');
            sensorParams.push(endDate);
        }

        const auditWhere = ['user_name = ?'];
        const auditParams = [String(user.name || '')];
        if (startDate) {
            auditWhere.push('timestamp >= ?');
            auditParams.push(startDate);
        }
        if (endDate) {
            auditWhere.push('timestamp <= ?');
            auditParams.push(endDate);
        }

        const [sessions, sensorData, auditLogs] = await Promise.all([
            db.all(`
                SELECT TOP ${limit} id, user_id, user_name, user_email, device_type, device_name, browser, os, ip_address, login_time, logout_time,
                CASE
                  WHEN status = 'active' AND DATEDIFF(HOUR, login_time, GETDATE()) >= 24 THEN 'expired'
                  ELSE status
                END AS status
                FROM login_sessions
                WHERE ${sessionWhere.join(' AND ')}
                ORDER BY login_time DESC
            `, sessionParams),
            db.all(`
                SELECT TOP ${limit} id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, active_tank, is_on, uptime_seconds, timestamp
                FROM sensor_data
                WHERE ${sensorWhere.join(' AND ')}
                ORDER BY id DESC
            `, sensorParams),
            db.all(`
                SELECT TOP ${limit} id, user_name, action, device, status, details, timestamp
                FROM audit_logs
                WHERE ${auditWhere.join(' AND ')}
                ORDER BY timestamp DESC
            `, auditParams)
        ]);

        const devices = await db.all(`
            SELECT TOP ${limit} id, user_id, user_email, device_id, device_name, location, pairing_code, status, created_at, paired_at, last_seen, is_primary, updated_at
            FROM device_pairings
            WHERE user_id = ?
            ORDER BY paired_at DESC
        `, [userId]);

        res.json({
            user,
            sessions,
            sensor_data: sensorData,
            audit_logs: auditLogs,
            devices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/login-sessions', requireAdmin, async (req, res) => {
    try {
        const limit = parsePositiveInt(req.query.limit, 300, 1, 1000);
        const userId = String(req.query.userId || '').trim();
        const status = String(req.query.status || '').trim().toLowerCase();
        const deviceType = String(req.query.deviceType || '').trim();
        const q = String(req.query.q || '').trim();
        const startDate = normalizeDateTime(req.query.startDate, false);
        const endDate = normalizeDateTime(req.query.endDate, true);

        const where = [];
        const params = [];
        if (userId) {
            where.push('user_id = ?');
            params.push(userId);
        }
        if (deviceType) {
            where.push('device_type = ?');
            params.push(deviceType);
        }
        if (q) {
            where.push('(user_name LIKE ? OR user_email LIKE ? OR device_name LIKE ? OR browser LIKE ? OR os LIKE ? OR ip_address LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (startDate) {
            where.push('login_time >= ?');
            params.push(startDate);
        }
        if (endDate) {
            where.push('login_time <= ?');
            params.push(endDate);
        }
        if (status && status !== 'all') {
            if (status === 'expired') {
                where.push("status = 'active' AND DATEDIFF(HOUR, login_time, GETDATE()) >= 24");
            } else if (status === 'active') {
                where.push("status = 'active' AND DATEDIFF(HOUR, login_time, GETDATE()) < 24");
            } else {
                where.push('status = ?');
                params.push(status);
            }
        }

        const rows = await db.all(`
            SELECT TOP ${limit} id, user_id, user_name, user_email, device_type, device_name, browser, os, ip_address, login_time, logout_time,
            CASE
              WHEN status = 'active' AND DATEDIFF(HOUR, login_time, GETDATE()) >= 24 THEN 'expired'
              ELSE status
            END AS status
            FROM login_sessions
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY login_time DESC
        `, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/sensor-data', requireAdmin, async (req, res) => {
    try {
        const limit = parsePositiveInt(req.query.limit, 300, 1, 1000);
        const userId = String(req.query.userId || '').trim();
        const deviceId = String(req.query.deviceId || '').trim();
        const sensorId = String(req.query.sensorId || '').trim();
        const q = String(req.query.q || '').trim();
        const startDate = normalizeDateTime(req.query.startDate, false);
        const endDate = normalizeDateTime(req.query.endDate, true);

        const where = [];
        const params = [];
        if (userId) {
            where.push('tenant_id = ?');
            params.push(userId);
        }
        if (deviceId) {
            where.push('device_id = ?');
            params.push(deviceId);
        }
        if (sensorId) {
            where.push('sensor_id = ?');
            params.push(sensorId);
        }
        if (q) {
            where.push('(tenant_id LIKE ? OR device_id LIKE ? OR sensor_id LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (startDate) {
            where.push('timestamp >= ?');
            params.push(startDate);
        }
        if (endDate) {
            where.push('timestamp <= ?');
            params.push(endDate);
        }

        const rows = await db.all(`
            SELECT TOP ${limit} id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, active_tank, is_on, uptime_seconds, timestamp
            FROM sensor_data
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
        `, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/audit-logs', requireAdmin, async (req, res) => {
    try {
        const limit = parsePositiveInt(req.query.limit, 300, 1, 1000);
        const userId = String(req.query.userId || '').trim();
        const action = String(req.query.action || '').trim();
        const status = String(req.query.status || '').trim();
        const q = String(req.query.q || '').trim();
        const startDate = normalizeDateTime(req.query.startDate, false);
        const endDate = normalizeDateTime(req.query.endDate, true);

        let userName = '';
        if (userId) {
            const user = await db.get('SELECT name FROM users WHERE id = ?', [userId]);
            userName = String(user?.name || '');
        }

        const where = [];
        const params = [];
        if (userName) {
            where.push('user_name = ?');
            params.push(userName);
        }
        if (action) {
            where.push('action = ?');
            params.push(action);
        }
        if (status) {
            where.push('status = ?');
            params.push(status);
        }
        if (q) {
            where.push('(user_name LIKE ? OR action LIKE ? OR device LIKE ? OR status LIKE ? OR details LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (startDate) {
            where.push('timestamp >= ?');
            params.push(startDate);
        }
        if (endDate) {
            where.push('timestamp <= ?');
            params.push(endDate);
        }

        const rows = await db.all(`
            SELECT TOP ${limit} id, user_name, action, device, status, details, timestamp
            FROM audit_logs
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY timestamp DESC
        `, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/otp-codes', requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT TOP 300 id, contact, expires_at, created_at
            FROM otp_codes
            ORDER BY created_at DESC
        `);
        res.json(
            rows.map((row) => ({
                ...row,
                contact: maskContact(row.contact)
            }))
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        const serverNowMs = Date.now();
        const serverNowIso = new Date(serverNowMs).toISOString();
        // In shared mode, app/web always read the same stream.
        let tenantId = SHARED_SENSOR_TENANT
            ? DEFAULT_TENANT_ID
            : (req.tenant || req.headers['x-tenant-id'] || req.query.tenant_id);
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
        const deviceId = req.query.device_id ? String(req.query.device_id) : null;

        let query = `
            SELECT TOP 1 id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp
            FROM sensor_data
            WHERE tenant_id = ?
            ORDER BY id DESC
        `;
        
        const params = [tenantId];
        if (deviceId) {
            query = `
                SELECT TOP 1 id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp
                FROM sensor_data
                WHERE tenant_id = ? AND device_id = ?
                ORDER BY id DESC
            `;
            params.push(deviceId);
        }

        let rows = await db.all(query, params);

        // 2b. Fallback: If no user-specific data, check for 'public' legacy data
        if (rows.length === 0 && tenantId !== 'public') {
            console.log(`[READ] No data for Tenant ${tenantId}, falling back to 'public'`);
            rows = await db.all(query, deviceId ? ['public', deviceId] : ['public']);
        }

        // History mode for charts (optional)
        if (req.query.history === 'true') {
             const targetTenant = rows.length > 0 ? (rows[0].tenant_id || tenantId) : tenantId;
             const history = await db.all(
                `
                SELECT TOP 50 pressure, flow_rate, timestamp 
                FROM sensor_data 
                WHERE tenant_id = ?${deviceId ? ' AND device_id = ?' : ''}
                ORDER BY id DESC
              `,
              deviceId ? [targetTenant, deviceId] : [targetTenant]
            );
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
            row.uptime_seconds = computeLiveUptimeSeconds(row, serverNowMs);
            row.is_on = asBool(row.is_on);
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
        // In shared mode, app/web always write to the same stream.
        let tenant = SHARED_SENSOR_TENANT
            ? DEFAULT_TENANT_ID
            : (req.tenant || req.headers['x-tenant-id'] || req.body.tenant_id || DEFAULT_TENANT_ID);
        tenant = String(tenant); // Ensure String
        
        const source = String(req.body.source || 'unknown');
        console.log(`[DATA SYNC] Update from Tenant ID: ${tenant} | Power: ${req.body.is_on} | source=${source}`);

        const { device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp } = req.body;
        const latest = await db.get(
            `SELECT TOP 1 is_on, uptime_seconds, timestamp
             FROM sensor_data
             WHERE tenant_id = ?
             ORDER BY id DESC`,
            [tenant]
        );

        const isTrustedControlSource = source === 'app-ui' || source === 'web-ui';
        const parsedIncomingUptime = Math.max(0, Math.floor(asNumber(uptime_seconds, 0)));
        const normalizedIsOn = asBool(is_on);
        const incomingIsOffReset = !normalizedIsOn && parsedIncomingUptime === 0;
        const latestTsMs = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;
        const nowMs = Date.now();
        const recentOnRow =
            latest &&
            asBool(latest.is_on) &&
            Number.isFinite(latestTsMs) &&
            latestTsMs > 0 &&
            (nowMs - latestTsMs) <= 15000;

        if (!isTrustedControlSource && incomingIsOffReset && recentOnRow) {
            console.warn(`[DATA SYNC] Suppressed stale OFF overwrite for tenant=${tenant} from source=${source}`);
            return res.json({ ok: true, suppressed: true, reason: 'stale-off-overwrite' });
        }

        const pumpsJson = pumps && Array.isArray(pumps) ? JSON.stringify(pumps.map(p => p ? 1 : 0)) : '[]';
        const parsedTsMs = timestamp ? new Date(timestamp).getTime() : NaN;
        const clientTsSkewMs = Number.isFinite(parsedTsMs) ? Math.abs(nowMs - parsedTsMs) : Number.POSITIVE_INFINITY;
        const safeTimestamp = (clientTsSkewMs <= 5 * 60 * 1000) ? new Date(parsedTsMs) : new Date(nowMs);

        const result = await db.run(
            `INSERT INTO sensor_data (tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps, active_tank, is_on, uptime_seconds, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenant,
                device_id || null,
                sensor_id || null,
                asNumber(pressure, 0),
                asNumber(flow_rate, 0),
                asNumber(ec_value, 0),
                pumpsJson,
                active_tank ?? null,
                normalizedIsOn,
                parsedIncomingUptime,
                safeTimestamp
            ]
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
