export const OPTION_LIMIT = 200;

export function matchingOptions(items, query, selected, limit = OPTION_LIMIT) {
  const term = query.trim().toLocaleLowerCase('en-US');
  const matches = items.filter((item) => !term || item.text.toLocaleLowerCase('en-US').includes(term));
  const visible = matches.slice(0, limit);
  const pinned = items.find((item) => item.id === selected);
  if (pinned && !visible.some((item) => item.id === pinned.id)) visible.push(pinned);
  return { visible, matches: matches.length, total: items.length };
}

/** Native keyboard/touch select; all items remain findable, only options are bounded. */
export function createSearchSelect({ select, filter, summary, placeholder }) {
  let items = [];
  function refresh(selected = select.value) {
    const result = matchingOptions(items, filter.value, selected);
    const fragment = document.createDocumentFragment(); fragment.append(new Option(placeholder, ''));
    for (const item of result.visible) { const option = new Option(item.text, item.id); option.disabled = Boolean(item.disabled); fragment.append(option); }
    select.replaceChildren(fragment); select.value = result.visible.some((item) => item.id === selected) ? selected : '';
    summary.textContent = `${result.matches} matches of ${result.total}; showing up to ${OPTION_LIMIT}${selected ? ' plus the selected item' : ''}. Search to find other items.`;
  }
  filter.addEventListener('input', () => refresh());
  return {
    set(values, selected = '', reset = false) { items = values; if (reset) filter.value = ''; refresh(selected); },
    choose(id) { refresh(id || ''); },
    enabled(value) { filter.disabled = !value; select.disabled = !value; }
  };
}
