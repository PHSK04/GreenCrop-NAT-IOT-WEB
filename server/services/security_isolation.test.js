const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const createAuthTenant = require('../middleware/authTenant');
const { recordLatency, getLatencyMetrics } = require('./ai_metrics');

function runMiddleware(token) {
  const contexts = [];
  const middleware = createAuthTenant({ setSessionContext: async (tenant) => contexts.push(String(tenant)) });
  const req = { path: '/api/private', headers: { authorization: `Bearer ${token}` } };
  let response;
  const res = { status(code) { response = { code }; return this; }, json(body) { response.body = body; return this; } };
  return new Promise((resolve) => middleware(req, res, () => resolve({ req, contexts, response })).then(() => { if (response) resolve({ req, contexts, response }); }));
}

test('concurrent JWT requests keep tenant contexts separated', async () => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const tokenA = jwt.sign({ id: 101, tenant_id: 'tenant-a', role: 'user' }, secret);
  const tokenB = jwt.sign({ id: 202, tenant_id: 'tenant-b', role: 'user' }, secret);
  const [a, b] = await Promise.all([runMiddleware(tokenA), runMiddleware(tokenB)]);
  assert.equal(a.req.tenant, 'tenant-a'); assert.deepEqual(a.contexts, ['tenant-a']);
  assert.equal(b.req.tenant, 'tenant-b'); assert.deepEqual(b.contexts, ['tenant-b']);
});

test('invalid token cannot enter a private route', async () => {
  const result = await runMiddleware('not-a-jwt');
  assert.equal(result.response.code, 401);
});

test('latency metrics expose aggregates and never raw audio', () => {
  recordLatency('stt', Date.now() - 25);
  const metrics = getLatencyMetrics();
  assert.equal(metrics.raw_audio_stored, false);
  assert.equal(metrics.stages.stt.count >= 1, true);
  assert.equal(Object.prototype.hasOwnProperty.call(metrics.stages.stt, 'audio'), false);
});
