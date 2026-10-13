import { openStorage } from '../storage/indexeddb.js';
import { checkedSettings, createPreferenceWriter } from '../storage/settings.js';
const get = (id) => document.getElementById(id);
export function createPreferences({ readView, applyView, packDefaults }) {
  let storage = null, ready = false, active = false, warnings = [], loading = null, editGeneration = 0;
  const writer = createPreferenceWriter({ storage: { saveSettings: (...args) => storage ? storage.saveSettings(...args) : Promise.reject(Object.assign(new Error('Browser storage is unavailable.'), { code: 'storage-unavailable' })) }, onChange: refresh });
  function refresh() {
    const state = writer.snapshot();
    get('preferences-status').textContent = !ready ? 'Loading view preferences…' : `${warnings.join(' ')} ${state.state === 'saved' ? 'View preferences saved in this browser.' : state.state === 'saving' ? 'Saving view preferences…' : state.state === 'conflict' ? 'View preferences are not saved: another tab changed them. Reload saved preferences or download your choices.' : state.state === 'error' ? `View preferences are not saved. ${state.error.message} Retry or download your choices.` : 'Pack view defaults apply until you choose a preference.'}`.trim();
    get('preferences-retry').disabled = !ready || state.state === 'saving' || state.state === 'saved';
    get('preferences-reload').disabled = !ready || state.state === 'saving';
    get('preferences-defaults').disabled = !ready; get('preferences-export').disabled = !ready;
    get('preferences-import').disabled = !ready;
    for (const id of ['variant', 'rotate', 'scale', 'orientation']) get(id).disabled = !ready;
  }
  async function connect(reload = false) {
    if (loading) return loading;
    const generation = editGeneration;
    loading = (async () => {
      try {
        if (!storage) { const opening = new AbortController(); storage = await openStorage({ signal: opening.signal, onBlocked: () => { opening.abort(); get('preferences-status').textContent = 'Close other tabs to unblock view preference storage, then retry.'; }, onVersionChange: () => { storage = null; get('preferences-status').textContent = 'Preference storage changed. Download your choices and reload.'; } }); }
        const raw = await storage.loadSettings(); if (generation !== editGeneration) return;
        const recovered = writer.initialize(raw); warnings = recovered.warnings;
        if (reload || recovered.record || recovered.warnings.length) { active = true; applyView(recovered.values); }
      } catch (e) { warnings = [e.message]; }
      finally { ready = true; refresh(); loading = null; }
    })(); return loading;
  }
  function change(values = readView()) { editGeneration++; active = true; warnings = []; applyView(values); void writer.change(values).catch(() => {}); }
  get('preferences-retry').addEventListener('click', async () => {
    if (!storage) { try { storage = await openStorage(); } catch (e) { warnings = [e.message]; refresh(); return; } }
    void writer.retry().catch(() => {});
  });
  get('preferences-reload').addEventListener('click', () => connect(true));
  get('preferences-defaults').addEventListener('click', () => change(packDefaults()));
  get('preferences-export').addEventListener('click', () => {
    const record = { singleton: 'singleton', settingsVersion: 1, version: writer.snapshot().version ?? 0, values: readView() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(checkedSettings(record))], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'map-literacy-view-preferences.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  get('preferences-import').addEventListener('change', async () => {
    const file = get('preferences-import').files[0]; get('preferences-import').value = ''; if (!file) return;
    const generation = ++editGeneration;
    try {
      if (file.size > 16384) throw new Error('Preference file exceeds 16 KiB.');
      const record = checkedSettings(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())));
      if (generation !== editGeneration) return; change(record.values);
    } catch (e) { if (generation !== editGeneration) return; warnings = [`Preferences not restored: ${e.message} Previous choices retained.`]; refresh(); }
  });
  window.addEventListener('pagehide', () => { storage?.close(); storage = null; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) void connect(true); });
  refresh(); void connect();
  return { changed: change, installed() { if (active) applyView(writer.snapshot().values); }, ready: () => ready };
}
