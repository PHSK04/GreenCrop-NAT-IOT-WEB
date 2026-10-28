import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
};
function loadService({ local = storage(), session = storage(), response = { id: 1, email: 'qa@example.com', name: 'QA', token: 'test-token' }, status = 200 } = {}) {
  const requests = [];
  const source = fs.readFileSync(new URL('../../src/features/auth/services/authService.ts', import.meta.url), 'utf8').replaceAll('import.meta.env', '({ VITE_API_URL: "https://api.example.test/api" })');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, localStorage: local, sessionStorage: session, window: { location: { hostname: 'example.test' } }, atob, setTimeout, clearTimeout, AbortController, AbortSignal, console, fetch: async (url, init) => { requests.push({ url, init }); return { ok: status >= 200 && status < 300, status, json: async () => response }; } });
  return { service: module.exports.authService, local, session, requests };
}

test('Remember me persists across browser sessions; unchecked login stays in the current tab', async () => {
  const h = loadService();
  await h.service.login('qa-user', 'password123', false);
  assert.equal(h.local.getItem('smart_iot_session'), null);
  assert.ok(h.session.getItem('smart_iot_session'));
  assert.equal(h.service.getCurrentUser().name, 'QA');
  assert.equal(loadService({ local: h.local }).service.getCurrentUser(), null);
  await h.service.login('qa-user', 'password123', true);
  assert.ok(h.local.getItem('smart_iot_session'));
  assert.equal(h.session.getItem('smart_iot_session'), null);
  assert.equal(loadService({ local: h.local }).service.getCurrentUser().name, 'QA');
});

test('invalid credentials are not retried and do not create a session', async () => {
  const h = loadService({ status: 401, response: { error: 'Invalid credentials' } });
  await assert.rejects(h.service.login('wrong-user', 'wrong-password'), /Invalid credentials/);
  assert.equal(h.requests.length, 1);
  assert.equal(h.service.getCurrentUser(), null);
});

test('recovery never treats unavailable mail or malformed success responses as sent', async () => {
  const h = loadService({ status: 503, response: { error: 'บริการส่งอีเมลกู้คืนยังไม่พร้อม' } });
  await assert.rejects(h.service.passwordRecovery({ email: 'qa@example.com' }), /ยังไม่พร้อม/);
  assert.equal(h.requests.length, 1);
  assert.ok(h.requests[0].url.endsWith('/forgot-password'));
  const bad = loadService({ response: {} });
  await assert.rejects(bad.service.passwordRecovery({ email: 'qa@example.com' }), /ยังไม่พร้อม/);
  const reset = loadService({ response: { message: 'ตั้งรหัสผ่านใหม่สำเร็จ' } });
  await reset.service.passwordRecovery({ token: 'token-fixture', password: 'password123' });
  assert.ok(reset.requests[0].url.endsWith('/reset-password'));
});

test('registration creates an account without persisting a logged-in session', async () => {
  const h = loadService();
  const account = await h.service.register('student@example.com', 'password123', 'Student', '0812345678');
  assert.equal(account.name, 'QA');
  assert.equal(h.requests.length, 1);
  assert.ok(h.requests[0].url.endsWith('/register'));
  assert.equal(h.local.getItem('smart_iot_session'), null);
  assert.equal(h.session.getItem('smart_iot_session'), null);
  assert.equal(h.service.getCurrentUser(), null);
});

test('social registration also waits for a separate login', async () => {
  const h = loadService();
  await h.service.socialLogin('Google', { accessToken: 'test-provider-token' }, false);
  assert.equal(h.local.getItem('smart_iot_session'), null);
  assert.equal(h.session.getItem('smart_iot_session'), null);
  assert.equal(h.service.getCurrentUser(), null);
});
