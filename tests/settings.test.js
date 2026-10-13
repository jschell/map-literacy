import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, checkedSettings, recoverSettings, createPreferenceWriter } from '../src/storage/settings.js';
import { checkedBackup } from '../src/storage/backup.js';
const record = (values = DEFAULT_SETTINGS, version = 0) => ({ singleton: 'singleton', settingsVersion: 1, version, values: structuredClone(values) });
test('invalid/future stored values use visible defaults without mutating the original', () => {
  const old = record({ ...DEFAULT_SETTINGS, labels: 'future-style', printScale: 1000 }), before = JSON.stringify(old);
  const recovered = recoverSettings(old); assert.equal(recovered.values.labels, 'labeled'); assert.equal(recovered.values.printScale, 1000); assert.equal(recovered.warnings.length, 1); assert.equal(recovered.version, 0); assert.equal(JSON.stringify(old), before);
  old.settingsVersion = 2; assert.equal(recoverSettings(old).writable, false); assert.throws(() => checkedSettings(old), (e) => e.code === 'invalid-settings');
  for (const values of [{ ...DEFAULT_SETTINGS, mapRotationDeg: 360 }, { ...DEFAULT_SETTINGS, orientation: 'a4' }, { ...DEFAULT_SETTINGS, printScale: 2000 }]) assert.throws(() => checkedSettings(record(values)));
});
test('rapid preference changes serialize against committed versions and save the latest choice', async () => {
  let resolve; const calls = [], states = [];
  const writer = createPreferenceWriter({ storage: { saveSettings(value, options) { calls.push({ value, options }); return new Promise((r) => { resolve = r; }); } }, onChange: (s) => states.push(s.state) });
  writer.initialize(null); const first = writer.change({ ...DEFAULT_SETTINGS, labels: 'partial' }); await Promise.resolve();
  const next = writer.change({ ...DEFAULT_SETTINGS, labels: 'blank', orientation: 'portrait' }); assert.equal(first, next); assert.equal(writer.snapshot().values.labels, 'blank');
  resolve({ version: 0 }); await Promise.resolve(); await Promise.resolve(); assert.equal(calls[1].options.expectedVersion, 0); assert.equal(calls[1].value.version, 1); resolve({ version: 1 }); await first;
  assert.equal(writer.snapshot().state, 'saved'); assert.equal(writer.snapshot().record.values.orientation, 'portrait'); assert.equal(states.at(-1), 'saved');
});
test('failed preference write retains pending values and the version lease for retry', async () => {
  let fail = true; const leases = [];
  const writer = createPreferenceWriter({ storage: { async saveSettings(value, options) { leases.push(options.expectedVersion); if (fail) throw Object.assign(new Error('Quota'), { code: 'storage-full' }); return { version: value.version }; } } });
  writer.initialize(record()); await assert.rejects(writer.change({ ...DEFAULT_SETTINGS, labels: 'blank' })); assert.equal(writer.snapshot().values.labels, 'blank'); assert.equal(writer.snapshot().version, 0);
  fail = false; await writer.retry(); assert.deepEqual(leases, [0, 0]); assert.equal(writer.snapshot().version, 1);
});
test('full progress backup accepts a strict settings record and keeps legacy empty settings valid', () => {
  const empty = { backupVersion: 1, exportedAt: new Date().toISOString(), packs: [], sessions: [], attempts: [], settings: {} };
  assert.deepEqual(checkedBackup(empty).settings, {}); assert.deepEqual(checkedBackup({ ...empty, settings: record() }).settings, record());
});
