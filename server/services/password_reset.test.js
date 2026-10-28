const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function harness() {
    const routes = {}, emails = [];
    const otpRows = new Map();
    const user = { id: 7, email: 'test@example.com', password: 'old-hash' };
    const env = { JWT_SECRET: 'test-secret', RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: 'test@example.com' };
    const module = { exports: {} };
    let deliveryOK = true, updates = 0, hashCounter = 0;
    vm.runInNewContext(fs.readFileSync(__dirname + '/password_reset.js', 'utf8'), {
        module, require: (name) => name === 'bcrypt' ? { hash: async () => `new-hash-${++hashCounter}` } : name === 'jsonwebtoken' ? { sign: (payload, key, options) => jwt.sign(JSON.parse(JSON.stringify(payload)), key, JSON.parse(JSON.stringify(options))), verify: jwt.verify } : require(name),
        process: { env }, URL, URLSearchParams, AbortSignal, Buffer,
        fetch: async (_, options) => { emails.push(JSON.parse(options.body)); return { ok: deliveryOK, json: async () => ({ id: 'mail-accepted' }) }; },
    });
    const db = {
        get: async (sql, [value]) => sql.includes('FROM otp_codes') ? otpRows.get(value) : String(value) === '7' || value === user.email ? { ...user } : undefined,
        run: async (sql, [hash, id, previous]) => {
            if (sql.startsWith('INSERT INTO otp_codes')) { otpRows.set(hash, { contact: hash, expires_at: previous }); return { changes: 1 }; }
            if (sql.startsWith('DELETE FROM otp_codes')) return { changes: otpRows.delete(hash) ? 1 : 0 };
            if (id !== user.id || previous !== user.password) return { changes: 0 };
            user.password = hash; updates++; return { changes: 1 };
        },
    };
    module.exports.registerPasswordReset({ post: (path, handler) => { routes[path] = handler; } }, db);
    const call = async (path, body, ip = 'test-ip') => {
        const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
        await routes[path]({ body, ip }, response); return response;
    };
    const tokenFrom = (index = 0) => new URLSearchParams(new URL(emails[index].text.match(/https:\/\/\S+/)[0]).hash.slice(1)).get('reset_token');
    return { call, emails, env, user, tokenFrom, updates: () => updates, failDelivery: () => { deliveryOK = false; } };
}

test('registered and unknown emails have identical responses, including delivery failures', async () => {
    const h = harness();
    const known = await h.call('/api/forgot-password', { email: h.user.email });
    const unknown = await h.call('/api/forgot-password', { email: 'other@example.com' });
    assert.equal(known.statusCode, 200);
    assert.equal(known.body.message, unknown.body.message);
    assert.equal(h.emails.length, 2);
    assert.equal((await h.call('/api/reset-password', { token: h.tokenFrom(1), password: 'password123' })).statusCode, 400);
    h.failDelivery();
    const failedKnown = await h.call('/api/forgot-password', { email: h.user.email });
    const failedUnknown = await h.call('/api/forgot-password', { email: 'other@example.com' });
    assert.equal(failedKnown.statusCode, 503);
    assert.equal(failedKnown.body.error, failedUnknown.body.error);
    assert.equal(failedKnown.body.message, undefined);
});

test('tokens expire after 15 minutes, cannot authenticate sessions and work once', async () => {
    const h = harness();
    await h.call('/api/forgot-password', { email: h.user.email });
    const token = h.tokenFrom();
    const key = crypto.createHmac('sha256', h.env.JWT_SECRET).update('password-reset-v1').digest('hex');
    const claims = jwt.verify(token, key, { audience: 'password-reset' });
    assert.equal(claims.exp - claims.iat, 900);
    assert.throws(() => jwt.verify(token, h.env.JWT_SECRET));
    assert.throws(() => jwt.verify(token, key, { audience: 'password-reset', clockTimestamp: claims.exp }));
    const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 1 }, key);
    assert.equal((await h.call('/api/reset-password', { token: expired, password: 'password123' })).statusCode, 400);
    assert.equal((await h.call('/api/reset-password', { token: 'fake', password: 'password123' })).statusCode, 400);
    assert.equal((await h.call('/api/reset-password', { token, password: 'short' })).statusCode, 400);
    assert.equal((await h.call('/api/reset-password', { token, password: 'password123' })).statusCode, 200);
    assert.equal((await h.call('/api/reset-password', { token, password: 'password456' })).statusCode, 400);
    assert.equal(h.updates(), 1);
});

test('concurrent reset requests consume a token only once', async () => {
    const h = harness();
    await h.call('/api/forgot-password', { email: h.user.email });
    const results = await Promise.all(Array.from({ length: 2 }, () => h.call('/api/reset-password', { token: h.tokenFrom(), password: 'password123' })));
    assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 400]);
    assert.equal(h.updates(), 1);
});

test('unconfigured delivery never claims success; validation and throttling reject abuse', async () => {
    const h = harness();
    delete h.env.RESEND_API_KEY;
    assert.equal((await h.call('/api/forgot-password', { email: h.user.email })).statusCode, 503);
    assert.equal(h.emails.length, 0);
    assert.equal((await h.call('/api/forgot-password', { email: 'bad' })).statusCode, 400);
    assert.equal((await h.call('/api/forgot-password', undefined)).statusCode, 400);
    for (let i = 0; i < 5; i++) await h.call('/api/forgot-password', { email: h.user.email });
    assert.equal((await h.call('/api/forgot-password', { email: h.user.email })).statusCode, 429);
    assert.equal((await h.call('/api/reset-password', { password: 'ก'.repeat(25), token: 'fake' })).statusCode, 400);
});


test('OTP verification unlocks reset, rejects guesses, and consumes the code atomically', async () => {
    const h = harness();
    const result = await h.call('/api/forgot-password', { email: h.user.email });
    const challenge = result.body.challenge;
    const claims = jwt.decode(challenge);
    assert.equal(claims.sub, undefined);
    assert.equal(claims.version, undefined);
    assert.equal(claims.exp - claims.iat, 900);
    const code = h.emails[0].text.match(/OTP[^:]*: (\d{6})/)[1];
    const wrong = code === '000000' ? '111111' : '000000';
    assert.equal((await h.call('/api/verify-reset-otp', { challenge, code: wrong })).statusCode, 400);
    const results = await Promise.all([1, 2].map(() => h.call('/api/verify-reset-otp', { challenge, code })));
    assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 400]);
    const verified = results.find(r => r.statusCode === 200);
    assert.equal((await h.call('/api/reset-password', { token: verified.body.token, password: 'password123' })).statusCode, 200);
    assert.equal((await h.call('/api/reset-password', { token: verified.body.token, password: 'password456' })).statusCode, 400);
});

test('OTP challenges expire and unknown accounts cannot redeem their code', async () => {
    const h = harness();
    const result = await h.call('/api/forgot-password', { email: 'unknown@example.com' });
    const code = h.emails[0].text.match(/OTP[^:]*: (\d{6})/)[1];
    assert.equal((await h.call('/api/verify-reset-otp', { challenge: result.body.challenge, code })).statusCode, 400);
    const known = await h.call('/api/forgot-password', { email: h.user.email });
    const claims = jwt.decode(known.body.challenge);
    const key = crypto.createHmac('sha256', h.env.JWT_SECRET).update('password-reset-v1').digest('hex');
    const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 1 }, key);
    const correct = h.emails[1].text.match(/OTP[^:]*: (\d{6})/)[1];
    assert.equal((await h.call('/api/verify-reset-otp', { challenge: expired, code: correct })).statusCode, 400);
});
