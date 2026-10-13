const create = (doc, tag, className, text = '') => {
  const node = doc.createElement(tag); node.className = className; node.textContent = text; return node;
};

/** Measure at physical Letter widths; split long literal text, never clip answers/credits. */
export function paginateExercise(doc, spec, pack, orientation) {
  const stage = create(doc, 'section', 'pagination-stage'); stage.dataset.orientation = orientation;
  doc.body.append(stage);
  const pages = [];
  let content;
  function nextPage() {
    if (pages.length >= 64) throw new Error('Exercise exceeds 64 text pages; use a smaller lesson.');
    const page = create(doc, 'section', 'exercise-page');
    page.append(create(doc, 'header', 'sheet-page-heading', `Map Literacy — ${spec.kind}`));
    content = create(doc, 'div', 'sheet-content'); page.append(content);
    page.append(create(doc, 'footer', 'sheet-footer')); stage.append(page); pages.push(page);
  }
  const fits = () => content.scrollHeight <= content.clientHeight + 1;
  try {
    nextPage();
    for (const block of spec.blocks) {
      const tag = block.type === 'heading' ? 'h2' : 'p', className = `sheet-block sheet-${block.type}`;
      if (block.type === 'answer-space') {
        const space = create(doc, 'div', className); space.setAttribute('aria-label', 'Space for handwritten answer'); content.append(space);
        if (!fits()) { space.remove(); nextPage(); content.append(space); }
        if (!fits()) throw new Error('Answer space cannot fit this page layout.');
        continue;
      }
      let remaining = block.text;
      while (remaining.length) {
        const node = create(doc, tag, className, remaining); content.append(node);
        if (fits()) break;
        node.remove();
        if (content.children.length) { nextPage(); continue; }
        content.append(node);
        let lo = 1, hi = remaining.length, best = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2); node.textContent = remaining.slice(0, mid);
          if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        if (!best) throw new Error('Text cannot fit this page layout.');
        // Keep UTF-16 surrogate pairs intact at the page boundary.
        if (best < remaining.length && /[\uD800-\uDBFF]/.test(remaining[best - 1])) best--;
        if (!best) throw new Error('Text cannot fit this page layout.');
        node.textContent = remaining.slice(0, best); remaining = remaining.slice(best);
        if (remaining) nextPage();
      }
    }
    pages.forEach((page, i) => { page.querySelector('.sheet-footer').textContent = `${spec.kind} · ${pack.id} revision ${pack.revision} · Page ${i + 2} of ${pages.length + 1}${spec.draft ? ' · UNREVIEWED DRAFT' : ''}`; });
    return pages;
  } finally { stage.remove(); }
}
