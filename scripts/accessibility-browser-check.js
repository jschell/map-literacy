import assert from 'node:assert/strict';

/** Keyboard input and browser semantics; not a screen-reader or WCAG certification. */
export async function checkAccessibility(page, base) {
  const focused = (id) => page.waitForFunction((value) => document.activeElement?.id === value, id);
  const saved = () => page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
  // Reach controls using the actual sequential focus order, never locator.focus/click.
  async function reach(id) {
    for (let i = 0; i < 160; i++) {
      if (await page.evaluate((value) => document.activeElement?.id === value, id)) {
        assert.equal(await page.locator(`#${id}`).evaluate((node) => {
          const css = getComputedStyle(node);
          return node.matches(':focus-visible') && css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) >= 2;
        }), true, `${id} has visible keyboard focus`);
        return;
      }
      await page.keyboard.press('Tab');
    }
    throw new Error(`Keyboard cannot reach ${id}`);
  }
  async function activate(id) { await reach(id); await page.keyboard.press('Enter'); }
  async function type(id, text) { await reach(id); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(text); }
  async function choose(id, value) {
    await reach(id);
    const options = await page.locator(`#${id} option`).evaluateAll((nodes) => nodes.filter((n) => !n.disabled).map((n) => n.value));
    const index = options.indexOf(value); assert.ok(index >= 0, `${id} offers ${value}`);
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(`#${id}`).inputValue(), value);
  }
  async function submit(expected, nextFocus) {
    await activate('lesson-submit'); await saved();
    assert.ok((await page.locator('#lesson-status').textContent()).startsWith(expected));
    await focused(nextFocus);
  }
  try {
    await page.goto(base);
    await page.waitForFunction(() => !document.getElementById('demo').disabled && !document.getElementById('variant').disabled);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to map');
    assert.equal(await page.locator('.skip-links a').first().isVisible(), true);
    await page.keyboard.press('Enter'); await focused('map-panel');
    await activate('skip-lessons'); await focused('lesson-title');
    await activate('skip-trace'); await focused('trace-title');
    // Noninteractive jump targets leave the sequential order unchanged.
    assert.equal(await page.locator('[tabindex]').evaluateAll((nodes) => nodes.every((n) => Number(n.getAttribute('tabindex')) <= 0)), true);
    await activate('demo'); await page.locator('#map svg').waitFor();
    await activate('preferences-defaults');
    const unnamed = await page.locator('input, select, button').evaluateAll((nodes) => nodes.filter((node) => {
      if (node.getAttribute('aria-label')?.trim()) return false;
      const refs = (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
      if (refs.some((id) => document.getElementById(id)?.textContent.trim())) return false;
      return node.tagName === 'BUTTON' ? !node.textContent.trim() : ![...node.labels].some((label) => label.textContent.trim());
    }).map((node) => node.id || node.outerHTML));
    assert.deepEqual(unnamed, [], 'all native controls have names');
    await page.getByRole('region', { name: 'Map viewer' }).waitFor();
    await page.getByRole('region', { name: 'Practice lessons' }).waitFor();
    await page.getByRole('img', { name: /Synthetic streets and bridge crossing/ }).waitFor();
    assert.ok((await page.locator('#lesson-fields').getAttribute('aria-describedby')).includes('lesson-prompt'));
    const semantics = await page.locator('main').ariaSnapshot();
    assert.ok(semantics.includes('button "Begin lesson session"'));
    assert.ok(semantics.includes('combobox "Feature selection'));
    await activate('lesson-start'); await saved(); await focused('answer-heading');
    await type('answer-heading', '180'); await submit('Try again.', 'lesson-retry');
    await page.keyboard.press('Enter'); await saved(); await focused('answer-heading');
    await type('answer-heading', '0');
    // Delay reporting one completed commit so navigation during Saving is deterministic.
    await page.evaluate(() => {
      window.keyboardOriginalTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (names, mode, ...args) {
        const tx = window.keyboardOriginalTransaction.call(this, names, mode, ...args);
        if (mode === 'readwrite' && Array.from(names).includes('sessions')) {
          Object.defineProperty(tx, 'oncomplete', { set(handler) {
            tx.addEventListener('complete', (event) => { window.releaseKeyboardSave = () => handler(event); }, { once: true });
          } });
        }
        return tx;
      };
    });
    await activate('lesson-hint');
    await page.waitForFunction(() => typeof window.releaseKeyboardSave === 'function');
    await reach('feature-filter');
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.keyboardOriginalTransaction; window.releaseKeyboardSave(); });
    await saved(); await focused('feature-filter'); // Finishing an old save must not steal focus.
    await submit('Correct.', 'lesson-next');
    await page.keyboard.press('Enter'); await saved(); await focused('endpoint-reference');
    await submit('Enter a valid answer', 'endpoint-reference');
    await choose('endpoint-reference', 'A'); await submit('Correct.', 'lesson-next');
    await page.keyboard.press('Enter'); await saved(); await focused('trace-edge');
    assert.equal(await page.locator('#trace-start').inputValue(), 'A');
    for (const edge of ['AB', 'BC']) { await choose('trace-edge', edge); await activate('trace-add'); }
    await submit('Correct.', 'lesson-next');
    await page.keyboard.press('Enter'); await saved(); await focused('trace-edge');
    assert.equal(await page.locator('#trace-steps li').count(), 0);
    for (const edge of ['AB', 'BC']) { await choose('trace-edge', edge); await activate('trace-add'); }
    await submit('Try again.', 'lesson-retry');
    assert.ok((await page.locator('#lesson-status').textContent()).includes('closed edge'));
    await page.keyboard.press('Enter'); await saved(); await focused('trace-edge');
    await activate('trace-clear');
    for (const edge of ['AD', 'DC']) { await choose('trace-edge', edge); await activate('trace-add'); }
    await submit('Correct.', 'lesson-next');
    await page.keyboard.press('Enter'); await saved(); await focused('lesson-export');
    assert.ok((await page.locator('#lesson-status').textContent()).includes('Session completed'));
    const downloadEvent = page.waitForEvent('download'); await page.keyboard.press('Enter');
    assert.ok(await (await downloadEvent).path(), 'keyboard session backup download');
    // Named native controls also provide a keyboard alternative to map hit targets.
    await choose('feature', 'road:AB');
    assert.ok((await page.locator('#selection').textContent()).includes('road:AB'));
    await choose('variant', 'blank');
    await choose('orientation', 'portrait');
    await page.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('saved in this browser'));
    const preferencesDownload = page.waitForEvent('download'); await activate('preferences-export');
    assert.ok(await (await preferencesDownload).path(), 'keyboard view preference download');
    await page.evaluate(() => { window.print = () => { window.keyboardPrintRequested = true; }; });
    await activate('print');
    assert.equal(await page.evaluate(() => window.keyboardPrintRequested), true, 'keyboard print activation');
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      await reach('lesson-export');
      const bounds = await page.locator('#lesson-export').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'focused action fits viewport');
    }
    await choose('trace-start', 'A'); await choose('trace-edge', 'AB'); await activate('trace-add');
    await page.emulateMedia({ forcedColors: 'active' }); await reach('trace-clear');
    assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
    return { keyboardExercises: 4, retryAndHint: 'passed', namedControlsAndRegions: 'passed', focusAfterSave: 'passed', noDelayedFocusSteal: 'passed', keyboardBackup: 'passed', keyboardPreferencesAndPrint: 'passed', reflowWidths: [640, 320], forcedColorsFocus: 'passed' };
  } finally {
    await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1280, height: 1000 });
    if (!page.isClosed()) await page.goto(base);
  }
}
