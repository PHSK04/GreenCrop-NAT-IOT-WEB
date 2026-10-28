const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const resetSecret = () => crypto.createHmac('sha256', process.env.JWT_SECRET).update('password-reset-v1').digest('hex');
const fingerprint = (password) => crypto.createHash('sha256').update(password).digest('hex');

// The browser receives an opaque challenge, never account IDs or password fingerprints.
function sealAccount(account) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(resetSecret(), 'hex'), iv);
    const body = JSON.stringify(account).padEnd(512, ' ');
    const data = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), data: data.toString('base64url') };
}
function openAccount(box) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(resetSecret(), 'hex'), Buffer.from(box.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(box.tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(box.data, 'base64url')), decipher.final()]).toString('utf8').trim());
}
const otpContact = (nonce, code) => `password-reset:${nonce}:${crypto.createHmac('sha256', resetSecret()).update(`${nonce}:${code}`).digest('hex').slice(0, 32)}`;

function registerPasswordReset(app, db) {
    const attempts = new Map();
    const limited = (key) => {
        const now = Date.now();
        for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
        const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
        entry.count++;
        if (!attempts.has(key) && attempts.size >= 10000) return true;
        attempts.set(key, entry);
        return entry.count > 5;
    };
    app.post('/api/forgot-password', async (req, res) => {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'กรุณากรอกอีเมลให้ถูกต้อง' });
        if (limited(`request:${req.ip}`) || limited(`email:${email}`)) return res.status(429).json({ error: 'ขอลิงก์บ่อยเกินไป กรุณารอ 15 นาที' });
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.JWT_SECRET) return res.status(503).json({ error: 'บริการส่งอีเมลกู้คืนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' });
        try {
            const user = await db.get('SELECT id, email, password FROM users WHERE LOWER(email) = ?', [email]);
            // Use the same mail path and response for registered and unknown addresses.
            // A decoy token can never match a stored password fingerprint, so SMTP/API
            // failures cannot be used to discover whether an account exists.
            let challenge;
            {
                const token = jwt.sign({ sub: String(user?.id || 0), purpose: 'password-reset', version: user?.password ? fingerprint(user.password) : crypto.randomBytes(32).toString('hex'), nonce: crypto.randomBytes(16).toString('hex') }, resetSecret(), { expiresIn: '15m', audience: 'password-reset' });
                const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
                const nonce = crypto.randomBytes(16).toString('hex');
                const account = { sub: String(user?.id || 0), version: user?.password ? fingerprint(user.password) : crypto.randomBytes(32).toString('hex') };
                challenge = jwt.sign({ purpose: 'password-reset-otp', nonce, box: sealAccount(account) }, resetSecret(), { expiresIn: '15m', audience: 'password-reset-otp' });
                const link = new URL(process.env.PASSWORD_RESET_URL || 'https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/');
                if (link.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(link.hostname)) throw new Error('Invalid reset URL');
                link.search = '';
                link.hash = new URLSearchParams({ reset_token: token }).toString();
                const sent = await fetch('https://api.resend.com/emails', {
                    method: 'POST', signal: AbortSignal.timeout(15000),
                    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [email], subject: 'ตั้งรหัสผ่านใหม่ — GreenCrop NAT IoT', text: `รหัส OTP สำหรับตั้งรหัสผ่านใหม่: ${code}\nใช้ได้ 15 นาที และใช้ได้ครั้งเดียว ห้ามบอกรหัสนี้แก่ผู้อื่น\n\nได้รับคำขอตั้งรหัสผ่านใหม่ หากอีเมลนี้มีบัญชีในระบบ คุณสามารถใช้ลิงก์ด้านล่างได้\n\nเปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (หมดอายุใน 15 นาที):\n${link.toString()}\n\nหากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน สามารถละเว้นอีเมลนี้ได้` }),
                });
                if (!sent.ok || !(await sent.json()).id) throw new Error('Email delivery failed');
                await db.run('INSERT INTO otp_codes (contact, code, expires_at) VALUES (?, ?, ?)', [otpContact(nonce, code), 'reset', new Date(Date.now() + 900000).toISOString()]);
            }
            res.json({ message: 'หากอีเมลนี้มีบัญชีในระบบ กรุณาตรวจสอบรหัส OTP ในกล่องจดหมายหรือสแปม', challenge, expiresIn: 900 });
        } catch {
            res.status(503).json({ error: 'ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาลองใหม่ภายหลัง' });
        }
    });
    app.post('/api/verify-reset-otp', async (req, res) => {
        if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'บริการกู้คืนบัญชียังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' });
        if (limited(`verify:${req.ip}`)) return res.status(429).json({ error: 'ลองหลายครั้งเกินไป กรุณาขอรหัสใหม่ภายหลัง' });
        const { challenge, code } = req.body || {};
        try {
            if (typeof challenge !== 'string' || challenge.length > 4096 || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Invalid OTP');
            const payload = jwt.verify(challenge, resetSecret(), { audience: 'password-reset-otp', algorithms: ['HS256'] });
            if (payload.purpose !== 'password-reset-otp' || limited(`challenge:${payload.nonce}`)) throw new Error('Invalid challenge');
            const contact = otpContact(payload.nonce, code);
            const record = await db.get('SELECT contact, expires_at FROM otp_codes WHERE contact = ?', [contact]);
            if (!record || new Date(record.expires_at).getTime() <= Date.now()) throw new Error('Expired OTP');
            const account = openAccount(payload.box);
            const user = await db.get('SELECT id, password FROM users WHERE id = ?', [account.sub]);
            if (!user?.password || fingerprint(user.password) !== account.version) throw new Error('Invalid account');
            const consumed = await db.run('DELETE FROM otp_codes WHERE contact = ?', [contact]);
            if (consumed.changes !== 1) throw new Error('Used OTP');
            const token = jwt.sign({ ...account, purpose: 'password-reset' }, resetSecret(), { expiresIn: Math.max(1, payload.exp - Math.floor(Date.now() / 1000)), audience: 'password-reset' });
            res.json({ token });
        } catch {
            res.status(400).json({ error: 'รหัส OTP ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว กรุณาตรวจสอบรหัสหรือขอรหัสใหม่' });
        }
    });
    app.post('/api/reset-password', async (req, res) => {
        if (limited(`reset:${req.ip}`)) return res.status(429).json({ error: 'ลองหลายครั้งเกินไป กรุณารอ 15 นาที' });
        const { token, password } = req.body || {};
        if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์' });
        try {
            if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'บริการกู้คืนบัญชียังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' });
            if (typeof token !== 'string' || token.length > 4096) throw new Error('Invalid token');
            const payload = jwt.verify(token, resetSecret(), { audience: 'password-reset', algorithms: ['HS256'] });
            if (payload.purpose !== 'password-reset') throw new Error('Invalid purpose');
            const user = await db.get('SELECT id, password FROM users WHERE id = ?', [payload.sub]);
            if (!user?.password || fingerprint(user.password) !== payload.version) throw new Error('Used token');
            const hash = await bcrypt.hash(password, 12);
            const updated = await db.run('UPDATE users SET password = ?, plain_password = NULL WHERE id = ? AND password = ?', [hash, user.id, user.password]);
            if (updated.changes !== 1) throw new Error('Used token');
            res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
        } catch {
            res.status(400).json({ error: 'ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่' });
        }
    });
}
module.exports = { registerPasswordReset };
