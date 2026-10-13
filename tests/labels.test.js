import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { editLabel, restoreLabels, serializePack } from '../src/author/labels.js';
import { readImport } from '../src/data/read-pack.js';
const original = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));

test('label edits preserve provenance/topology and invalidate review without mutating input', () => {
  const pack = structuredClone(original);
  pack.review = { status: 'reviewed', reviewedAt: '2026-10-12T00:00:00.000Z', note: 'Checked fixture.' };
  const before = JSON.stringify(pack);
  const label = { ...pack.labels[0], text: 'New road label', anchor: [.0004, .0004], rotationDeg: 45, visibleIn: 'partial', priority: 100 };
  const edited = editLabel(pack, { label });
  assert.equal(JSON.stringify(pack), before);
  assert.equal(edited.revision, pack.revision + 1);
  assert.equal(edited.review.status, 'draft'); assert.equal(edited.review.reviewedAt, null);
  assert.ok(edited.exercises.every((e) => e.review === 'draft'));
  assert.deepEqual(edited.labels[0], label);
  for (const key of ['sources', 'topology', 'features', 'bounds', 'print']) assert.deepEqual(edited[key], pack[key]);
});
test('add/remove labels produce re-importable standalone packs with literal text', async () => {
  const label = { ...original.labels[0], id: 'label:new', text: '<img src=x onerror=alert(1)>', anchor: [.0005, .0005] };
  const added = editLabel(original, { label });
  const imported = await readImport(new Blob([serializePack(added)]));
  assert.deepEqual(imported, added); assert.equal(imported.labels.at(-1).text, label.text);
  const removed = editLabel(imported, { removeId: 'label:new' });
  assert.equal(removed.labels.length, original.labels.length);
  assert.equal(removed.revision, original.revision + 2);
  assert.deepEqual(removed.labels, original.labels);
});
test('invalid edits fail atomically rather than dropping the prior label', () => {
  const before = JSON.stringify(original);
  for (const change of [{ anchor: [NaN, 0] }, { anchor: [1, 1] }, { text: 'x'.repeat(121) }, { featureId: 'missing' }, { rotationDeg: 181 }, { priority: 1.5 }, { visibleIn: 'blank' }]) {
    assert.throws(() => editLabel(original, { label: { ...original.labels[0], ...change } }));
    assert.equal(JSON.stringify(original), before);
  }
  assert.throws(() => editLabel(original, { removeId: 'missing' }), /no longer exists/);
  assert.throws(() => editLabel(original, {}), /Choose one/);
  const max = structuredClone(original); max.revision = Number.MAX_SAFE_INTEGER;
  assert.throws(() => editLabel(max, { label: max.labels[0] }), /revision limit/);
});

test('undo restores label content as a new draft revision after an export', () => {
  const edited = editLabel(original, { label: { ...original.labels[0], text: 'Changed' } });
  const exported = JSON.parse(serializePack(edited));
  const restored = restoreLabels(edited, original.labels);
  assert.deepEqual(restored.labels, original.labels);
  assert.equal(restored.revision, exported.revision + 1);
  assert.equal(restored.review.status, 'draft');
  assert.equal(edited.labels[0].text, 'Changed');
});
