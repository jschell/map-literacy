import { createLessonSession } from '../lesson/session.js';
const get = (id) => document.getElementById(id);
const messages = { correct: 'Correct.', incorrect: 'Try again.', 'needs-review': 'This answer needs review.', unanswered: 'Enter a valid answer before submitting.' };
export function createLessons({ getPack, getTrace }) {
  let controller = null;
  const status = (text) => { get('lesson-status').textContent = text; };
  function clearAnswer() { for (const id of ['answer-heading', 'answer-lon', 'answer-lat']) get(id).value = ''; }
  function refresh() {
    const state = controller?.snapshot(), active = state?.session.status === 'active', practicing = active && state.phase === 'practicing', e = state?.exercise;
    get('lesson-start').disabled = !getPack() || Boolean(active) || getPack().review.status !== 'reviewed' || !getPack().exercises.some((e) => e.review === 'reviewed');
    get('lesson-fields').disabled = !practicing;
    get('lesson-heading').hidden = e?.type !== 'heading'; get('lesson-endpoint').hidden = e?.type !== 'endpoint'; get('lesson-route').hidden = !['route', 'detour'].includes(e?.type);
    get('lesson-submit').disabled = !practicing; get('lesson-reset').disabled = !practicing;
    get('lesson-retry').disabled = !active || state.phase !== 'feedback'; get('lesson-next').disabled = !active || state.phase !== 'feedback'; get('lesson-end').disabled = !active;
    get('lesson-hint').disabled = !active || (state.session.hintCounts[e.id] ?? 0) >= e.hints.length;
    get('lesson-prompt').textContent = active ? `${state.session.index + 1}/${state.session.exerciseOrder.length} · ${e.prompt}` : 'Begin a session to answer reviewed exercises in pack order.';
    get('lesson-revision').textContent = state ? `Pack ${state.session.packId} · revision ${state.session.packRevision} · ${state.attempts.length} attempts · ${state.session.status}` : '';
    get('lesson-route').textContent = e && ['route', 'detour'].includes(e.type) ? `Use “Trace a path” below: start ${e.rubric.startNodeId}, end ${e.rubric.endNodeId}, mode ${e.rubric.mode}. Submit the current trace here.${e.rubric.objective === 'max-distance' ? ` Maximum distance: ${e.rubric.maxDistanceM} m.` : ' Any valid route is accepted.'}${e.scenario ? ` ${e.scenario.label} Closed directed edges: ${e.scenario.closedEdgeIds.join(', ')}.` : ''}` : '';
  }
  const run = (action) => { try { action(); } catch (error) { status(error.message); } refresh(); };
  get('lesson-start').addEventListener('click', () => run(() => { controller = createLessonSession(getPack()); clearAnswer(); get('lesson-hints').replaceChildren(); status('Session started. Answers stay in memory; refresh discards this session.'); }));
  get('lesson-submit').addEventListener('click', () => run(() => {
    const e = controller.snapshot().exercise; let answer;
    if (e.type === 'heading') answer = get('answer-heading').value.trim() ? { type: e.type, degrees: Number(get('answer-heading').value) } : null;
    else if (e.type === 'endpoint') answer = get('answer-lon').value.trim() && get('answer-lat').value.trim() ? { type: e.type, coordinate: [Number(get('answer-lon').value), Number(get('answer-lat').value)] } : null;
    else {
      const trace = getTrace();
      if (!trace || trace.startNodeId !== e.rubric.startNodeId || trace.mode !== e.rubric.mode) { status(`Choose start ${e.rubric.startNodeId} and mode ${e.rubric.mode} in the trace controls.`); return; }
      answer = { type: e.type, edgeIds: trace.edgeIds };
    }
    controller.setAnswer(answer); const score = controller.submit();
    status(`${messages[score.status]} ${score.reasonCode.replaceAll('-', ' ')}. ${Object.entries(score.metrics).map(([key, value]) => `${key}: ${Number(value.toFixed(2))}`).join(' · ')}`);
  }));
  get('lesson-reset').addEventListener('click', () => run(() => { controller.reset(); clearAnswer(); status('Draft answer cleared. Submitted attempts and hints are retained. The review trace is unchanged.'); }));
  get('lesson-retry').addEventListener('click', () => run(() => { controller.retry(); clearAnswer(); status('Try another answer. Earlier attempts and hints are retained.'); }));
  get('lesson-next').addEventListener('click', () => run(() => { controller.next(); clearAnswer(); get('lesson-hints').replaceChildren(); status(controller.snapshot().phase === 'completed' ? 'Session completed in memory. Refresh discards it.' : 'Next exercise. Choose a new trace when needed.'); }));
  get('lesson-end').addEventListener('click', () => run(() => { controller.end(); clearAnswer(); status('Session ended in memory. Refresh discards it.'); }));
  get('lesson-hint').addEventListener('click', () => run(() => { const hint = controller.hint(); if (hint !== null) { const li = document.createElement('li'); li.textContent = hint; get('lesson-hints').append(li); status('Hint shown. Hints are counted separately from correctness.'); } }));
  refresh();
  return { installed() { controller = null; clearAnswer(); get('lesson-hints').replaceChildren(); status('Memory only: refresh/import discards the session. No reviewed exercises are available unless the pack and exercise are reviewed. Practice while stationary.'); refresh(); }, packChanged() { this.installed(); status('Pack content changed. The old session has ended; review the new revision before practicing.'); } };
}
