import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../src/utils/emergencyInterlock.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { updateEmergencyInterlock: update } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const requested = { requestedAt: 1000, confirmedAt: null };
const sample = (locked, timestamp, lockReported = true) => ({ locked, timestamp, lockReported });

test('an unconfirmed stop stays latched despite unlocked telemetry', () => {
  assert.deepEqual(update(requested, sample(false, 2000)), requested);
});
test('old or sensor-only packets cannot acknowledge or clear a stop', () => {
  assert.deepEqual(update(requested, sample(true, 999)), requested);
  assert.deepEqual(update(requested, sample(true, 2000, false)), requested);
  assert.deepEqual(update({ requestedAt: 1000, confirmedAt: 2000 }, sample(false, 3000, false)), { requestedAt: 1000, confirmedAt: 2000 });
});
test('release requires a newer unlocked packet after board lock confirmation', () => {
  const confirmed = update(requested, sample(true, 2000));
  assert.deepEqual(confirmed, { requestedAt: 1000, confirmedAt: 2000 });
  assert.deepEqual(update(confirmed, sample(false, 1999)), confirmed);
  assert.deepEqual(update(confirmed, sample(false, 2000)), confirmed);
  assert.equal(update(confirmed, sample(false, 2001)), null);
});
test('a cabinet lock also latches controls without a web stop request', () => {
  assert.deepEqual(update(null, sample(true, 2000)), { requestedAt: 2000, confirmedAt: 2000 });
});
test('out of order lock packets cannot move the confirmation backwards', () => {
  const confirmed = { requestedAt: 1000, confirmedAt: 3000 };
  assert.deepEqual(update(confirmed, sample(true, 2000)), confirmed);
  assert.deepEqual(update(confirmed, sample(false, 2500)), confirmed);
});
test('persisted state still requires cabinet confirmation after reload', () => {
  const reloaded = JSON.parse(JSON.stringify(requested));
  assert.deepEqual(update(reloaded, sample(false, 4000)), requested);
  assert.deepEqual(update(reloaded, sample(true, NaN)), requested);
});
