import { editLabel, restoreLabels, serializePack } from '../author/labels.js';
const get = (id) => document.getElementById(id);

export function createLabelEditor({ getPack, getModel, applyPack }) {
  let featureId = null, labelId = null, placing = false, previous = null;
  const message = (text) => { get('edit-status').textContent = text; };
  const placement = (value) => {
    placing = value; get('place-label').setAttribute('aria-pressed', String(value));
    get('place-label').textContent = value ? 'Cancel map placement' : 'Place anchor on map';
  };
  function fill() {
    const pack = getPack();
    if (!pack) return;
    const label = pack.labels.find((l) => l.id === labelId);
    const feature = pack.features.features.find((f) => f.id === (label?.featureId ?? featureId));
    get('label-fields').disabled = !feature || pack.module === 'topographic';
    get('delete-label').disabled = !label;
    get('label-feature').textContent = pack.module === 'topographic' ? 'Reference and target labels are supplied by the contour exercise.' : feature ? `${feature.properties.name ?? 'Unnamed feature'} (${feature.id})` : 'Select a feature to add a label.';
    const anchor = label?.anchor ?? [(pack.bounds[0] + pack.bounds[2]) / 2, (pack.bounds[1] + pack.bounds[3]) / 2];
    get('label-text').value = label?.text ?? feature?.properties.name ?? '';
    get('label-lon').value = anchor[0]; get('label-lat').value = anchor[1];
    get('label-rotation').value = label?.rotationDeg ?? 0;
    get('label-priority').value = label?.priority ?? 50;
    get('label-visible').value = label?.visibleIn ?? 'labeled';
    placement(false);
  }
  function refresh(chosen = labelId) {
    const pack = getPack(); labelId = pack?.labels.some((l) => l.id === chosen) ? chosen : null;
    const options = document.createDocumentFragment(); options.append(new Option('New label for selected feature', ''));
    for (const label of pack?.labels ?? []) options.append(new Option(`${label.text} (${label.id})`, label.id));
    get('label-choice').replaceChildren(options);
    get('label-choice').value = labelId ?? ''; get('label-choice').disabled = !pack || pack.module === 'topographic';
    get('export-pack').disabled = !pack; get('undo-label').disabled = !previous;
    fill();
  }
  function commit(operation, chosen, text) {
    try {
      const old = getPack(), next = operation(old);
      applyPack(next); previous = old; refresh(chosen);
      message(`${text} Draft revision ${next.revision}; review cleared. Export the pack to keep this edit. Refreshing or loading another pack loses local edits.`);
    } catch (error) { message(`Label not changed: ${error.message} ${error.errors?.[0]?.path ?? ''}`); }
  }
  get('label-choice').addEventListener('change', () => { labelId = get('label-choice').value || null; fill(); });
  get('label-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = labelId ?? `label:${crypto.randomUUID()}`;
    const feature = getPack()?.labels.find((l) => l.id === labelId)?.featureId ?? featureId;
    const numeric = (name) => get(name).value.trim() === '' ? NaN : Number(get(name).value);
    const label = { id, featureId: feature, text: get('label-text').value, anchor: [numeric('label-lon'), numeric('label-lat')], rotationDeg: numeric('label-rotation'), priority: numeric('label-priority'), visibleIn: get('label-visible').value };
    commit((pack) => editLabel(pack, { label }), id, 'Label applied.');
  });
  get('delete-label').addEventListener('click', () => commit((pack) => editLabel(pack, { removeId: labelId }), null, 'Label removed.'));
  get('undo-label').addEventListener('click', () => {
    if (!previous) return;
    try {
      const restored = restoreLabels(getPack(), previous.labels); applyPack(restored); previous = null; refresh();
      message(`Last label edit undone as draft revision ${restored.revision}; review stays cleared. Export to keep this working copy.`);
    } catch (error) { message(`Undo failed: ${error.message}`); }
  });
  get('place-label').addEventListener('click', () => {
    placement(!placing);
    if (placing) { get('map').scrollIntoView({ block: 'center' }); message('Click or tap inside the map to set the anchor, then Apply label. Longitude/latitude fields provide a keyboard alternative.'); }
  });
  get('map').addEventListener('click', (event) => {
    if (!placing) return;
    const svg = get('map').querySelector('svg'), matrix = svg?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const anchor = getModel().invert([point.x, point.y]);
    const [w, s, e, n] = getPack().bounds;
    if (anchor[0] < w || anchor[0] > e || anchor[1] < s || anchor[1] > n) { message('Choose a point inside the lesson extent.'); return; }
    get('label-lon').value = anchor[0]; get('label-lat').value = anchor[1]; placement(false);
    message('Anchor selected. Apply label to update the draft.');
  });
  get('export-pack').addEventListener('click', () => {
    try {
      const pack = getPack(), blob = new Blob([serializePack(pack)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `${pack.id}-r${pack.revision}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message(`Pack revision ${pack.revision} downloaded. Re-import it to check the saved copy; this does not save learner progress or store data in the browser.`);
    } catch (error) { message(`Pack not exported: ${error.message}`); }
  });
  refresh();
  return {
    isPlacing: () => placing,
    selectedFeature(id) { featureId = id; if (!labelId) fill(); },
    installed() { featureId = null; labelId = null; previous = null; placement(false); refresh(); message('Edits stay in memory until you export a lesson pack. Applying an edit creates a draft revision and clears review.'); }
  };
}
