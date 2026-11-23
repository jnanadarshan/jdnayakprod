/**
 * Entry point for the Fab MES app: warms the simulator up behind a splash screen, then runs the
 * live clock and wires every control. Rendering is "only the visible tab, once a second", and every
 * user action re-renders immediately.
 */
import { personaById, priorities, products, type AreaId, type E10, type PersonaId, type Priority } from '~/data/mes';
import { Fab, DAY, MIN } from './sim';
import * as V from './views';
import { $, $$, esc, icon, patch, persona, setPersona, can, whoCan } from './ui';

const VIEWS: { id: string; label: string }[] = JSON.parse($('#mes-views')?.textContent ?? '[]');
const SEED = 20261123;
const fab = new Fab(SEED, Date.now() - 7 * DAY);

let paused = false;
/** Simulated minutes per real second. */
let speed = 1;
let carry = 0;
let sheet: { kind: 'lot' | 'tool'; id: string } | null = null;

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(`mes:${k}`);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(`mes:${k}`, v);
    } catch {
      /* storage unavailable: setting lasts for this visit only */
    }
  },
};

/* ------------------------------------------------------------------ Rendering */

const renderers: Record<string, (f: Fab) => void> = {
  workspace: V.renderWorkspace,
  overview: V.renderOverview,
  lots: V.renderLots,
  dispatch: V.renderDispatch,
  equipment: V.renderEquipment,
  maintenance: V.renderMaintenance,
  alarms: V.renderAlarms,
  spc: V.renderSpc,
  yield: V.renderYield,
  holds: V.renderHolds,
};

const currentView = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  return VIEWS.some((v) => v.id === id) ? id : VIEWS[0].id;
};

let lastIndex = 0;
function render() {
  V.renderChrome(fab, paused);
  renderers[currentView()]?.(fab);
  if (sheet) renderSheet();
  if (Date.now() - lastIndex > 3000) {
    lastIndex = Date.now();
    const el = $('#app-search-index');
    if (el) el.textContent = JSON.stringify(V.searchIndex(fab, VIEWS));
  }
}

/* ------------------------------------------------------------------ Sheet (lot / tool detail) */

const sheetDlg = $<HTMLDialogElement>('#mes-sheet');
function renderSheet() {
  if (!sheet || !sheetDlg) return;
  const { title, body } = sheet.kind === 'lot' ? V.lotSheet(fab, sheet.id) : V.toolSheet(fab, sheet.id);
  patch($('[data-sheet-title]', sheetDlg), title);
  patch($('[data-sheet-body]', sheetDlg), body);
}
function openSheet(kind: 'lot' | 'tool', id: string) {
  if (!sheetDlg) return;
  const same = sheet?.kind === kind && sheet.id === id;
  sheet = { kind, id };
  renderSheet();
  if (!same) sheetDlg.scrollTo({ top: 0 });
  if (!sheetDlg.open) sheetDlg.showModal();
}
sheetDlg?.addEventListener('close', () => (sheet = null));

/* ------------------------------------------------------------------ Action dialog */

const dlg = $<HTMLDialogElement>('#mes-action');
const dlgForm = $<HTMLFormElement>('form', dlg ?? document);
let onOk: ((fd: FormData) => string | false | void) | null = null;

function ask(o: {
  title: string;
  sub?: string;
  body: string;
  ok: string;
  danger?: boolean;
  onOk: (fd: FormData) => string | false | void;
}) {
  if (!dlg || !dlgForm) return;
  $('[data-dlg-title]', dlg)!.textContent = o.title;
  const sub = $('[data-dlg-sub]', dlg)!;
  sub.textContent = o.sub ?? '';
  sub.hidden = !o.sub;
  $('[data-dlg-body]', dlg)!.innerHTML = o.body;
  const ok = $('[data-dlg-ok]', dlg)!;
  ok.textContent = o.ok;
  ok.className = `mes-btn ${o.danger ? 'danger' : 'primary'}`;
  onOk = o.onOk;
  dlg.showModal();
  $<HTMLElement>('input:not([type=radio]):not([disabled]), select, input[type=radio]:checked', dlg)?.focus();
}
dlgForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const res = onOk?.(new FormData(dlgForm));
  if (res === false) return;
  dlg?.close();
  if (typeof res === 'string') toast(res, 'good');
  render();
});
$('[data-dlg-cancel]', dlg ?? document)?.addEventListener('click', () => dlg?.close());
dlg?.addEventListener('click', (e) => {
  if (e.target === dlg) dlg.close();
});

const field = (label: string, control: string) => `<label class="form-field">${esc(label)}${control}</label>`;
const comment = field(
  'Comment',
  '<textarea name="comment" rows="2" maxlength="200" placeholder="Optional"></textarea>'
);
const radios = (
  name: string,
  opts: { value: string; label: string; note?: string; disabled?: boolean; checked?: boolean }[]
) =>
  `<div class="radio-list">${opts
    .map(
      (o) =>
        `<label><input type="radio" name="${name}" value="${esc(o.value)}"${o.checked ? ' checked' : ''}${o.disabled ? ' disabled' : ''}/> ${esc(o.label)}${o.note ? `<small>${esc(o.note)}</small>` : ''}</label>`
    )
    .join('')}</div>`;

/* ------------------------------------------------------------------ Toasts */

function toast(text: string, kind: 'good' | 'warn' | 'info' = 'info') {
  const host = $('#mes-toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'mes-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(kind === 'good' ? 'circle-check' : kind === 'warn' ? 'lock' : 'info-circle')}<span>${esc(text)}</span>`;
  host.append(el);
  setTimeout(() => el.remove(), 3800);
}

/* ------------------------------------------------------------------ Actions */

const by = () => V.by();
type Data = DOMStringMap;

const actions: Record<string, (d: Data) => void> = {
  trackIn(d) {
    const lot = fab.lots.get(d.lot!);
    if (!lot) return;
    if (d.tool) {
      if (fab.trackIn(lot.id, d.tool, by())) toast(`${lot.id} tracked into ${d.tool}`, 'good');
      else toast(`${d.tool} can't take ${lot.id} right now`, 'warn');
      return;
    }
    const tools = fab.eligibleTools(lot);
    ask({
      title: `Track in ${lot.id}`,
      sub: `${fab.op(lot)?.op} ${fab.op(lot)?.name} · recipe ${fab.op(lot)?.recipe}`,
      body: radios(
        'tool',
        tools.map((t, i) => ({
          value: t.id,
          label: t.id,
          note: fab.hasRoom(t) ? `${t.running.length}/${t.def.capacity} loaded` : V.toolStateName(t.state),
          disabled: !fab.hasRoom(t),
          checked: fab.hasRoom(t) && tools.findIndex((x) => fab.hasRoom(x)) === i,
        }))
      ),
      ok: 'Track in',
      onOk: (fd) => {
        const tool = String(fd.get('tool') ?? '');
        if (!tool || !fab.trackIn(lot.id, tool, by())) {
          toast('No available tool selected', 'warn');
          return false;
        }
        return `${lot.id} tracked into ${tool}`;
      },
    });
  },
  hold(d) {
    const lot = fab.lots.get(d.lot!);
    if (!lot) return;
    ask({
      title: `Hold ${lot.id}`,
      sub:
        lot.state === 'running'
          ? 'The lot is running: the hold applies when it tracks out.'
          : 'The lot stops at its current step.',
      body:
        field(
          'Reason',
          `<select name="reason">${[
            'Engineering evaluation',
            'Suspected particle contamination',
            'Wrong recipe suspected',
            'Metrology re-measure needed',
            'Customer request',
          ]
            .map((x) => `<option>${x}</option>`)
            .join('')}</select>`
        ) + comment,
      ok: 'Place hold',
      onOk: (fd) => {
        const c = String(fd.get('comment') ?? '').trim();
        fab.hold(lot.id, `${fd.get('reason')}${c ? `: ${c}` : ''}`, by());
        return `${lot.id} ${lot.state === 'running' ? 'will be held after this step' : 'is on hold'}`;
      },
    });
  },
  dispo(d) {
    const lot = fab.lots.get(d.lot!);
    if (!lot?.hold) return;
    const rw = lot.hold.reworkTo;
    ask({
      title: `Disposition ${lot.id}`,
      sub: `${lot.hold.category} hold: ${lot.hold.reason}`,
      body:
        radios('action', [
          { value: 'release', label: 'Release: continue as is', checked: true },
          {
            value: 'rework',
            label: rw !== undefined ? `Rework: back to ${fab.route(lot)[rw].name}` : 'Rework',
            note: rw === undefined ? 'Not possible after this step' : undefined,
            disabled: rw === undefined,
          },
          { value: 'scrap', label: 'Scrap wafers, release the rest' },
        ]) +
        field('Wafers to scrap', `<input type="number" name="scrap" min="0" max="${lot.slots.length}" value="0" />`) +
        comment,
      ok: 'Apply disposition',
      onOk: (fd) => {
        const a = String(fd.get('action')) as 'release' | 'rework' | 'scrap';
        const n = Math.max(0, Math.min(lot.slots.length, Number(fd.get('scrap')) || 0));
        if (a === 'scrap' && !n) {
          toast('Enter how many wafers to scrap', 'warn');
          return false;
        }
        fab.disposition(
          lot.id,
          a === 'scrap' ? 'release' : a,
          a === 'scrap' ? n : 0,
          String(fd.get('comment') ?? '').trim(),
          by()
        );
        return `${lot.id}: ${a === 'scrap' ? `${n} wafer${n > 1 ? 's' : ''} scrapped, rest released` : a === 'rework' ? 'sent to rework' : 'released'}`;
      },
    });
  },
  split(d) {
    const lot = fab.lots.get(d.lot!);
    if (!lot || lot.slots.length < 2) return;
    ask({
      title: `Split ${lot.id}`,
      sub: `${lot.slots.length} wafers. The child lot keeps the parent's history and state.`,
      body: field(
        'Wafers to move to the child lot',
        `<input type="number" name="n" min="1" max="${lot.slots.length - 1}" value="${Math.min(5, lot.slots.length - 1)}" />`
      ),
      ok: 'Split lot',
      onOk: (fd) => {
        const id = fab.split(lot.id, Number(fd.get('n')), by());
        if (!id) {
          toast('Split not possible', 'warn');
          return false;
        }
        return `Created ${id}`;
      },
    });
  },
  prio(d) {
    const lot = fab.lots.get(d.lot!);
    if (!lot) return;
    ask({
      title: `Priority for ${lot.id}`,
      sub: 'Hot and rush lots jump the dispatch queue and get a tighter due date.',
      body: radios(
        'p',
        Object.entries(priorities).map(([k, v]) => ({ value: k, label: v.name, checked: Number(k) === lot.priority }))
      ),
      ok: 'Set priority',
      onOk: (fd) => {
        const p = Number(fd.get('p')) as Priority;
        fab.setPriority(lot.id, p, by());
        return `${lot.id} is now ${priorities[p].name}`;
      },
    });
  },
  startLot() {
    ask({
      title: 'Start a new lot',
      sub: 'Releases a FOUP of bare wafers into the line at the first step.',
      body:
        field(
          'Product',
          `<select name="product">${products.map((p) => `<option value="${p.id}">${p.id} · ${esc(p.name)}</option>`).join('')}</select>`
        ) +
        field(
          'Priority',
          `<select name="p">${Object.entries(priorities)
            .map(([k, v]) => `<option value="${k}"${k === '3' ? ' selected' : ''}>${v.name}</option>`)
            .join('')}</select>`
        ) +
        field('Wafers', '<input type="number" name="qty" min="1" max="25" value="25" />'),
      ok: 'Start lot',
      onOk: (fd) => {
        const qty = Math.max(1, Math.min(25, Number(fd.get('qty')) || 25));
        const lot = fab.newLot(String(fd.get('product')), Number(fd.get('p')) as Priority, qty, by());
        return `Started ${lot.id}`;
      },
    });
  },
  ack(d) {
    if (fab.ackAlarm(d.alarm!, by())) toast(`${d.alarm} acknowledged`, 'good');
  },
  clear(d) {
    if (fab.clearAlarm(d.alarm!, by())) toast(`${d.alarm} cleared`, 'good');
  },
  repair(d) {
    if (fab.startRepair(d.tool!, by())) toast(`Repair started on ${d.tool}`, 'good');
  },
  complete(d) {
    if (fab.completeWork(d.tool!, by())) toast(`${d.tool} moved to qualification`, 'good');
  },
  release(d) {
    if (fab.releaseTool(d.tool!, by())) toast(`${d.tool} released to production`, 'good');
  },
  pm(d) {
    const t = fab.tools.get(d.tool!);
    if (t?.running.length) return toast(`${d.tool} still has lots running. PM can start when it is empty.`, 'warn');
    if (fab.startPM(d.tool!, by())) toast(`PM started on ${d.tool}`, 'good');
  },
  inhibit(d) {
    ask({
      title: `Inhibit ${d.tool}`,
      sub: 'Stops new lots from being dispatched to the tool until an engineer releases it.',
      body: field(
        'Reason',
        `<select name="reason">${['Suspected process drift', 'Recipe qualification pending', 'Chamber matching study', 'Particle excursion'].map((x) => `<option>${x}</option>`).join('')}</select>`
      ),
      ok: 'Inhibit tool',
      danger: true,
      onOk: (fd) => {
        fab.inhibit(d.tool!, String(fd.get('reason')), by());
        return `${d.tool} inhibited`;
      },
    });
  },
  callTech(d) {
    ask({
      title: `Call a technician to ${d.tool}`,
      sub: 'The tool goes to Unscheduled down; running lots are aborted.',
      body: field(
        'Problem',
        `<select name="text">${['Abnormal noise from wafer handler', 'Load port will not open', 'Wafer dropped in transfer chamber', 'Leak detected under tool'].map((x) => `<option>${x}</option>`).join('')}</select>`
      ),
      ok: 'Take tool down',
      danger: true,
      onOk: (fd) => {
        fab.callTech(d.tool!, String(fd.get('text')), by());
        return `${d.tool} is down and a technician is paged`;
      },
    });
  },
  viewWafers(d) {
    V.ui.yield.lot = d.lot!;
    V.ui.yield.wafer = 0;
    V.ui.yield.product = 'all';
    sheetDlg?.close();
    location.hash = 'yield';
  },
  spcTool(d) {
    V.ui.spc.param = d.param!;
    V.ui.spc.tool = d.tool && d.tool !== '—' ? d.tool : 'all';
    sheetDlg?.close();
    if (currentView() === 'spc') render();
    else location.hash = 'spc';
  },
};

/* ------------------------------------------------------------------ Persona */

function switchPersona(id: PersonaId, announce = true) {
  setPersona(id);
  store.set('persona', id);
  const p = persona();
  fab.settings.manualAreas = id === 'operator' ? p.areas : [];
  const area = p.areas[0];
  if (area) {
    V.ui.dispatchArea = area;
    for (const b of $$('[data-dispatch-area]')) b.setAttribute('aria-pressed', String(b.dataset.dispatchArea === area));
  }
  $('[data-persona-root]')?.classList.remove('open');
  $('[data-persona-toggle]')?.setAttribute('aria-expanded', 'false');
  V.renderPersona();
  if (announce) toast(`Working as ${p.role} (${p.person})`, 'good');
  if (announce && currentView() !== 'workspace') location.hash = 'workspace';
  else render();
}

/* ------------------------------------------------------------------ Events */

const press = (el: HTMLElement) => {
  const group = el.closest('[data-chipgroup]');
  if (group) for (const b of $$('button', group)) b.setAttribute('aria-pressed', String(b === el));
};

document.addEventListener('click', (e) => {
  const t = e.target as Element;

  const personaToggle = t.closest('[data-persona-toggle]');
  const root = $('[data-persona-root]');
  if (personaToggle) {
    const open = !root?.classList.contains('open');
    root?.classList.toggle('open', open);
    personaToggle.setAttribute('aria-expanded', String(open));
    return;
  }
  if (root?.classList.contains('open') && !t.closest('[data-persona-pop]')) {
    root.classList.remove('open');
    $('[data-persona-toggle]')?.setAttribute('aria-expanded', 'false');
  }
  const pb = t.closest<HTMLElement>('[data-persona]');
  if (pb) return switchPersona(pb.dataset.persona as PersonaId);

  const act = t.closest<HTMLElement>('[data-act]');
  if (act) {
    e.stopPropagation();
    const perm = act.dataset.perm as Parameters<typeof can>[0] | undefined;
    if (act.getAttribute('aria-disabled') === 'true' && perm) {
      toast(`${act.textContent?.trim()} requires ${whoCan(perm)}. Switch persona in the top bar.`, 'warn');
      return;
    }
    actions[act.dataset.act!]?.(act.dataset);
    render();
    return;
  }
  const lotOpen = t.closest<HTMLElement>('[data-lot-open]');
  if (lotOpen) return openSheet('lot', lotOpen.dataset.lotOpen!);
  const toolOpen = t.closest<HTMLElement>('[data-tool-open]');
  if (toolOpen) return openSheet('tool', toolOpen.dataset.toolOpen!);

  const b = t.closest<HTMLElement>('button');
  if (!b) return;
  const d = b.dataset;
  if ('simPlay' in d) {
    paused = !paused;
    toast(paused ? 'Simulation paused' : 'Simulation running');
  } else if (d.speed) {
    speed = Number(d.speed);
    press(b);
    store.set('speed', d.speed);
  } else if (d.lotsState) {
    V.ui.lots.state = d.lotsState;
    press(b);
  } else if (d.lotsMode) {
    V.ui.lots.mode = d.lotsMode as 'wip' | 'shipped';
    press(b);
    $('[data-lots-wip-only]')!.hidden = d.lotsMode !== 'wip';
  } else if (d.dispatchArea) {
    V.ui.dispatchArea = d.dispatchArea as AreaId;
    press(b);
  } else if (d.equipState) {
    V.ui.equip.state = d.equipState as 'all' | E10;
    press(b);
  } else if (d.alarmMode) {
    V.ui.alarms.mode = d.alarmMode as 'active' | 'all';
    press(b);
  } else if (d.alarmSev) {
    V.ui.alarms.sev = d.alarmSev;
    press(b);
  } else if (d.spcParam) {
    V.ui.spc.param = d.spcParam;
    V.ui.spc.tool = 'all';
  } else if (d.yieldProduct) {
    V.ui.yield.product = d.yieldProduct;
  } else if (d.holdsCat) {
    V.ui.holds.cat = d.holdsCat;
    press(b);
  } else if (d.wafer) {
    V.ui.yield.wafer = Number(d.wafer);
  } else return;
  render();
});

document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement;
  if (
    (e.key === 'Enter' || e.key === ' ') &&
    el.matches('tr[data-lot-open], tr[data-tool-open], [role=listitem][data-tool-open]')
  ) {
    e.preventDefault();
    el.click();
  }
  if (e.key === 'Escape') $('[data-persona-root]')?.classList.remove('open');
});

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const d = el.dataset;
  if ('lotsProduct' in d) V.ui.lots.product = el.value;
  else if ('lotsPrio' in d) V.ui.lots.prio = el.value;
  else if ('equipArea' in d) V.ui.equip.area = el.value as 'all' | AreaId;
  else if ('dispatchRule' in d) {
    fab.settings.rule = el.value as Fab['settings']['rule'];
    toast(`Dispatch rule: ${(el as HTMLSelectElement).selectedOptions?.[0]?.textContent ?? el.value}`);
  } else if ('spcTool' in d) V.ui.spc.tool = el.value;
  else if ('yieldLot' in d) {
    V.ui.yield.lot = el.value;
    V.ui.yield.wafer = 0;
  } else if (el.id === 'mes-autopilot') {
    fab.settings.autopilot = (el as HTMLInputElement).checked;
    store.set('autopilot', String(fab.settings.autopilot));
    toast(
      fab.settings.autopilot
        ? 'Autopilot crew on: routine work is handled for you'
        : 'Autopilot off: nothing moves unless you do it',
      fab.settings.autopilot ? 'good' : 'warn'
    );
  } else return;
  render();
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if ('lotsSearch' in el.dataset) {
    V.ui.lots.q = el.value;
    render();
  }
});

document.addEventListener('app:view', (e) => {
  const id = (e as CustomEvent<string>).detail;
  $(`.mes-tab[data-nav="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  render();
});

document.addEventListener('app:search', (e) => {
  const it = (e as CustomEvent<Record<string, string>>).detail;
  if (it.lot) openSheet('lot', it.lot);
  else if (it.tool) openSheet('tool', it.tool);
  else if (it.param) {
    V.ui.spc.param = it.param;
    V.ui.spc.tool = 'all';
  } else if (it.persona) switchPersona(it.persona as PersonaId);
  else if (it.product) V.ui.yield.product = it.product;
  render();
});

let resizeT = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = window.setTimeout(render, 120);
});

/* ------------------------------------------------------------------ Boot */

async function boot() {
  const bar = $('[data-splash-bar]');
  const note = $('[data-splash-note]');
  fab.seedWip(55);
  const total = Math.round((Date.now() - fab.now) / MIN);
  const chunk = 720;
  for (let done = 0; done < total; done += chunk) {
    fab.advance(Math.min(chunk, total - done));
    if (bar) bar.style.width = `${Math.min(100, ((done + chunk) / total) * 100)}%`;
    if (note)
      note.textContent = `Replaying the last 7 days · ${new Date(fab.now).toLocaleDateString('en-GB', { weekday: 'long' })}`;
    await new Promise((r) => setTimeout(r, 0));
  }

  const saved = store.get('persona') as PersonaId | null;
  switchPersona(saved && personaById.has(saved) ? saved : 'operator', false);
  const sp = Number(store.get('speed'));
  if ([1 / 60, 1, 5, 15].some((x) => Math.abs(x - sp) < 1e-6)) {
    speed = sp;
    for (const b of $$('[data-speed]'))
      b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.speed) - sp) < 1e-6));
  }
  if (store.get('autopilot') === 'false') {
    fab.settings.autopilot = false;
    const cb = $<HTMLInputElement>('#mes-autopilot');
    if (cb) cb.checked = false;
  }

  $('#app-search-index')!.textContent = JSON.stringify(V.searchIndex(fab, VIEWS));
  await import('../shell');
  render();
  $('#mes-splash')?.classList.add('done');
  setTimeout(() => $('#mes-splash')?.remove(), 400);

  setInterval(() => {
    if (!paused) {
      carry += speed;
      const n = Math.floor(carry);
      carry -= n;
      if (n) fab.advance(n);
    }
    render();
  }, 1000);
}

boot();
