/**
 * Generic runtime for /apps/* pages. Everything is driven by data attributes so new apps get
 * routing, the floating pill nav, theme, tooltips, search, sheets, filters, sorting and CSV
 * export by writing markup only.
 *
 *  Views     <section data-view="id" data-title="Name">       routed by location.hash (#id)
 *  Nav       <a data-nav="id">  (pill + popover; [data-nav-more] marks overflow entries)
 *  Goto      <a href="#view" data-goto-target="elementId">    switch view, scroll + flash target
 *  Sheets    <button data-sheet-open="dialogId" data-sheet-item="key">  shows [data-sheet-panel=key]
 *  Filter    [data-filterable=list] > [data-item data-f-<key>=".." data-search=".."]
 *            [data-filter=list][data-key=<key>] > button[data-value]   ("all" resets)
 *            input[data-filter-search=list], [data-filter-count=list], [data-filter-empty=list]
 *            [data-filter-wrap=list] hides itself when none of its [data-item]s are visible
 *  Sort      select[data-sort=list] with option values "<key>:asc|desc" over data-s-<key>
 *  Export    button[data-export=list][data-filename] over visible items' data-csv (JSON array)
 *            and the list's data-csv-head (JSON array)
 *  Search    script#app-search-index (JSON [{type,title,sub,view,target?,open?}])
 *  Tooltip   any element with data-tip-title / data-tip-body
 */

type SearchItem = { type: string; title: string; sub?: string; view: string; target?: string; open?: string };

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/* ------------------------------------------------------------------ Views */

const views = $$('[data-view]');
const viewIds = views.map((v) => v.dataset.view!);
const subtitle = $('[data-view-subtitle]');
const pill = $('[data-pill-nav]');
const moreBtn = $('[data-pill-more]');
const baseTitle = document.title;

function currentView() {
  const id = decodeURIComponent(location.hash.slice(1));
  return viewIds.includes(id) ? id : viewIds[0];
}

function render(scroll = true) {
  const id = currentView();
  for (const v of views) v.classList.toggle('is-active', v.dataset.view === id);
  for (const a of $$('[data-nav]')) {
    if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const inMore = !!$(`[data-nav-more][data-nav="${id}"]`);
  moreBtn?.classList.toggle('is-active', inMore);
  const view = views.find((v) => v.dataset.view === id);
  const name = view?.dataset.title ?? '';
  if (subtitle) subtitle.textContent = name;
  document.title = id === viewIds[0] ? baseTitle : `${name} · ${baseTitle}`;
  // Keep the active pill button in view on narrow screens.
  $(`.pill-btn[data-nav="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (scroll) window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent('app:view', { detail: id }));
}

function go(view: string, target?: string) {
  closeMore();
  // pushState doesn't fire hashchange, so render synchronously before scrolling to the target.
  if (location.hash.slice(1) !== view) history.pushState(null, '', `#${view}`);
  render(!target);
  if (target) {
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      if (!el) return;
      // A filtered-out target: clear that list's filters so it can be shown.
      const list = el.closest<HTMLElement>('[data-filterable]')?.dataset.filterable;
      if (list && el.closest('[hidden]')) resetFilter(list);
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    });
  }
}

window.addEventListener('hashchange', () => render(true));
window.addEventListener('popstate', () => render(true));

document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-goto-target]');
  if (!a) return;
  e.preventDefault();
  a.closest('dialog')?.close();
  go(a.hash.slice(1) || currentView(), a.dataset.gotoTarget);
});

/* ------------------------------------------------------------------ Pill "More" popover */

function closeMore() {
  pill?.classList.remove('open');
  moreBtn?.setAttribute('aria-expanded', 'false');
}
moreBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = !pill!.classList.contains('open');
  pill!.classList.toggle('open', open);
  moreBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => {
  if (!pill?.classList.contains('open')) return;
  const t = e.target as Element;
  if (!t.closest('[data-pill-popover]') || t.closest('a')) closeMore();
});

/* ------------------------------------------------------------------ Theme */

for (const btn of $$('[data-theme-toggle]')) {
  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.theme = dark ? 'dark' : 'light';
    } catch {
      /* storage unavailable: theme still applies for this page */
    }
  });
}

/* ------------------------------------------------------------------ Tooltip */

const tip = document.createElement('div');
tip.className = 'app-tooltip';
tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
let tipFor: Element | null = null;

function showTip(el: HTMLElement, x?: number, y?: number) {
  tipFor = el;
  tip.replaceChildren();
  const b = document.createElement('b');
  b.textContent = el.dataset.tipTitle ?? '';
  tip.append(b);
  if (el.dataset.tipBody) tip.append(document.createTextNode(el.dataset.tipBody));
  const r = el.getBoundingClientRect();
  const px = x ?? r.left + r.width / 2;
  const py = y ?? r.top;
  tip.classList.add('show');
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.min(Math.max(8, px - w / 2), window.innerWidth - w - 8);
  const top = py - h - 12 < 8 ? py + 18 : py - h - 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
function hideTip() {
  tipFor = null;
  tip.classList.remove('show');
}
document.addEventListener('pointermove', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-tip-title]');
  if (!el) return tipFor && hideTip();
  if (e.pointerType === 'touch') return;
  showTip(el, e.clientX, e.clientY);
});
document.addEventListener('focusin', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-tip-title]');
  if (el) showTip(el);
});
document.addEventListener('focusout', hideTip);
document.addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('pointerdown', (e) => {
  // Tap to show on touch screens.
  const el = (e.target as Element).closest<HTMLElement>('[data-tip-title]');
  if (e.pointerType === 'touch' && el && !el.closest('a,button')) showTip(el);
  else if (!el) hideTip();
});

/* ------------------------------------------------------------------ Sheets */

function openSheet(dialogId: string, item?: string) {
  const dlg = document.getElementById(dialogId) as HTMLDialogElement | null;
  if (!dlg) return;
  if (item) {
    for (const p of $$('[data-sheet-panel]', dlg)) p.hidden = p.dataset.sheetPanel !== item;
    const panel = $(`[data-sheet-panel="${item}"]`, dlg);
    const title = $('[data-sheet-title]', dlg);
    if (title && panel?.dataset.sheetName) title.textContent = panel.dataset.sheetName;
  }
  if (!dlg.open) dlg.showModal();
  $('.sheet-body', dlg)?.scrollTo({ top: 0 });
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const opener = t.closest<HTMLElement>('[data-sheet-open]');
  if (opener) {
    e.preventDefault();
    openSheet(opener.dataset.sheetOpen!, opener.dataset.sheetItem);
    return;
  }
  const closer = t.closest('[data-sheet-close]');
  if (closer) closer.closest('dialog')?.close();
});
// Click on the backdrop closes a dialog.
for (const dlg of $$<HTMLDialogElement>('dialog')) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}

/* ------------------------------------------------------------------ Filters & sort */

const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

function applyFilter(list: string) {
  const root = $(`[data-filterable="${list}"]`);
  if (!root) return;
  const active: Record<string, string> = {};
  for (const g of $$(`[data-filter="${list}"]`)) {
    const v = $('[aria-pressed="true"]', g)?.dataset.value ?? 'all';
    if (v !== 'all') active[g.dataset.key!] = v;
  }
  const q = normalize(($<HTMLInputElement>(`[data-filter-search="${list}"]`)?.value ?? '').trim());
  let shown = 0;
  for (const item of $$('[data-item]', root)) {
    const ok =
      Object.entries(active).every(([k, v]) => (item.getAttribute(`data-f-${k}`) ?? '').split('|').includes(v)) &&
      (!q || normalize(item.dataset.search ?? item.textContent ?? '').includes(q));
    item.hidden = !ok;
    if (ok) shown++;
  }
  for (const w of $$(`[data-filter-wrap="${list}"]`)) w.hidden = !$$('[data-item]', w).some((i) => !i.hidden);
  const count = $(`[data-filter-count="${list}"]`);
  if (count)
    count.textContent = `${shown} ${shown === 1 ? (count.dataset.one ?? 'item') : (count.dataset.many ?? 'items')}`;
  const empty = $(`[data-filter-empty="${list}"]`);
  if (empty) empty.hidden = shown > 0;
}

function resetFilter(list: string) {
  for (const g of $$(`[data-filter="${list}"]`))
    for (const b of $$('button[data-value]', g)) b.setAttribute('aria-pressed', String(b.dataset.value === 'all'));
  const input = $<HTMLInputElement>(`[data-filter-search="${list}"]`);
  if (input) input.value = '';
  applyFilter(list);
}

document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>('[data-filter] button[data-value]');
  if (!btn) return;
  const group = btn.closest<HTMLElement>('[data-filter]')!;
  for (const b of $$('button[data-value]', group)) b.setAttribute('aria-pressed', String(b === btn));
  applyFilter(group.dataset.filter!);
});
for (const input of $$<HTMLInputElement>('[data-filter-search]')) {
  input.addEventListener('input', () => applyFilter(input.dataset.filterSearch!));
}

for (const sel of $$<HTMLSelectElement>('select[data-sort]')) {
  const sort = () => {
    const root = $(`[data-filterable="${sel.dataset.sort}"]`);
    if (!root) return;
    const [key, dir] = sel.value.split(':');
    const items = $$('[data-item]', root);
    const val = (el: HTMLElement) => el.getAttribute(`data-s-${key}`) ?? '';
    items.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const nx = Number(x);
      const ny = Number(y);
      const cmp = x !== '' && y !== '' && !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y);
      return dir === 'desc' ? -cmp : cmp;
    });
    const parent = items[0]?.parentElement;
    if (parent) for (const it of items) parent.appendChild(it);
  };
  sel.addEventListener('change', sort);
}

/* ------------------------------------------------------------------ CSV export */

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
for (const btn of $$('[data-export]')) {
  btn.addEventListener('click', () => {
    const root = $(`[data-filterable="${btn.dataset.export}"]`);
    if (!root) return;
    const head: unknown[] = JSON.parse(root.dataset.csvHead ?? '[]');
    const rows = $$('[data-item]', root)
      .filter((i) => !i.hidden && i.dataset.csv)
      .map((i) => JSON.parse(i.dataset.csv!) as unknown[]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = btn.dataset.filename ?? 'export.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/* ------------------------------------------------------------------ Search */

const searchDlg = $<HTMLDialogElement>('#app-search');
const searchInput = $<HTMLInputElement>('#app-search-input');
const searchList = $('#app-search-results');
const index: SearchItem[] = JSON.parse($('#app-search-index')?.textContent ?? '[]');
let results: SearchItem[] = [];
let sel = 0;

function renderResults() {
  if (!searchList || !searchInput) return;
  const q = normalize(searchInput.value.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  results = (
    terms.length
      ? index.filter((it) => {
          const hay = normalize(`${it.title} ${it.sub ?? ''} ${it.type}`);
          return terms.every((t) => hay.includes(t));
        })
      : index.filter((it) => it.type === 'View')
  ).slice(0, 40);
  sel = 0;
  searchList.replaceChildren(
    ...results.map((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'search-result';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === sel));
      const type = document.createElement('span');
      type.className = 'search-result-type';
      type.textContent = it.type;
      const text = document.createElement('span');
      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = it.title;
      text.append(title);
      if (it.sub) {
        const sub = document.createElement('span');
        sub.className = 'search-result-sub';
        sub.textContent = it.sub;
        text.append(sub);
      }
      b.append(type, text);
      b.addEventListener('click', () => choose(it));
      return b;
    })
  );
  if (!results.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No matches.';
    searchList.append(p);
  }
}

function choose(it: SearchItem) {
  searchDlg?.close();
  go(it.view, it.target);
  if (it.open) setTimeout(() => $<HTMLElement>(it.open!)?.click(), 60);
}

function openSearch() {
  if (!searchDlg || !searchInput) return;
  searchInput.value = '';
  renderResults();
  searchDlg.showModal();
  searchInput.focus();
}

for (const b of $$('[data-search-open]')) b.addEventListener('click', openSearch);
searchInput?.addEventListener('input', renderResults);
searchInput?.addEventListener('keydown', (e) => {
  if (!results.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    $$('.search-result', searchList!).forEach((b, i) => b.setAttribute('aria-selected', String(i === sel)));
    $$('.search-result', searchList!)[sel]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    choose(results[sel]);
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  } else if (e.key === '/' && !(e.target as Element).closest('input,textarea,select,[contenteditable]')) {
    e.preventDefault();
    openSearch();
  } else if (e.key === 'Escape') {
    closeMore();
  }
});

render(false);
