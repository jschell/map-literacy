/** Task links use native history and anchors; changing tasks never replaces a pack/session. */
export function createTaskNavigation(onChange) {
  const get = id => document.getElementById(id);
  let current, handledHash;
  function show(anchor = location.hash.slice(1)) {
    handledHash = anchor;
    const target = get(anchor);
    const task = ['explore','practice','review'].includes(anchor) ? anchor
      : anchor === 'trace-title' ? 'review'
      : target?.closest('#task-materials') ? 'practice' : 'explore';
    document.body.dataset.task = task;
    get('task-explore').hidden = task !== 'explore';
    get('task-materials').hidden = task === 'explore';
    for (const value of ['explore','practice','review']) {
      const link = get(`nav-${value}`);
      if (value === task) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    }
    if (current !== task) {
      get('material-settings').open = task === 'review';
      get('lesson-entry').open = task === 'review' || !document.body.dataset.packReady;
    }
    current = task;
    onChange();
    if (anchor) (target ?? get(task === 'explore' ? 'explorer-title' : task === 'review' ? 'review-title' : 'materials-title')).focus();
  }
  window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== handledHash) show(); });
  // Reveal/focus synchronously on activation, then allow native anchor history.
  // The later hashchange must not steal focus after a user has already pressed Tab.
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => show(link.getAttribute('href').slice(1))));
  show();
}
