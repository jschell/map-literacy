import { terrainExerciseAnnotations } from '../terrain/lesson-pack.js';
import { openStorage } from '../storage/indexeddb.js';
import { createAutosave, findStoredVersion, forkSessionBundle } from '../storage/autosave.js';
import { readBackup, serializeBackup } from '../storage/backup.js';
import { createLessonSession, resumeLessonSession } from '../lesson/session.js';
const get = (id) => document.getElementById(id);
const messages = { correct: 'Correct.', incorrect: 'Try again.', 'needs-review': 'This answer needs review.', unanswered: 'Enter a valid answer before submitting.' };
export function createLessons({ getPack, getTrace, installPack, cancelPackLoad }) {
  let controller = null, restoreJob = null, storage = null, storageReady = false, canDiscard = false, listJob = 0, nextPage = null, connecting = null;
  let pendingFocus = null, viewExerciseKey = null;
  // A save may disable the button that a keyboard user just activated. Restore
  // focus only for that action, and never after the user moves elsewhere.
  document.addEventListener('focusin', (event) => { if (pendingFocus && event.target !== pendingFocus.origin) pendingFocus = null; });
  function finishKeyboardAction() {
    if (!pendingFocus || !storageReady || writer.snapshot().state === 'saving') return;
    const pending = pendingFocus; pendingFocus = null;
    const state = controller?.snapshot();
    if (state?.session.id !== pending.sessionId || state.session.version !== pending.version || ![document.body, pending.origin].includes(document.activeElement)) return;
    const answerTarget = state.exercise.type === 'heading' ? 'answer-heading' : state.exercise.type === 'endpoint' ? 'answer-lon' : state.exercise.type === 'relative-slope' ? 'answer-slope' : state.exercise.type === 'contour-elevation' ? 'answer-elevation' : 'trace-start';
    const last = state.attempts.find((a) => a.id === state.session.answers[state.exercise.id]);
    const target = state.phase === 'completed' ? 'lesson-export' : state.phase === 'feedback' ? (last?.result.status === 'correct' ? 'lesson-next' : 'lesson-retry') : pending.origin.id === 'lesson-hint' && !get('lesson-hint').disabled ? 'lesson-hint' : answerTarget;
    get(target).focus();
  }
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const bundle = () => { const { session, attempts } = controller.snapshot(); return { pack: getPack(), session, attempts }; };
  const writer = createAutosave({ storage: { commit: (...args) => storage ? storage.commit(...args) : Promise.reject(Object.assign(new Error('Browser storage is unavailable.'), { code: 'storage-unavailable' })) },
    emit, onChange: (value) => { refresh(); if (value.state === 'saved') refreshList(); } });
  function guardReplacement() {
    if (controller && (writer.snapshot().state === 'saving' || (!canDiscard && ['error', 'conflict', 'idle'].includes(writer.snapshot().state)))) throw new Error('Progress is not saved. Wait for saving, retry the save or download a session backup before replacing it.');
  }
  async function refreshList(afterId) {
    if (!storage) return; const token = ++listJob;
    try {
      const page = await storage.listSessions({ afterId }); if (token !== listJob) return;
      const previous = get('saved-session').value; get('saved-session').replaceChildren(new Option('Choose a saved session', ''));
      for (const s of page.sessions) get('saved-session').add(new Option(`${s.packId} r${s.packRevision} · ${s.status} · ${s.updatedAt} · ${s.id}`, s.id));
      if (page.sessions.some((s) => s.id === previous)) get('saved-session').value = previous;
      nextPage = page.next; get('saved-list-status').textContent = `${page.sessions.length} saved sessions on this page${nextPage ? '; more available' : ''}.`; refresh();
    } catch (e) { if (token === listJob) { get('saved-list-status').textContent = `Saved sessions unavailable: ${e.message}`; } }
  }
  function connectStorage() { if (connecting) return connecting; connecting = doConnectStorage().finally(() => { connecting = null; }); return connecting; }
  async function doConnectStorage() {
    storageReady = false; refresh();
    try {
      storage?.close(); const opening = new AbortController();
      storage = await openStorage({ signal: opening.signal, onBlocked: () => { opening.abort(); get('saved-list-status').textContent = 'Close other tabs to unblock storage, then retry saving.'; }, onVersionChange: () => { storage = null; get('saved-list-status').textContent = 'Storage version changed. Download pending progress and reload.'; refresh(); } });
      await refreshList();
    } catch (e) { storage = null; get('saved-list-status').textContent = `Storage unavailable: ${e.message} Practice in memory and download backups.`; }
    finally { storageReady = true; refresh(); }
  }
  const save = () => { canDiscard = false; void writer.save(bundle()).catch(() => {}); };
  function restored(next, version) { controller = next; clearAnswer(); get('lesson-hints').replaceChildren(); writer.bind(bundle(), version);
    const state = controller.snapshot(); for (const text of state.exercise.hints.slice(0, state.session.hintCounts[state.exercise.id])) { const li = document.createElement('li'); li.textContent = text; get('lesson-hints').append(li); }
  }
  const cancelPending = () => { restoreJob?.abort(); restoreJob = null; };
  const status = (text) => { get('lesson-status').textContent = text; };
  function clearAnswer() { for (const id of ['answer-heading', 'answer-lon', 'answer-lat', 'answer-elevation', 'answer-slope']) get(id).value = ''; }
  function refresh() {
    const saveState = writer.snapshot(); const busy = !storageReady || saveState.state === 'saving';
    get('save-status').textContent = !storageReady ? 'Opening browser storage…' : !controller ? (storage ? 'Browser storage ready. Keep downloaded backups against browser data loss.' : 'Memory only: browser storage is unavailable. Download session backups.') : !storage ? 'Changes are not saved: browser storage connection is unavailable. Download a session backup, retry storage or reload.' : saveState.state === 'saved' ? `Saved in this browser · version ${saveState.savedVersion}. Keep a downloaded backup.` : saveState.state === 'saving' ? 'Saving progress…' : saveState.state === 'conflict' ? (saveState.error?.code === 'revision-conflict' ? 'Changes are not saved: this pack revision already has different stored content. Download progress and select a reviewed pack with a new revision.' : 'Changes are not saved: another session version conflicts. Download, reload latest or save as a new session.') : `Changes are not saved. ${saveState.error?.message ?? ''} Retry saving or download a session backup.`;
    get('save-retry').disabled = busy || (Boolean(storage) && (!controller || saveState.state === 'saved'));
    get('save-retry').textContent = controller ? 'Retry saving' : 'Retry browser storage';
    get('save-reload').disabled = !storage || !controller || busy || saveState.state !== 'conflict' || saveState.error?.code === 'revision-conflict';
    get('save-fork').disabled = !controller || busy || saveState.state !== 'conflict' || saveState.error?.code === 'revision-conflict';
    get('saved-resume').disabled = !storage || busy || !get('saved-session').value;
    get('saved-refresh').disabled = !storage || busy; get('saved-next').disabled = !storage || busy || !nextPage;
    const state = controller?.snapshot(), active = state?.session.status === 'active', practicing = active && !busy && state.phase === 'practicing', e = state?.exercise;
    get('lesson-export').disabled = !controller;
    get('lesson-start').disabled = busy || !getPack() || Boolean(active) || getPack().review.status !== 'reviewed' || !getPack().exercises.some((e) => e.review === 'reviewed');
    get('lesson-fields').disabled = !practicing;
    get('lesson-slope').hidden = e?.type !== 'relative-slope';
    get('lesson-elevation').hidden = e?.type !== 'contour-elevation';
    get('lesson-heading').hidden = e?.type !== 'heading'; get('lesson-endpoint').hidden = e?.type !== 'endpoint'; get('lesson-route').hidden = !['route', 'detour'].includes(e?.type);
    get('lesson-submit').disabled = !practicing; get('lesson-reset').disabled = !practicing;
    get('lesson-retry').disabled = busy || !active || state.phase !== 'feedback'; get('lesson-next').disabled = busy || !active || state.phase !== 'feedback'; get('lesson-end').disabled = busy || !active;
    get('lesson-hint').disabled = busy || !active || (state.session.hintCounts[e.id] ?? 0) >= e.hints.length;
    get('lesson-prompt').textContent = active ? `${state.session.index + 1}/${state.session.exerciseOrder.length} · ${e.prompt}` : 'Begin a session to answer reviewed exercises in pack order.';
    get('lesson-revision').textContent = state ? `Pack ${state.session.packId} · revision ${state.session.packRevision} · ${state.attempts.length} attempts · ${state.session.status}` : '';
    get('lesson-route').textContent = e && ['route', 'detour'].includes(e.type) ? `Use “Trace a path” below: start ${e.rubric.startNodeId}, end ${e.rubric.endNodeId}, mode ${e.rubric.mode}. Submit the current trace here.${e.rubric.objective === 'max-distance' ? ` Maximum distance: ${e.rubric.maxDistanceM} m.` : ' Any valid route is accepted.'}${e.scenario ? ` ${e.scenario.label} Closed directed edges: ${e.scenario.closedEdgeIds.join(', ')}.` : ''}` : '';
    const nextView = active ? e?.id : null;
    if (nextView !== viewExerciseKey) { viewExerciseKey = nextView; emit('lesson-view-changed'); }
    finishKeyboardAction();
  }
  const run = (action, persist = true, event) => {
    if (persist && (!storageReady || writer.snapshot().state === 'saving')) { status('Wait for the current save before continuing.'); return; }
    if (persist) cancelPending();
    const before = controller?.snapshot();
    try {
      action(); const after = controller?.snapshot();
      const focusRequest = event?.detail === 0 && after ? { origin: event.currentTarget, sessionId: after.session.id, version: after.session.version } : null;
      if (persist && after && (!before || before.session.id !== after.session.id || before.session.version !== after.session.version)) {
        if (!before || before.session.id !== after.session.id) writer.bind(bundle());
        for (const attempt of after.attempts.slice(before?.session.id === after.session.id ? before.attempts.length : after.attempts.length)) {
          emit('answer-submitted', { sessionId: after.session.id, exerciseId: attempt.exerciseId, answer: attempt.answer, attemptId: attempt.id }); emit('answer-scored', { attemptId: attempt.id, result: attempt.result });
        }
        for (const id of Object.keys(after.session.hintCounts)) if ((before?.session.hintCounts[id] ?? 0) < after.session.hintCounts[id]) emit('hint-shown', { sessionId: after.session.id, exerciseId: id, hintIndex: after.session.hintCounts[id] - 1 });
        pendingFocus = focusRequest; save();
      } else pendingFocus = focusRequest;
    } catch (error) { status(error.message); } refresh();
  };
  get('lesson-start').addEventListener('click', (event) => run(() => { guardReplacement(); controller = createLessonSession(getPack()); clearAnswer(); get('lesson-hints').replaceChildren(); status('Session started. Check the save status after accepted actions; unfinished answers stay in memory.'); }, true, event));
  get('lesson-submit').addEventListener('click', (event) => run(() => {
    const e = controller.snapshot().exercise; let answer;
    if (e.type === 'heading') answer = get('answer-heading').value.trim() ? { type: e.type, degrees: Number(get('answer-heading').value) } : null;
    else if (e.type === 'endpoint') answer = get('answer-lon').value.trim() && get('answer-lat').value.trim() ? { type: e.type, coordinate: [Number(get('answer-lon').value), Number(get('answer-lat').value)] } : null;
    else if (e.type === 'relative-slope') answer = get('answer-slope').value ? {type:e.type,choice:get('answer-slope').value} : null;
    else if (e.type === 'contour-elevation') answer = get('answer-elevation').value.trim() ? {type:e.type,elevationM:Number(get('answer-elevation').value)} : null;
    else {
      const trace = getTrace();
      if (!trace || trace.startNodeId !== e.rubric.startNodeId || trace.mode !== e.rubric.mode) { status(`Choose start ${e.rubric.startNodeId} and mode ${e.rubric.mode} in the trace controls.`); return; }
      answer = { type: e.type, edgeIds: trace.edgeIds };
    }
    controller.setAnswer(answer); const score = controller.submit();
    status(`${messages[score.status]} ${score.reasonCode.replaceAll('-', ' ')}. ${e.type === 'relative-slope' ? 'For the same elevation change, compare the horizontal distances between the end ticks.' : e.type === 'contour-elevation' && Number.isFinite(score.metrics.elevationErrorM) ? `Elevation error: ${Number(score.metrics.elevationErrorM.toFixed(2))} m` : Object.entries(score.metrics).map(([key, value]) => `${key}: ${Number(value.toFixed(2))}`).join(' · ')}`);
  }, true, event));
  get('lesson-reset').addEventListener('click', () => run(() => { controller.reset(); emit('session-reset', { sessionId: controller.snapshot().session.id, exerciseId: controller.snapshot().exercise.id }); clearAnswer(); status('Draft answer cleared. Submitted attempts and hints are retained. The review trace is unchanged.'); }));
  get('lesson-retry').addEventListener('click', (event) => run(() => { controller.retry(); clearAnswer(); status('Try another answer. Earlier attempts and hints are retained.'); }, true, event));
  get('lesson-next').addEventListener('click', (event) => run(() => { controller.next(); clearAnswer(); get('lesson-hints').replaceChildren(); status(controller.snapshot().phase === 'completed' ? 'Session completed. Check the save status before closing.' : 'Next exercise. Choose a new trace when needed.'); }, true, event));
  get('lesson-end').addEventListener('click', (event) => run(() => { controller.end(); clearAnswer(); status('Session ended. Check the save status before closing.'); }, true, event));
  get('lesson-hint').addEventListener('click', (event) => run(() => { const hint = controller.hint(); if (hint !== null) { const li = document.createElement('li'); li.textContent = hint; get('lesson-hints').append(li); status('Hint shown. Hints are counted separately from correctness.'); } }, true, event));
  get('lesson-export').addEventListener('click', () => run(() => {
    const { session, attempts } = controller.snapshot();
    const text = serializeBackup({ backupVersion: 1, exportedAt: new Date().toISOString(), packs: [getPack()], sessions: [session], attempts, settings: {} });
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), link = document.createElement('a');
    link.href = url; link.download = `map-literacy-session-${session.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    canDiscard = true; status('Session backup downloaded. Keep the file to restore committed attempts and hints. Unfinished answers and review traces are not included.');
  }, false));
  get('lesson-import').addEventListener('change', async () => {
    const file = get('lesson-import').files[0]; get('lesson-import').value = ''; if (!file) return;
    cancelPackLoad(); cancelPending(); const current = new AbortController(); restoreJob = current;
    status('Reading and validating session backup…');
    try {
      const backup = await readBackup(file, current.signal);
      if (restoreJob !== current || current.signal.aborted) return;
      if (Object.keys(backup.settings).length) throw new Error('This file includes view preferences. Restore a progress-only session backup here.');
      if (backup.sessions.length !== 1 || backup.packs.length !== 1) throw new Error('Restore requires a per-session backup containing exactly one session and its pack revision.');
      const session = backup.sessions[0], pack = backup.packs.find((p) => p.id === session.packId && p.revision === session.packRevision);
      const next = resumeLessonSession({ pack, session, attempts: backup.attempts });
      guardReplacement();
      let version = null;
      if (!storageReady) await connectStorage();
      if (storage) { try { version = await findStoredVersion(storage, { pack, session, attempts: backup.attempts }); } catch (e) { if (e.code !== 'conflict') throw e; version = undefined; } }
      if (restoreJob !== current || current.signal.aborted) return;
      installPack(pack); restored(next, version ?? null);
      if (version === undefined) { void writer.save(bundle()).catch(() => {}); } else if (version === null) save();
      const state = controller.snapshot();
      const last = state.attempts.find((a) => a.id === state.session.answers[state.exercise.id]);
      status(`Session restored from revision ${session.packRevision}. Unfinished answers and review traces were discarded.${last ? ` Last submitted answer: ${last.result.status}; ${last.result.reasonCode.replaceAll('-', ' ')}.` : ''} Check the save status and keep downloaded backups.`);
    } catch (error) { if (restoreJob === current && !current.signal.aborted) status(`Session not restored: ${error.message} The previous map and session are retained.`); }
    finally { if (restoreJob === current) restoreJob = null; refresh(); }
  });
  get('saved-session').addEventListener('change', () => { cancelPending(); refresh(); });
  get('saved-refresh').addEventListener('click', () => refreshList());
  get('saved-next').addEventListener('click', () => refreshList(nextPage));
  get('save-retry').addEventListener('click', async () => {
    if (!storage) await connectStorage();
    if (!controller || writer.snapshot().state === 'saving') return;
    try { if (storage && writer.snapshot().savedVersion === null) writer.bind(bundle(), await findStoredVersion(storage, bundle())); save(); }
    catch (e) { writer.markConflict(e.message); }
  });
  get('save-fork').addEventListener('click', () => run(() => { const value = forkSessionBundle(bundle()); restored(resumeLessonSession(value), null); status('Copied committed attempts and hints into a new session. The original stored session is retained.'); save(); }, false));
  get('saved-resume').addEventListener('click', async () => {
    let current; try {
      guardReplacement(); cancelPackLoad(); cancelPending(); current = new AbortController(); restoreJob = current;
      const value = await storage.loadSession(get('saved-session').value, { signal: current.signal });
      if (restoreJob !== current || current.signal.aborted) return;
      if (!value) throw new Error('Saved session no longer exists. Refresh the list.');
      const next = resumeLessonSession(value); installPack(value.pack); restored(next, value.session.version); status('Saved session resumed. Unfinished drafts and review traces are discarded.');
    } catch (e) { if (!current || (restoreJob === current && !current.signal.aborted)) status(`Session not resumed: ${e.message}`); } finally { if (restoreJob === current) restoreJob = null; refresh(); }
  });
  get('save-reload').addEventListener('click', async () => {
    let current; const id = controller.snapshot().session.id;
    try {
      cancelPackLoad(); cancelPending(); current = new AbortController(); restoreJob = current;
      const value = await storage.loadSession(id, { signal: current.signal });
      if (restoreJob !== current || current.signal.aborted) return;
      if (!value) throw new Error('Stored session is missing. Download or save as a new session.');
      const next = resumeLessonSession(value); canDiscard = true; installPack(value.pack); restored(next, value.session.version); status('Latest saved version resumed. Memory changes were discarded.');
    } catch (e) { if (!current || (restoreJob === current && !current.signal.aborted)) status(e.message); } finally { if (restoreJob === current) restoreJob = null; refresh(); }
  });
  window.addEventListener('focus', async () => {
    refreshList(); if (!storage || !controller || writer.snapshot().state !== 'saved') return;
    const id = controller.snapshot().session.id, version = writer.snapshot().savedVersion;
    try { const value = await storage.loadSession(id); if (controller?.snapshot().session.id === id && writer.snapshot().savedVersion === version && value?.session.version !== version) writer.markConflict('Another tab changed this session.'); } catch { /* The next write reports any storage error. */ }
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) void connectStorage(); });
  window.addEventListener('pagehide', () => { cancelPending(); storage?.close(); storage = null; });
  refresh(); void connectStorage();
  return { guardReplacement, cancelPending, annotations() { const state=controller?.snapshot(); return state?.session.status==='active' ? terrainExerciseAnnotations(getPack(),state.exercise) : null; }, installed() { cancelPending(); controller = null; clearAnswer(); get('lesson-hints').replaceChildren(); status('Select a reviewed pack to practice or resume a saved session. Unfinished answers are discarded on refresh. Practice while stationary.'); refresh(); }, packChanged() { this.installed(); status('Pack content changed. The old session has ended; review the new revision before practicing.'); } };
}
