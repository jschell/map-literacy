import { canonical, storageError } from './records.js';
export const DEFAULT_SETTINGS = Object.freeze({ labels: 'labeled', mapRotationDeg: 0, printScale: 5000, orientation: 'landscape', geographicOrientation: 'landscape' });
const valid = {
  labels: (v) => ['labeled', 'partial', 'blank'].includes(v),
  mapRotationDeg: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 360,
  printScale: (v) => [1000, 5000, 10000].includes(v),
  orientation: (v) => ['portrait', 'landscape'].includes(v),
  geographicOrientation: (v) => ['portrait', 'landscape'].includes(v)
};
const keysFor = version => Object.keys(valid).filter(key => version === 2 || key !== 'geographicOrientation');
export function checkedValues(value, settingsVersion = 2) {
  if(![1,2].includes(settingsVersion))throw storageError('invalid-settings','Preference value version is unsupported.');
  const keys = keysFor(settingsVersion);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value,k) || !valid[k](value[k]))) throw storageError('invalid-settings', 'View preferences are invalid.');
  return structuredClone(value);
}
export function checkedSettings(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).length !== 4 || !['singleton', 'settingsVersion', 'version', 'values'].every(key => Object.hasOwn(record,key)) || record.singleton !== 'singleton' || ![1,2].includes(record.settingsVersion) || !Number.isSafeInteger(record.version) || record.version < 0) throw storageError('invalid-settings', 'Preference record version/fields are unsupported.');
  return { singleton:'singleton', settingsVersion:record.settingsVersion, version:record.version, values:checkedValues(record.values,record.settingsVersion) };
}
export function settingsValues(record) {
  const checked = checkedSettings(record);
  return checked.settingsVersion === 1 ? {...checked.values,geographicOrientation:checked.values.orientation} : checked.values;
}
/** V1 stays byte-shape compatible until an explicit change writes V2; no automatic rewrite. */
export function recoverSettings(raw) {
  if (!raw) return {record:null,values:{...DEFAULT_SETTINGS},warnings:[],notices:[],writable:true,version:null};
  try {
    const record=checkedSettings(raw);
    return {record,values:settingsValues(record),warnings:[],notices:record.settingsVersion===1?['Your former shared orientation was copied into separate geographic and lesson controls. The original record is retained until you save a change.']:[],writable:true,version:record.version};
  } catch {
    const supported=[1,2].includes(raw.settingsVersion), keys=keysFor(raw.settingsVersion);
    const knownHeader = supported && raw.singleton==='singleton' && Number.isSafeInteger(raw.version) && raw.version>=0 && raw.values && typeof raw.values==='object' && !Array.isArray(raw.values) && Object.keys(raw).length===4 && ['singleton','settingsVersion','version','values'].every(k=>Object.hasOwn(raw,k)) && Object.keys(raw.values).length===keys.length && keys.every(k=>Object.hasOwn(raw.values,k));
    const values={...DEFAULT_SETTINGS},warnings=[];
    if(knownHeader) {
      for(const key of keys) {if(valid[key](raw.values[key]))values[key]=raw.values[key];else warnings.push(`${key} used its default because the stored value is unavailable.`);}
      if(raw.settingsVersion===1)values.geographicOrientation=values.orientation;
    } else warnings.push('Stored preference version is unsupported. Defaults are shown; the original record is retained.');
    return {record:null,values,warnings,notices:[],writable:Boolean(knownHeader),version:knownHeader?raw.version:null};
  }
}
export function createPreferenceWriter({ storage, onChange = () => {} }) {
  let desired = { ...DEFAULT_SETTINGS }, version = null, state = 'idle', error = null, running = null, writable = true, record = null;
  const snapshot = () => ({ values: structuredClone(desired), version, state, error, record: record ? structuredClone(record) : null });
  const notify = () => onChange(snapshot());
  const api = {
    snapshot,
    initialize(raw) { if (running) throw storageError('save-pending', 'Preferences are saving.'); const recovered = recoverSettings(raw); desired = recovered.values; version = recovered.version; writable = recovered.writable; record = recovered.record; state = record ? 'saved' : recovered.warnings.length ? 'error' : 'idle'; error = recovered.warnings.length ? storageError('invalid-settings', recovered.warnings.join(' ')) : null; notify(); return recovered; },
    change(values) { desired = checkedValues(values); return api.retry(); },
    retry() {
      if (running) { notify(); return running; }
      if (!writable) { error = storageError('unsupported-version', 'Reload with a compatible app to save this stored preference version. The original is retained.'); state = 'error'; notify(); return Promise.reject(error); }
      state = 'saving'; error = null; notify();
      running = Promise.resolve().then(async () => {
        for (;;) {
          const values = structuredClone(desired), next = { singleton: 'singleton', settingsVersion: 2, version: version === null ? 0 : version + 1, values };
          const result = await storage.saveSettings(next, { expectedVersion: version }); version = result.version; record = next;
          if (canonical(values) === canonical(desired)) break;
        }
        state = 'saved'; return record;
      }).catch((e) => { state = e.code === 'conflict' ? 'conflict' : 'error'; error = e; throw e; }).finally(() => { running = null; notify(); });
      return running;
    }
  }; return api;
}
