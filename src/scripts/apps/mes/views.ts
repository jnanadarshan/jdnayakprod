/** View renderers: each turns the current fab state into HTML for one tab or sheet. */
import {
  areaById,
  areas,
  bins,
  e10,
  personas,
  productById,
  products,
  routes,
  spcById,
  spcParams,
  tools as toolDefs,
  type AreaId,
  type E10,
} from '~/data/mes';
import { DAY, HOUR, MIN, type Fab, type Lot, type ToolRt, waferMap } from './sim';
import {
  $,
  $$,
  LOT_STATE,
  SEV,
  badge,
  bars,
  btn,
  columns,
  dayLabel,
  dur,
  esc,
  hhmm,
  icon,
  lineChart,
  lotStateBadge,
  meter,
  num,
  patch,
  pct,
  persona,
  prioBadge,
  shift,
  spark,
  stamp,
  stateBadge,
  stateStrip,
} from './ui';

/* ------------------------------------------------------------------ UI state */

export const ui = {
  lots: { state: 'all', product: 'all', prio: 'all', q: '', mode: 'wip' as 'wip' | 'shipped' },
  dispatchArea: 'litho' as AreaId,
  equip: { state: 'all' as 'all' | E10, area: 'all' as 'all' | AreaId },
  alarms: { mode: 'active' as 'active' | 'all', sev: 'all' },
  spc: { param: 'GATE-CD', tool: 'all' },
  yield: { product: 'all', lot: '', wafer: 0 },
  holds: { cat: 'all' },
};

const r = (name: string) => $(`[data-r="${name}"]`);
const lotLink = (id: string) =>
  `<button type="button" class="mono strong link" data-lot-open="${esc(id)}">${esc(id)}</button>`;
const toolLink = (id: string) =>
  id && id !== '—'
    ? `<button type="button" class="mono strong link" data-tool-open="${esc(id)}">${esc(id)}</button>`
    : '<span class="muted">—</span>';
const plain = (label: string, act: string, data: Record<string, string | number>, ic = 'arrow-right', cls = '') =>
  `<button type="button" class="mes-btn ${cls}" data-act="${act}" data-key="${act}:${Object.values(data).join(':')}"${Object.entries(
    data
  )
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('')}>${icon(ic)}${esc(label)}</button>`;
const card = (title: string, sub: string, body: string, cls = '', right = '') =>
  `<article class="card ${cls}"><div class="card-head"><div><h2 class="card-title">${esc(title)}</h2>${sub ? `<p class="card-sub">${esc(sub)}</p>` : ''}</div>${right}</div>${body}</article>`;
const empty = (text: string) => `<p class="empty-sm">${esc(text)}</p>`;
const by = () => `${persona().person} (${persona().role})`;
export { by };

const opOf = (fab: Fab, l: Lot) => fab.op(l);
const opLabel = (fab: Fab, l: Lot) => {
  const op = opOf(fab, l);
  return op ? `${op.op} ${op.name}` : 'Complete';
};
const progress = (fab: Fab, l: Lot) => {
  const n = fab.route(l).length;
  const v = Math.min(1, l.step / n);
  return `<div class="prog">${meter(v)}<span>${Math.round(v * 100)}%</span></div>`;
};
const dueCell = (fab: Fab, l: Lot) => {
  const left = l.due - fab.now;
  const cr = fab.cr(l);
  return `<span class="${left < 0 ? 'late' : ''}">${left < 0 ? `${dur(-left)} late` : `in ${dur(left)}`}</span><span class="cell-sub">CR ${cr.toFixed(2)}</span>`;
};
const wipOf = (fab: Fab) => fab.wip();
const toolsIn = (fab: Fab, areaIds: AreaId[]) =>
  [...fab.tools.values()].filter((t) => !areaIds.length || areaIds.includes(t.def.area));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const greeting = (t: number) => {
  const h = new Date(t).getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const toolEta = (fab: Fab, t: ToolRt) =>
  t.running.map((run) => `${lotLink(run.lot)} <span class="muted">${dur(run.end - fab.now)} left</span>`).join('<br>');

/* ------------------------------------------------------------------ KPIs */

export function kpis(fab: Fab) {
  const wip = wipOf(fab);
  const wafers = wip.reduce((s, l) => s + l.slots.length, 0);
  const moves24 = fab.moves.filter((m) => m.t > fab.now - DAY).reduce((s, m) => s + m.w, 0);
  const movesPrev = fab.moves
    .filter((m) => m.t <= fab.now - DAY && m.t > fab.now - 2 * DAY)
    .reduce((s, m) => s + m.w, 0);
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const a = fab.now - (24 - i) * HOUR;
    return fab.moves.filter((m) => m.t > a && m.t <= a + HOUR).reduce((s, m) => s + m.w, 0);
  });
  const shipped = fab.shipped();
  const out24 = shipped.filter((l) => l.finished! > fab.now - DAY);
  const ct = avg(shipped.map((l) => (l.finished! - l.started) / DAY));
  const raw = avg(shipped.map((l) => routes[l.route].ops.reduce((s, o) => s + fab.rawMinutes(o), 0) * MIN));
  const xf = raw ? (ct * DAY) / raw : 0;
  const onTime = shipped.length ? shipped.filter((l) => l.finished! <= l.due).length / shipped.length : 1;
  const probeYield = avg(shipped.map((l) => l.probe?.yield ?? 0));
  const lineYield = shipped.length
    ? shipped.reduce((s, l) => s + l.slots.length, 0) / shipped.reduce((s, l) => s + l.startQty, 0)
    : 1;
  const splits = [...fab.tools.values()].map((t) => fab.e10Split(t));
  const avail = avg(splits.map((s) => s.PRD + s.SBY));
  const util = avg(splits.map((s) => s.PRD));
  const holds = wip.filter((l) => l.state === 'hold').length;
  return {
    wip,
    wafers,
    moves24,
    movesPrev,
    hourly,
    out24,
    ct,
    xf,
    onTime,
    probeYield,
    lineYield,
    avail,
    util,
    holds,
    shipped,
  };
}

function kpiTiles(fab: Fab) {
  const k = kpis(fab);
  const dm = k.movesPrev ? k.moves24 / k.movesPrev - 1 : 0;
  const tile = (label: string, value: string, note: string, cls = '', extra = '', tip = '') =>
    `<div class="card stat kpi ${cls}"${tip ? ` data-tip-title="${esc(label)}" data-tip-body="${esc(tip)}"` : ''}><p class="stat-label">${esc(label)}</p><p class="stat-value">${value}</p><p class="stat-note"><span>${note}</span>${extra}</p></div>`;
  return `<div class="kpi-row">${[
    tile(
      'WIP',
      `${k.wip.length} <small class="muted" style="font-size:13px">lots</small>`,
      `${num(k.wafers)} wafers · ${k.holds} on hold`,
      k.holds > 6 ? 'warn' : '',
      '',
      'Lots in the line: queued, running or on hold.'
    ),
    tile(
      'Moves · 24h',
      num(k.moves24),
      `<span class="${dm >= 0 ? 'delta-up' : 'delta-down'}">${dm >= 0 ? '+' : '−'}${Math.abs(dm * 100).toFixed(0)}%</span> vs prior 24h`,
      '',
      spark(k.hourly),
      'Wafer-steps completed (one wafer finishing one operation).'
    ),
    tile(
      'Outs · 24h',
      `${k.out24.length}`,
      `${num(k.out24.reduce((s, l) => s + l.slots.length, 0))} wafers shipped`,
      'good'
    ),
    tile(
      'Cycle time',
      `${k.ct.toFixed(2)}d`,
      `X-factor ${k.xf.toFixed(1)} · 7-day avg`,
      k.xf > 3 ? 'warn' : '',
      '',
      'Start to ship. X-factor = cycle time ÷ raw process time.'
    ),
    tile('On-time delivery', pct(k.onTime), 'Shipped by due date · 7d', k.onTime < 0.85 ? 'warn' : 'good'),
    tile(
      'Probe yield',
      pct(k.probeYield, 1),
      `Line yield ${pct(k.lineYield, 1)}`,
      k.probeYield < 0.9 ? 'warn' : 'good',
      '',
      'Die yield at wafer probe; line yield = wafers out ÷ wafers in.'
    ),
    tile(
      'Tool availability',
      pct(k.avail),
      `Utilization ${pct(k.util)} · 24h`,
      k.avail < 0.85 ? 'warn' : '',
      '',
      'Share of time tools were up (Productive + Standby).'
    ),
  ].join('')}</div>`;
}

/* ------------------------------------------------------------------ Chrome */

export function renderChrome(fab: Fab, paused: boolean) {
  const s = shift(fab.now);
  patch(r('clock'), `${icon('clock')}<b>${hhmm(fab.now)}</b><span>${dayLabel(fab.now)}</span><span>· ${s.name}</span>`);
  const wip = wipOf(fab);
  const holds = wip.filter((l) => l.state === 'hold').length;
  const alarms = fab.activeAlarms();
  const crit = alarms.filter((a) => a.sev === 'crit' && !a.acked).length;
  const down = [...fab.tools.values()].filter((t) => t.state === 'UDT').length;
  const openWo = fab.wos.filter((w) => w.status !== 'Closed').length;
  const setBadge = (name: string, n: number, cls: string) => {
    const el = $(`[data-badge="${name}"]`);
    if (!el) return;
    el.textContent = n ? String(n) : '';
    el.className = `mes-tab-badge ${cls}`;
  };
  setBadge('alarms', alarms.length, crit ? 'crit' : 'warn');
  setBadge('holds', holds, 'warn');
  setBadge('equipment', down, 'crit');
  setBadge('maintenance', openWo, '');
  const moves = fab.moves.filter((m) => m.t > fab.now - DAY).reduce((a, m) => a + m.w, 0);
  const item = (ic: string, label: string, value: string | number, cls = '', view = '') =>
    `<a class="status-item ${cls}" href="#${view}">${icon(ic)}${esc(label)} <b>${esc(value)}</b></a>`;
  patch(
    r('status'),
    [
      item('stack-2', 'WIP', wip.length, '', 'lots'),
      item('player-play', 'Running', wip.filter((l) => l.state === 'running').length, '', 'lots'),
      item('hand-stop', 'Holds', holds, holds ? 'warn' : '', 'holds'),
      item('bell', 'Alarms', alarms.length, crit ? 'crit' : alarms.length ? 'warn' : '', 'alarms'),
      item('alert-octagon', 'Down', down, down ? 'crit' : '', 'equipment'),
      item('activity', 'Moves 24h', num(moves), '', 'overview'),
    ].join('')
  );
  const play = $('[data-sim-play]');
  if (play) {
    play.setAttribute('aria-pressed', String(!paused));
    patch(play, `<span class="sim-live"></span>${paused ? 'Paused' : 'Live'}`);
  }
}

export function renderPersona() {
  const p = persona();
  patch(
    r('persona-btn'),
    `<span class="persona-avatar">${icon(p.icon.replace('tabler:', ''))}</span><span class="persona-btn-text"><b>${esc(p.role)}</b><span>${esc(p.person)} · ${esc(p.badge)}</span></span>${icon('chevron-down', 'chev')}`
  );
  for (const b of $$('[data-persona]')) b.setAttribute('aria-pressed', String(b.dataset.persona === p.id));
  for (const t of $$('.mes-tab')) t.classList.toggle('is-focus', p.focus.includes(t.dataset.nav ?? ''));
}

/* ------------------------------------------------------------------ Workspace */

function toolTask(fab: Fab, t: ToolRt) {
  const q = fab.queueFor(t.id);
  const next = q[0];
  const room = fab.hasRoom(t);
  const idle = t.state === 'SBY' ? fab.now - t.idleSince : 0;
  const sub = t.running.length
    ? `Running ${t.running.map((x) => x.lot).join(', ')} · ${dur(Math.min(...t.running.map((x) => x.end)) - fab.now)} to next track-out`
    : t.state === 'SBY'
      ? `Idle ${dur(idle)}${q.length ? ` · ${q.length} lot${q.length > 1 ? 's' : ''} waiting` : ' · queue empty'}`
      : (t.reason ?? e10[t.state].hint);
  const action =
    room && next
      ? btn({
          label: `Track in ${next.id}`,
          act: 'trackIn',
          perm: 'trackIn',
          icon: 'player-play',
          cls: 'primary sm',
          data: { lot: next.id, tool: t.id },
        })
      : '';
  return `<div class="task"><span class="task-icon ${e10[t.state].cls}">${icon(e10[t.state].icon)}</span><div class="task-main"><div class="task-title">${toolLink(t.id)} <span class="muted" style="font-weight:500">${esc(t.def.name)}</span></div><div class="task-sub">${esc(sub)}</div></div><div class="btn-row">${action}</div></div>`;
}

function holdTask(fab: Fab, l: Lot) {
  const h = l.hold!;
  return `<div class="task"><span class="task-icon st-warn">${icon('hand-stop')}</span><div class="task-main"><div class="task-title">${lotLink(l.id)} ${badge(h.category, 'st-warn')}</div><div class="task-sub">${esc(h.reason)} · ${dur(fab.now - h.t)} ago</div></div><div class="btn-row">${btn({ label: 'Disposition', act: 'dispo', perm: 'disposition', icon: 'gavel', cls: 'primary sm', data: { lot: l.id } })}</div></div>`;
}

function downTask(fab: Fab, t: ToolRt) {
  const phase = t.phase;
  const actions =
    phase === 'alarm'
      ? btn({
          label: 'Start repair',
          act: 'repair',
          perm: 'repair',
          icon: 'tool',
          cls: 'primary sm',
          data: { tool: t.id },
        })
      : phase === 'repair'
        ? btn({
            label: 'Repair done',
            act: 'complete',
            perm: 'repair',
            icon: 'check',
            cls: 'primary sm',
            data: { tool: t.id },
          })
        : phase === 'pm'
          ? btn({
              label: 'PM done',
              act: 'complete',
              perm: 'pm',
              icon: 'check',
              cls: 'primary sm',
              data: { tool: t.id },
            })
          : phase === 'qual'
            ? btn({
                label: 'Release',
                act: 'release',
                perm: 'qual',
                icon: 'shield-check',
                cls: 'primary sm',
                data: { tool: t.id },
              })
            : phase === 'inhibit'
              ? btn({ label: 'Start PM', act: 'pm', perm: 'pm', icon: 'calendar-cog', cls: 'sm', data: { tool: t.id } })
              : '';
  const label = {
    alarm: 'Waiting for technician',
    repair: 'Repair in progress',
    pm: 'PM in progress',
    qual: 'Qualification',
    inhibit: 'Inhibited by SPC',
  }[phase ?? 'alarm'];
  return `<div class="task"><span class="task-icon ${e10[t.state].cls}">${icon(e10[t.state].icon)}</span><div class="task-main"><div class="task-title">${toolLink(t.id)} ${stateBadge(t.state)}</div><div class="task-sub">${esc(label)} · ${esc(t.reason ?? '')} · ${dur(fab.now - t.since)}</div></div><div class="btn-row">${actions}</div></div>`;
}

export function renderWorkspace(fab: Fab) {
  const p = persona();
  const wip = wipOf(fab);
  const areaText = p.areas.length ? p.areas.map((a) => areaById.get(a)!.name).join(', ') : 'Whole fab';
  const s = shift(fab.now);
  const pills: [number | string, string][] = [];
  let body = '';
  const mine = toolsIn(fab, p.areas);

  if (p.id === 'operator') {
    const waitingTools = mine.filter((t) => fab.hasRoom(t) && fab.queueFor(t.id).length);
    const myLots = wip.filter((l) => l.state !== 'hold' && mine.some((t) => fab.canRun(t, l)));
    const risk = wip
      .filter((l) => (fab.qtimeLeft(l) ?? Infinity) < 2 * HOUR)
      .sort((a, b) => fab.qtimeLeft(a)! - fab.qtimeLeft(b)!);
    pills.push(
      [mine.length, 'my tools'],
      [waitingTools.length, 'ready to load'],
      [myLots.length, 'lots for my bay'],
      [risk.length, 'Q-time at risk']
    );
    body = `<div class="mes-grid">
      ${card('My tools', `${areaText} · run the next lot`, `<div class="task-list">${mine.map((t) => toolTask(fab, t)).join('')}</div>`, 'span-7')}
      <div class="stack span-5">
        ${card(
          'Hot and rush lots for my bay',
          'Highest priority first',
          lotMiniTable(
            fab,
            myLots
              .filter((l) => l.priority <= 2)
              .sort((a, b) => a.priority - b.priority || fab.cr(a) - fab.cr(b))
              .slice(0, 8)
          ) || empty('No hot or rush lots waiting.')
        )}
        ${card(
          'Q-time at risk',
          'Lots that must start their next step soon',
          risk.length
            ? `<table class="data-table dense"><tbody>${risk
                .slice(0, 6)
                .map(
                  (l) =>
                    `<tr><td>${lotLink(l.id)}</td><td>${esc(opLabel(fab, l))}</td><td class="num late">${dur(fab.qtimeLeft(l)!)} left</td></tr>`
                )
                .join('')}</tbody></table>`
            : empty('No lots close to their Q-time limit.')
        )}
        <div class="notice">${icon('info-circle')}<span>Tools in your bay wait ${fab.settings.manualDelay} simulated minutes for you to track in. After that the autopilot crew loads them.</span></div>
      </div>
    </div>`;
  } else if (p.id === 'technician') {
    const down = [...fab.tools.values()]
      .filter((t) => t.state === 'UDT' || t.state === 'SDT' || (t.state === 'ENG' && t.phase))
      .sort(
        (a, b) => Number(!p.areas.includes(a.def.area)) - Number(!p.areas.includes(b.def.area)) || a.since - b.since
      );
    const pmDue = [...fab.tools.values()]
      .filter((t) => fab.isUp(t) && t.wafersSincePM / t.def.pmInterval >= 0.85)
      .sort((a, b) => b.wafersSincePM / b.def.pmInterval - a.wafersSincePM / a.def.pmInterval);
    const unacked = fab.activeAlarms().filter((a) => !a.acked);
    pills.push(
      [down.filter((t) => t.state === 'UDT').length, 'tools down'],
      [unacked.length, 'unacked alarms'],
      [pmDue.length, 'PMs due soon'],
      [fab.wos.filter((w) => w.status !== 'Closed').length, 'open work orders']
    );
    body = `<div class="mes-grid">
      ${card('Tools needing attention', `Down, in PM or qualifying · ${areaText} first`, down.length ? `<div class="task-list">${down.map((t) => downTask(fab, t)).join('')}</div>` : empty('All tools are up.'), 'span-7')}
      <div class="stack span-5">
        ${card(
          'Unacknowledged alarms',
          'Newest first',
          unacked.length
            ? `<div class="task-list">${unacked
                .slice(-6)
                .reverse()
                .map(
                  (a) =>
                    `<div class="task"><span class="task-icon ${SEV[a.sev].cls}">${icon(SEV[a.sev].icon)}</span><div class="task-main"><div class="task-title">${toolLink(a.tool)} <span class="mono muted">${esc(a.code)}</span></div><div class="task-sub">${esc(a.text)} · ${dur(fab.now - a.t)} ago</div></div><div class="btn-row">${btn({ label: 'Ack', act: 'ack', perm: 'ackAlarm', cls: 'sm', data: { alarm: a.id } })}</div></div>`
                )
                .join('')}</div>`
            : empty('No alarms waiting for acknowledgement.')
        )}
        ${card(
          'PM due soon',
          'Wafer counter at 85% of interval or more',
          pmDue.length
            ? `<div class="task-list">${pmDue
                .slice(0, 6)
                .map(
                  (t) =>
                    `<div class="task"><span class="task-icon st-warn">${icon('calendar-cog')}</span><div class="task-main"><div class="task-title">${toolLink(t.id)} <span class="muted" style="font-weight:500">${esc(t.def.pmName)}</span></div><div class="task-sub">${num(t.wafersSincePM)} / ${num(t.def.pmInterval)} wafers</div>${meter(t.wafersSincePM / t.def.pmInterval, t.wafersSincePM >= t.def.pmInterval ? 'crit' : 'warn')}</div><div class="btn-row">${btn({ label: 'Start PM', act: 'pm', perm: 'pm', icon: 'calendar-cog', cls: 'sm', data: { tool: t.id } })}</div></div>`
                )
                .join('')}</div>`
            : empty('No PMs due in the next shift.')
        )}
      </div>
    </div>`;
  } else if (p.id === 'engineer') {
    const holds = wip.filter((l) => l.state === 'hold').sort((a, b) => a.hold!.t - b.hold!.t);
    const inhibited = [...fab.tools.values()].filter((t) => t.phase === 'inhibit');
    const signals = spcParams
      .flatMap((sp) => fab.spc[sp.id].filter((x) => x.rule && x.t > fab.now - DAY).map((x) => ({ ...x, param: sp })))
      .sort((a, b) => b.t - a.t);
    pills.push(
      [holds.length, 'lots on hold'],
      [inhibited.length, 'inhibited tools'],
      [signals.filter((x) => x.rule === 1).length, 'OOC · 24h'],
      [signals.filter((x) => x.rule !== 1).length, 'trend signals · 24h']
    );
    body = `<div class="mes-grid">
      ${card('Holds awaiting disposition', 'Oldest first', holds.length ? `<div class="task-list">${holds.map((l) => holdTask(fab, l)).join('')}</div>` : empty('No lots on hold.'), 'span-7')}
      <div class="stack span-5">
        ${card(
          'Inhibited tools',
          'Stopped by SPC out-of-control action plan',
          inhibited.length
            ? `<div class="task-list">${inhibited
                .map(
                  (t) =>
                    `<div class="task"><span class="task-icon st-eng">${icon('flask')}</span><div class="task-main"><div class="task-title">${toolLink(t.id)}</div><div class="task-sub">${esc(t.reason ?? '')} · ${dur(fab.now - t.since)}</div></div><div class="btn-row">${btn({ label: 'Release', act: 'release', perm: 'inhibit', icon: 'shield-check', cls: 'sm', data: { tool: t.id } })}</div></div>`
                )
                .join('')}</div>`
            : empty('No tools inhibited.')
        )}
        ${card(
          'SPC signals · 24h',
          'Western Electric rules by responsible tool',
          signals.length
            ? `<table class="data-table dense"><tbody>${signals
                .slice(0, 8)
                .map(
                  (x) =>
                    `<tr><td>${badge(x.rule === 1 ? 'OOC' : `Rule ${x.rule}`, x.rule === 1 ? 'st-crit' : 'st-warn', x.rule === 1 ? 'alert-octagon' : 'trending-up')}</td><td><button type="button" class="link strong" data-act="spcTool" data-param="${x.param.id}" data-tool="${esc(x.tool)}">${esc(x.param.id)}</button><span class="cell-sub">${esc(x.tool)} · ${hhmm(x.t)}</span></td><td>${lotLink(x.lot)}</td></tr>`
                )
                .join('')}</tbody></table>`
            : empty('No SPC signals in the last 24 hours.')
        )}
      </div>
    </div>`;
  } else if (p.id === 'yield') {
    const shipped = fab.shipped().filter((l) => l.probe);
    const recent = [...shipped].sort((a, b) => b.finished! - a.finished!).slice(0, 8);
    const low = shipped.filter((l) => l.probe!.yield < productById.get(l.product)!.baseYield - 0.08);
    const common = commonality(shipped).slice(0, 4);
    pills.push(
      [pct(avg(shipped.map((l) => l.probe!.yield)), 1), 'probe yield · 7d'],
      [shipped.filter((l) => l.finished! > fab.now - DAY).length, 'lots probed · 24h'],
      [low.length, 'low-yield lots · 7d'],
      [common[0]?.tool ?? '—', 'top suspect tool']
    );
    body = `<div class="mes-grid">
      ${card(
        'Latest probed lots',
        'Open one to read its wafer maps',
        recent.length
          ? `<table class="data-table dense"><thead><tr><th>Lot</th><th>Product</th><th class="num">Yield</th><th></th></tr></thead><tbody>${recent
              .map((l) => {
                const lowY = l.probe!.yield < productById.get(l.product)!.baseYield - 0.08;
                return `<tr><td>${lotLink(l.id)}</td><td>${esc(l.product)}</td><td class="num ${lowY ? 'late' : ''}">${pct(l.probe!.yield, 1)}</td><td class="num">${plain('Maps', 'viewWafers', { lot: l.id }, 'circle-dot', 'sm')}</td></tr>`;
              })
              .join('')}</tbody></table>`
          : empty('No lots probed yet.'),
        'span-7'
      )}
      ${card(
        'Commonality suspects',
        'Tools whose lots yield lowest vs. the same step on other tools',
        common.length ? commonTable(common) : empty('Not enough probed lots yet.'),
        'span-5',
        `<a href="#yield" class="badge badge-primary">Yield ${icon('arrow-right')}</a>`
      )}
    </div>`;
  } else {
    const k = kpis(fab);
    const bottlenecks = [...fab.tools.values()]
      .map((t) => ({ t, q: fab.queueFor(t.id).length / t.def.capacity }))
      .filter((x) => x.q > 0)
      .sort((a, b) => b.q - a.q)
      .slice(0, 6);
    const late = wip
      .filter((l) => l.state !== 'hold' && fab.cr(l) < 1)
      .sort((a, b) => fab.cr(a) - fab.cr(b))
      .slice(0, 8);
    const shiftMoves = fab.moves.filter((m) => m.t >= s.start).reduce((a, m) => a + m.w, 0);
    const shiftOuts = k.shipped.filter((l) => l.finished! >= s.start).length;
    pills.push(
      [num(shiftMoves), 'moves this shift'],
      [shiftOuts, 'outs this shift'],
      [late.length, 'lots at risk'],
      [pct(k.avail), 'availability']
    );
    body = `${kpiTiles(fab)}<div class="mes-grid" style="margin-top:14px">
      ${card(
        'Lots at risk of missing due date',
        'Critical ratio below 1.0, lowest first',
        late.length
          ? `<table class="data-table dense"><thead><tr><th>Lot</th><th>Priority</th><th>Step</th><th>Due</th><th></th></tr></thead><tbody>${late
              .map(
                (l) =>
                  `<tr><td>${lotLink(l.id)}<span class="cell-sub">${esc(l.product)}</span></td><td>${prioBadge(l.priority)}</td><td>${esc(opLabel(fab, l))}</td><td>${dueCell(fab, l)}</td><td class="num">${btn({ label: 'Priority', act: 'prio', perm: 'priority', icon: 'flame', cls: 'sm', data: { lot: l.id } })}</td></tr>`
              )
              .join('')}</tbody></table>`
          : empty('Every lot is on track for its due date.'),
        'span-7',
        btn({ label: 'Start lot', act: 'startLot', perm: 'startLot', icon: 'plus', cls: 'primary sm' })
      )}
      ${card(
        'Bottlenecks',
        'Queued lots per tool slot',
        bottlenecks.length
          ? bars(
              bottlenecks.map((x) => ({
                label: x.t.id,
                value: x.q,
                display: x.q.toFixed(1),
                tip: `${fab.queueFor(x.t.id).length} lots queued · ${e10[x.t.state].name}`,
                attrs: ` data-tool-open="${x.t.id}"`,
              }))
            )
          : empty('No queues anywhere.'),
        'span-5'
      )}
    </div>`;
  }

  const pillHtml = pills
    .map(([v, l]) => `<div class="count-pill"><b>${esc(v)}</b><span>${esc(l)}</span></div>`)
    .join('');
  patch(
    r('workspace'),
    `<div class="ws-hero"><span class="persona-avatar">${icon(p.icon.replace('tabler:', ''))}</span><div><h1>${greeting(fab.now)}, ${esc(p.person)}</h1><p>${esc(p.role)} · ${esc(p.badge)} · ${esc(s.name)}, ${esc(s.crew)} · ${esc(areaText)}</p></div><div class="ws-hero-stats">${pillHtml}</div></div><div style="margin-top:14px">${body}</div>`
  );
}

function lotMiniTable(fab: Fab, lots: Lot[]) {
  if (!lots.length) return '';
  return `<table class="data-table dense"><tbody>${lots
    .map(
      (l) =>
        `<tr><td>${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${l.slots.length} wf</span></td><td>${prioBadge(l.priority)}</td><td>${esc(opLabel(fab, l))}<span class="cell-sub">${l.state === 'running' ? `on ${esc(l.tool)}` : `waiting ${dur(fab.now - l.arrived)}`}</span></td></tr>`
    )
    .join('')}</tbody></table>`;
}

/* ------------------------------------------------------------------ Overview */

export function renderOverview(fab: Fab) {
  patch(r('kpis'), kpiTiles(fab));
  const wip = wipOf(fab);

  // WIP by area, stacked by lot state.
  const byArea = areas.map((a) => {
    const ls = wip.filter((l) => {
      const op = opOf(fab, l);
      return op && [...fab.tools.values()].find((t) => t.def.types.includes(op.type))?.def.area === a.id;
    });
    const c = (s: string) => ls.filter((l) => l.state === s).length;
    return { a, run: c('running'), q: c('queued'), h: c('hold') };
  });
  patch(
    r('wip-area'),
    columns(
      byArea.map((x) => ({
        label: x.a.short,
        tipTitle: x.a.name,
        tip: `${x.run} running · ${x.q} queued · ${x.h} on hold`,
        parts: [
          { value: x.run, cls: 'bg-1' },
          { value: x.q, cls: 'bg-seq' },
          { value: x.h, cls: 'bg-hold' },
        ],
      })),
      { height: 170 }
    ) +
      `<div class="legend" style="margin-top:12px"><span><i class="bg-1"></i>Running</span><span><i class="bg-seq"></i>Queued</span><span><i class="bg-hold"></i>On hold</span></div>`
  );

  // Moves per hour.
  const k = kpis(fab);
  patch(
    r('moves'),
    columns(
      k.hourly.map((v, i) => {
        const t = fab.now - (24 - i) * HOUR;
        return {
          label: hhmm(t).slice(0, 2),
          tipTitle: `${hhmm(t)}–${hhmm(t + HOUR)}`,
          tip: `${num(v)} wafer moves`,
          parts: [{ value: v, cls: 'bg-1' }],
        };
      }),
      { height: 170, every: 3 }
    )
  );

  // Equipment state by area (tool counts).
  const order: E10[] = ['PRD', 'SBY', 'ENG', 'SDT', 'UDT', 'NST'];
  patch(
    r('e10'),
    `<div class="stack" style="gap:10px">${areas
      .map((a) => {
        const ts = [...fab.tools.values()].filter((t) => t.def.area === a.id);
        return `<div style="display:grid;grid-template-columns:110px 1fr 28px;gap:10px;align-items:center;font-size:12.5px"><span class="text-2">${esc(a.name)}</span><div class="state-strip tall" style="height:16px">${order
          .flatMap((s) => ts.filter((t) => t.state === s))
          .map(
            (t) =>
              `<span class="f-${t.state}" style="flex:1" data-tip-title="${t.id}" data-tip-body="${e10[t.state].name}${t.reason ? ` · ${esc(t.reason)}` : ''}" data-tool-open="${t.id}"></span>`
          )
          .join('')}</div><span class="muted num">${ts.length}</span></div>`;
      })
      .join('')}</div><div class="legend" style="margin-top:14px">${order
      .map(
        (s) =>
          `<span><i class="f-${s}"></i>${e10[s].name} <b>${[...fab.tools.values()].filter((t) => t.state === s).length}</b></span>`
      )
      .join('')}</div>`
  );

  // Line profile (WIP by step) for the logic route.
  const route = routes['LGC-28'].ops;
  patch(
    r('profile'),
    columns(
      route.map((o, i) => {
        const ls = wip.filter((l) => l.route === 'LGC-28' && l.step === i);
        const c = (s: string) => ls.filter((l) => l.state === s).length;
        return {
          label: o.op,
          tipTitle: `${o.op} ${o.name}`,
          tip: `${c('running')} running · ${c('queued')} queued · ${c('hold')} on hold`,
          parts: [
            { value: c('running'), cls: 'bg-1' },
            { value: c('queued'), cls: 'bg-seq' },
            { value: c('hold'), cls: 'bg-hold' },
          ],
        };
      }),
      { height: 150, every: 4 }
    )
  );

  patch(r('feed'), feed(fab, fab.events.slice(-40).reverse()));
}

function feed(fab: Fab, evs: Fab['events']) {
  if (!evs.length) return empty('Nothing yet.');
  const ic: Record<string, string> = {
    lot: 'stack-2',
    tool: 'cpu',
    spc: 'chart-line',
    alarm: 'bell',
    user: 'user',
    yield: 'chart-dots',
  };
  return `<div class="feed">${evs
    .map(
      (e) =>
        `<div class="feed-item ${e.kind === 'user' ? 'user' : (e.sev ?? '')}"><span class="feed-time">${stamp(e.t, fab.now)}</span>${icon(ic[e.kind])}<span>${esc(e.text)}${e.lot ? ` <button type="button" class="link" data-lot-open="${esc(e.lot)}" aria-label="Open lot ${esc(e.lot)}">${icon('arrow-right')}</button>` : ''}</span></div>`
    )
    .join('')}</div>`;
}

/* ------------------------------------------------------------------ Lots */

export function renderLots(fab: Fab) {
  patch(
    r('lots-actions'),
    btn({ label: 'Start lot', act: 'startLot', perm: 'startLot', icon: 'plus', cls: 'primary' })
  );
  const f = ui.lots;
  const q = f.q.trim().toLowerCase();
  const wip = wipOf(fab);
  for (const c of $$('[data-lots-count]')) {
    const k = c.dataset.lotsCount!;
    c.textContent = String(k === 'all' ? wip.length : wip.filter((l) => l.state === k).length);
  }
  if (f.mode === 'shipped') {
    const lots = [...fab.lots.values()]
      .filter((l) => l.state === 'done' || l.state === 'scrapped')
      .filter((l) => f.product === 'all' || l.product === f.product)
      .filter((l) => !q || l.id.toLowerCase().includes(q))
      .sort((a, b) => b.finished! - a.finished!);
    patch(r('lots-count'), `${lots.length} lots completed in the last 10 days`);
    patch(
      r('lots'),
      lots.length
        ? `<table class="data-table responsive"><thead><tr><th>Lot</th><th>Product</th><th>State</th><th class="num">Wafers</th><th>Finished</th><th class="num">Cycle time</th><th class="num">Probe yield</th><th>Delivery</th></tr></thead><tbody>${lots
            .map(
              (l) =>
                `<tr class="row-link" data-lot-open="${l.id}" tabindex="0"><td class="lead" data-label="Lot"><span class="mono strong">${l.id}</span></td><td data-label="Product">${esc(l.product)}</td><td data-label="State">${lotStateBadge(l.state)}</td><td class="num" data-label="Wafers">${l.slots.length} / ${l.startQty}</td><td data-label="Finished">${stamp(l.finished!, fab.now)}</td><td class="num" data-label="Cycle time">${dur(l.finished! - l.started)}</td><td class="num" data-label="Probe yield">${l.probe ? pct(l.probe.yield, 1) : '—'}</td><td data-label="Delivery">${l.state === 'scrapped' ? '—' : l.finished! <= l.due ? badge('On time', 'st-good', 'circle-check') : badge(`${dur(l.finished! - l.due)} late`, 'st-crit', 'clock')}</td></tr>`
            )
            .join('')}</tbody></table>`
        : empty('No completed lots match.')
    );
    return;
  }
  const lots = wip
    .filter((l) => f.state === 'all' || l.state === f.state)
    .filter((l) => f.product === 'all' || l.product === f.product)
    .filter((l) => f.prio === 'all' || String(l.priority) === f.prio)
    .filter((l) => !q || `${l.id} ${l.product} ${opLabel(fab, l)} ${l.tool ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => a.priority - b.priority || fab.cr(a) - fab.cr(b));
  patch(r('lots-count'), `${lots.length} of ${wip.length} lots · sorted by priority, then critical ratio`);
  patch(
    r('lots'),
    lots.length
      ? `<table class="data-table responsive"><thead><tr><th>Lot</th><th>Priority</th><th>Current step</th><th>State</th><th>Tool / wait</th><th>Route</th><th>Due</th></tr></thead><tbody>${lots
          .map((l) => {
            const ql = fab.qtimeLeft(l);
            const where =
              l.state === 'running'
                ? `${esc(l.tool)}<span class="cell-sub">${dur(l.runEnd! - fab.now)} left</span>`
                : l.state === 'hold'
                  ? `<span class="text-2">${esc(l.hold!.category)}</span><span class="cell-sub">held ${dur(fab.now - l.hold!.t)}</span>`
                  : `<span class="text-2">waiting ${dur(fab.now - l.arrived)}</span>${ql !== undefined ? `<span class="cell-sub ${ql < HOUR ? 'late' : ''}">Q-time ${dur(ql)} left</span>` : ''}`;
            return `<tr class="row-link" data-lot-open="${l.id}" tabindex="0"><td class="lead" data-label="Lot"><span class="mono strong">${l.id}</span><span class="cell-sub">${esc(l.product)} · ${l.slots.length} wafers</span></td><td data-label="Priority">${prioBadge(l.priority)}</td><td data-label="Step">${esc(opLabel(fab, l))}<span class="cell-sub">${esc(opOf(fab, l)?.recipe ?? '')}</span></td><td data-label="State">${lotStateBadge(l.state)}</td><td data-label="Tool / wait">${where}</td><td data-label="Route">${progress(fab, l)}</td><td data-label="Due">${dueCell(fab, l)}</td></tr>`;
          })
          .join('')}</tbody></table>`
      : empty('No lots match these filters.')
  );
}

/* ------------------------------------------------------------------ Dispatch */

export function renderDispatch(fab: Fab) {
  const ts = [...fab.tools.values()].filter((t) => t.def.area === ui.dispatchArea);
  for (const c of $$('[data-dispatch-count]')) {
    const a = c.dataset.dispatchCount as AreaId;
    const n = new Set(
      [...fab.tools.values()].filter((t) => t.def.area === a).flatMap((t) => fab.queueFor(t.id).map((l) => l.id))
    ).size;
    c.textContent = n ? String(n) : '';
  }
  patch(
    r('dispatch'),
    `<div class="tool-grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))">${ts
      .map((t) => {
        const q = fab.queueFor(t.id);
        const room = fab.hasRoom(t);
        const head = `<div class="tool-card-head"><div><div class="tool-id">${toolLink(t.id)}</div><div class="tool-name">${esc(t.def.name)} · ${t.running.length}/${t.def.capacity} loaded</div></div>${stateBadge(t.state, t.reason)}</div>`;
        const running = t.running.length
          ? `<div class="tool-line"><span>Running</span><span>${toolEta(fab, t)}</span></div>`
          : '';
        const rows = q
          .slice(0, 8)
          .map((l, i) => {
            const ql = fab.qtimeLeft(l);
            return `<tr><td class="num muted">${i + 1}</td><td>${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${l.slots.length} wf</span></td><td>${prioBadge(l.priority)}</td><td><span class="mono">${esc(opOf(fab, l)!.op)}</span><span class="cell-sub">waited ${dur(fab.now - l.arrived)}</span></td><td class="num"><span class="${fab.cr(l) < 1 ? 'late' : ''}">${fab.cr(l).toFixed(2)}</span>${ql !== undefined ? `<span class="cell-sub ${ql < HOUR ? 'late' : ''}">QT ${dur(ql)}</span>` : ''}</td><td class="num">${room ? btn({ label: 'Track in', act: 'trackIn', perm: 'trackIn', icon: 'player-play', cls: i === 0 ? 'primary sm' : 'sm', data: { lot: l.id, tool: t.id } }) : ''}</td></tr>`;
          })
          .join('');
        const table = q.length
          ? `<table class="data-table dense"><thead><tr><th>#</th><th>Lot</th><th>Prio</th><th>Op</th><th class="num">CR</th><th></th></tr></thead><tbody>${rows}</tbody></table>${q.length > 8 ? `<p class="muted" style="font-size:12px;padding:6px 10px">and ${q.length - 8} more</p>` : ''}`
          : empty(fab.isUp(t) ? 'Queue empty.' : 'Tool is not available.');
        return `<article class="card" style="display:grid;gap:10px">${head}${running}${table}</article>`;
      })
      .join('')}</div>`
  );
}

/* ------------------------------------------------------------------ Equipment */

function toolCard(fab: Fab, t: ToolRt) {
  const split = fab.e10Split(t);
  const pm = t.wafersSincePM / t.def.pmInterval;
  return `<button type="button" class="card tool-card" data-tool-open="${t.id}">
    <div class="tool-card-head"><div><div class="tool-id">${t.id}</div><div class="tool-name">${esc(t.def.name)}</div></div>${stateBadge(t.state, t.reason)}</div>
    <div class="tool-line"><span>${t.running.length ? 'Running' : t.reason ? 'Reason' : 'Queue'}</span><b>${
      t.running.length
        ? esc(t.running.map((x) => x.lot).join(', '))
        : t.reason
          ? esc(t.reason)
          : `${fab.queueFor(t.id).length} lots`
    }</b></div>
    <div class="tool-meter"><div><span>24h states</span><span>${pct(split.PRD)} productive</span></div>${stateStrip(t.log, fab.now - DAY, fab.now)}</div>
    <div class="tool-meter"><div><span>PM counter</span><span>${num(t.wafersSincePM)} / ${num(t.def.pmInterval)}</span></div>${meter(pm, pm >= 1 ? 'crit' : pm >= 0.85 ? 'warn' : '')}</div>
  </button>`;
}

export function renderEquipment(fab: Fab) {
  const all = [...fab.tools.values()];
  for (const c of $$('[data-equip-count]')) {
    const k = c.dataset.equipCount!;
    c.textContent = String(k === 'all' ? all.length : all.filter((t) => t.state === k).length);
  }
  const ts = all.filter(
    (t) =>
      (ui.equip.state === 'all' || t.state === ui.equip.state) &&
      (ui.equip.area === 'all' || t.def.area === ui.equip.area)
  );
  patch(
    r('tools'),
    ts.length
      ? areas
          .map((a) => {
            const g = ts.filter((t) => t.def.area === a.id);
            if (!g.length) return '';
            return `<h2 class="section-label" style="margin:18px 0 8px">${esc(a.name)} · ${esc(g[0].def.bay)}</h2><div class="tool-grid">${g.map((t) => toolCard(fab, t)).join('')}</div>`;
          })
          .join('')
      : empty('No tools match these filters.')
  );
}

/* ------------------------------------------------------------------ Maintenance */

export function renderMaintenance(fab: Fab) {
  const ts = [...fab.tools.values()].sort(
    (a, b) => b.wafersSincePM / b.def.pmInterval - a.wafersSincePM / a.def.pmInterval
  );
  patch(
    r('pm'),
    `<table class="data-table responsive"><thead><tr><th>Tool</th><th>PM</th><th>Counter</th><th>Status</th><th>Last PM</th><th></th></tr></thead><tbody>${ts
      .map((t) => {
        const v = t.wafersSincePM / t.def.pmInterval;
        const inPm = t.phase === 'pm';
        const st = inPm
          ? badge('In progress', 'st-info', 'tool')
          : v >= 1
            ? badge('Due', 'st-crit', 'alert-triangle')
            : v >= 0.85
              ? badge('Due soon', 'st-warn', 'clock')
              : badge('OK', 'st-good', 'circle-check');
        return `<tr><td class="lead" data-label="Tool">${toolLink(t.id)}<span class="cell-sub">${esc(areaById.get(t.def.area)!.name)}</span></td><td data-label="PM">${esc(t.def.pmName)}</td><td data-label="Counter" style="min-width:150px"><div class="prog">${meter(v, v >= 1 ? 'crit' : v >= 0.85 ? 'warn' : '')}<span>${pct(Math.min(v, 9))}</span></div><span class="cell-sub">${num(t.wafersSincePM)} / ${num(t.def.pmInterval)} wafers</span></td><td data-label="Status">${st}</td><td data-label="Last PM">${dur(fab.now - t.lastPM)} ago</td><td class="num" data-label="">${inPm ? btn({ label: 'PM done', act: 'complete', perm: 'pm', icon: 'check', cls: 'sm primary', data: { tool: t.id } }) : v >= 0.7 ? btn({ label: 'Start PM', act: 'pm', perm: 'pm', icon: 'calendar-cog', cls: 'sm', data: { tool: t.id } }) : ''}</td></tr>`;
      })
      .join('')}</tbody></table>`
  );
  const wos = [...fab.wos]
    .sort((a, b) => Number(a.status === 'Closed') - Number(b.status === 'Closed') || b.opened - a.opened)
    .slice(0, 60);
  patch(
    r('wo'),
    wos.length
      ? `<table class="data-table responsive"><thead><tr><th>Work order</th><th>Tool</th><th>Type</th><th>Status</th><th>Opened</th><th class="num">Duration</th><th>Assignee</th></tr></thead><tbody>${wos
          .map(
            (w) =>
              `<tr><td class="lead" data-label="Work order"><span class="mono strong">${w.id}</span><span class="cell-sub">${esc(w.text)}</span></td><td data-label="Tool">${toolLink(w.tool)}</td><td data-label="Type">${esc(w.kind)}</td><td data-label="Status">${badge(w.status, w.status === 'Closed' ? 'st-muted' : w.status === 'Open' ? 'st-crit' : 'st-info', w.status === 'Closed' ? 'check' : w.status === 'Open' ? 'alert-circle' : 'tool')}</td><td data-label="Opened">${stamp(w.opened, fab.now)}</td><td class="num" data-label="Duration">${dur((w.closed ?? fab.now) - w.opened)}</td><td data-label="Assignee">${esc(w.by ?? 'Unassigned')}</td></tr>`
          )
          .join('')}</tbody></table>`
      : empty('No work orders yet.')
  );
  // MTTR by area from closed repair orders.
  const rows = areas.map((a) => {
    const rep = fab.wos.filter(
      (w) => w.kind === 'Repair' && w.status === 'Closed' && fab.tools.get(w.tool)?.def.area === a.id
    );
    return { a, n: rep.length, mttr: avg(rep.map((w) => w.closed! - w.opened)) };
  });
  patch(
    r('mttr'),
    bars(
      rows.map((x) => ({
        label: x.a.name,
        value: x.mttr / HOUR,
        display: x.n ? dur(x.mttr) : '—',
        tip: `${x.n} repairs closed · mean time to repair ${x.n ? dur(x.mttr) : 'n/a'}`,
      }))
    )
  );
}

/* ------------------------------------------------------------------ Alarms */

export function renderAlarms(fab: Fab) {
  const f = ui.alarms;
  let list = f.mode === 'active' ? fab.activeAlarms() : [...fab.alarms];
  if (f.sev !== 'all') list = list.filter((a) => a.sev === f.sev);
  list = [...list].sort((a, b) => Number(!!a.acked) - Number(!!b.acked) || b.t - a.t);
  patch(r('alarms-count'), `${list.length} alarm${list.length === 1 ? '' : 's'} · unacknowledged first`);
  patch(
    r('alarms'),
    list.length
      ? `<table class="data-table responsive"><thead><tr><th>Severity</th><th>Alarm</th><th>Tool</th><th>Lot</th><th>Raised</th><th>Status</th><th></th></tr></thead><tbody>${list
          .map((a) => {
            const st = a.cleared
              ? `<span class="muted">Cleared ${hhmm(a.cleared.t)}</span><span class="cell-sub">${esc(a.cleared.by)}</span>`
              : a.acked
                ? `<span class="text-2">Acked ${hhmm(a.acked.t)}</span><span class="cell-sub">${esc(a.acked.by)}</span>`
                : `<span class="late">Unacknowledged</span>`;
            const tool = fab.tools.get(a.tool);
            const actions = a.cleared
              ? ''
              : !a.acked
                ? btn({ label: 'Ack', act: 'ack', perm: 'ackAlarm', cls: 'sm', data: { alarm: a.id } })
                : a.sev !== 'crit' || !tool || fab.isUp(tool)
                  ? btn({ label: 'Clear', act: 'clear', perm: 'ackAlarm', icon: 'x', cls: 'sm', data: { alarm: a.id } })
                  : '';
            return `<tr><td data-label="Severity">${badge(SEV[a.sev].name, SEV[a.sev].cls, SEV[a.sev].icon)}</td><td class="lead" data-label="Alarm"><span class="strong">${esc(a.text)}</span><span class="cell-sub mono">${a.id} · ${esc(a.code)}</span></td><td data-label="Tool">${toolLink(a.tool)}</td><td data-label="Lot">${a.lot ? lotLink(a.lot) : '<span class="muted">—</span>'}</td><td data-label="Raised">${stamp(a.t, fab.now)}<span class="cell-sub">${dur(fab.now - a.t)} ago</span></td><td data-label="Status">${st}</td><td class="num" data-label="">${actions}</td></tr>`;
          })
          .join('')}</tbody></table>`
      : empty(f.mode === 'active' ? 'No active alarms. The fab is quiet.' : 'No alarms recorded.')
  );
}

/* ------------------------------------------------------------------ SPC */

/** Tools that run a parameter's source op, in fixed order (so each keeps its chart color). */
export function spcTools(paramId: string) {
  const p = spcById.get(paramId)!;
  const op = Object.values(routes)
    .flatMap((rt) => rt.ops)
    .find((o) => o.op === p.sourceOp)!;
  return toolDefs.filter((t) => t.types.includes(op.type)).map((t) => t.id);
}

export function renderSpc(fab: Fab) {
  const p = spcById.get(ui.spc.param)!;
  const tl = spcTools(p.id);
  const sel = $<HTMLSelectElement>('[data-spc-tool]');
  if (sel) {
    const opts = `<option value="all">All tools</option>${tl.map((t) => `<option value="${t}">${t}</option>`).join('')}`;
    if (sel.dataset.for !== p.id) {
      sel.innerHTML = opts;
      sel.dataset.for = p.id;
    }
    if (!tl.includes(ui.spc.tool)) ui.spc.tool = 'all';
    sel.value = ui.spc.tool;
  }
  for (const b of $$('[data-spc-param]')) b.setAttribute('aria-pressed', String(b.dataset.spcParam === p.id));
  const pts = fab.spc[p.id].filter((x) => ui.spc.tool === 'all' || x.tool === ui.spc.tool).slice(-80);
  const host = r('spc-chart');
  const width = host?.clientWidth ?? 800;
  const digits = p.sigma < 0.1 ? 3 : p.sigma < 5 ? 2 : 0;
  const f = (v: number) => v.toFixed(digits);
  const colorOf = (tool: string) => Math.max(0, tl.indexOf(tool)) + 1;
  const series = (ui.spc.tool === 'all' ? tl : [ui.spc.tool]).map((tool) => ({
    cls: colorOf(tool),
    line: ui.spc.tool !== 'all',
    points: pts
      .filter((x) => x.tool === tool)
      .map((x) => ({
        x: x.t,
        y: x.value,
        cls: `fill-${colorOf(tool)}${x.rule === 1 ? ' bad' : x.rule ? ' warn' : ''}`,
        r: x.rule ? 6 : 4,
        tipTitle: `${x.lot} · ${f(x.value)} ${p.unit}`,
        tipBody: `${x.tool} → measured on ${x.met} · ${stamp(x.t, fab.now)}${x.rule ? ` · ${x.rule === 1 ? 'Rule 1: beyond 3σ' : x.rule === 2 ? 'Rule 2: 2 of 3 beyond 2σ' : 'Rule 4: 8 in a row on one side'}` : ''}${x.oos ? ' · OUT OF SPEC' : ''}`,
      })),
  }));
  const s = p.sigma;
  patch(
    host,
    lineChart(width, series, {
      height: 280,
      refs: [
        { y: p.target + 3 * s, cls: 'ctl', label: `UCL ${f(p.target + 3 * s)}` },
        { y: p.target, cls: 'center', label: `CL ${f(p.target)}` },
        { y: p.target - 3 * s, cls: 'ctl', label: `LCL ${f(p.target - 3 * s)}` },
        { y: p.usl, cls: 'spec', label: `USL ${f(p.usl)}` },
        { y: p.lsl, cls: 'spec', label: `LSL ${f(p.lsl)}` },
      ],
      zones: [[p.target - 2 * s, p.target + 2 * s]],
      yFmt: f,
      xFmt: (v) => hhmm(v),
    })
  );
  patch(
    r('spc-legend'),
    `${(ui.spc.tool === 'all' ? tl : [ui.spc.tool]).map((t) => `<span><i class="bg-${colorOf(t)}"></i>${t}</span>`).join('')}<span><i style="background:transparent;box-shadow:inset 0 0 0 2px var(--st-crit);border-radius:9999px"></i>Out of control (rule 1)</span><span><i style="background:transparent;box-shadow:inset 0 0 0 2px var(--st-warn);border-radius:9999px"></i>Trend (rules 2, 4)</span><span><i class="dash" style="border-top-color:var(--st-crit)"></i>Control limits ±3σ</span><span><i class="dash"></i>Spec limits</span><span><i style="background:var(--app-primary-softer)"></i>±2σ zone</span>`
  );

  // Capability by tool.
  const rows = tl.map((tool) => {
    const v = fab.spc[p.id].filter((x) => x.tool === tool).slice(-30);
    const mean = avg(v.map((x) => x.value));
    const sd = Math.sqrt(avg(v.map((x) => (x.value - mean) ** 2))) || s;
    const cpk = Math.min(p.usl - mean, mean - p.lsl) / (3 * sd);
    const last = [...fab.spc[p.id]].reverse().find((x) => x.tool === tool && x.rule);
    return { tool, n: v.length, mean, sd, cpk, last };
  });
  patch(
    r('spc-cap'),
    `<table class="data-table"><thead><tr><th>Tool</th><th>State</th><th class="num">n</th><th class="num">Mean</th><th class="num">σ</th><th class="num">Cpk</th><th>Last signal</th></tr></thead><tbody>${rows
      .map(
        (x) =>
          `<tr><td><span class="legend"><span><i class="bg-${colorOf(x.tool)}"></i>${toolLink(x.tool)}</span></span></td><td>${stateBadge(fab.tools.get(x.tool)!.state)}</td><td class="num">${x.n}</td><td class="num">${x.n ? f(x.mean) : '—'}</td><td class="num">${x.n ? x.sd.toFixed(digits + 1) : '—'}</td><td class="num ${x.cpk < 1 ? 'late' : x.cpk < 1.33 ? '' : ''}">${x.n > 4 ? x.cpk.toFixed(2) : '—'}</td><td>${x.last ? `${badge(x.last.rule === 1 ? 'OOC' : `Rule ${x.last.rule}`, x.last.rule === 1 ? 'st-crit' : 'st-warn')} <span class="muted">${dur(fab.now - x.last.t)} ago</span>` : '<span class="muted">None</span>'}</td></tr>`
      )
      .join(
        ''
      )}</tbody></table><p class="muted" style="font-size:12px;margin-top:8px">Last 30 points per tool. Cpk below 1.00 means the tool cannot hold the spec; 1.33 is the usual target.</p>`
  );

  const viol = spcParams
    .flatMap((sp) => fab.spc[sp.id].filter((x) => x.rule).map((x) => ({ ...x, sp })))
    .sort((a, b) => b.t - a.t)
    .slice(0, 14);
  patch(
    r('spc-viol'),
    viol.length
      ? `<table class="data-table dense"><tbody>${viol
          .map(
            (x) =>
              `<tr><td>${badge(x.rule === 1 ? 'OOC' : `Rule ${x.rule}`, x.rule === 1 ? 'st-crit' : 'st-warn')}</td><td><button type="button" class="link strong" data-act="spcTool" data-param="${x.sp.id}" data-tool="${esc(x.tool)}">${x.sp.id}</button><span class="cell-sub">${esc(x.tool)} · ${stamp(x.t, fab.now)}</span></td><td>${lotLink(x.lot)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : empty('No signals yet.')
  );
  patch(
    r('spc-info'),
    `<dl class="kv"><dt>Parameter</dt><dd>${esc(p.name)}</dd><dt>Target</dt><dd>${f(p.target)} ${esc(p.unit)}</dd><dt>Spec (LSL – USL)</dt><dd>${f(p.lsl)} – ${f(p.usl)}</dd><dt>Process σ</dt><dd>${p.sigma} ${esc(p.unit)}</dd><dt>Responsible step</dt><dd>${esc(
      Object.values(routes)
        .flatMap((rt) => rt.ops)
        .find((o) => o.op === p.sourceOp)?.name ?? p.sourceOp
    )}</dd></dl>`
  );
}

/* ------------------------------------------------------------------ Yield */

export function commonality(lots: Lot[]) {
  const ops = new Map<string, { name: string; tools: Map<string, number[]> }>();
  for (const l of lots) {
    if (!l.probe) continue;
    for (const o of routes[l.route].ops) {
      const tool = l.toolsUsed[o.op];
      if (!tool || ['cd', 'ovl', 'thk', 'defect', 'probe'].includes(o.type)) continue;
      const e = ops.get(o.op) ?? ops.set(o.op, { name: o.name, tools: new Map() }).get(o.op)!;
      (e.tools.get(tool) ?? e.tools.set(tool, []).get(tool)!).push(l.probe.yield);
    }
  }
  const out: { op: string; name: string; tool: string; n: number; mean: number; others: number; delta: number }[] = [];
  for (const [op, e] of ops) {
    if (e.tools.size < 2) continue;
    for (const [tool, ys] of e.tools) {
      if (ys.length < 3) continue;
      const rest = [...e.tools.entries()].filter(([t]) => t !== tool).flatMap(([, v]) => v);
      if (rest.length < 3) continue;
      const mean = avg(ys);
      const others = avg(rest);
      out.push({ op, name: e.name, tool, n: ys.length, mean, others, delta: mean - others });
    }
  }
  return out.sort((a, b) => a.delta - b.delta);
}

function commonTable(rows: ReturnType<typeof commonality>) {
  const worst = Math.min(...rows.map((r) => r.delta));
  return `<table class="data-table dense"><thead><tr><th>Step</th><th>Tool</th><th class="num">n</th><th class="num">Yield</th><th class="num">Others</th><th class="num">Δ</th></tr></thead><tbody>${rows
    .map(
      (x) =>
        `<tr><td><span class="mono">${x.op}</span><span class="cell-sub">${esc(x.name)}</span></td><td>${toolLink(x.tool)}</td><td class="num">${x.n}</td><td class="num">${pct(x.mean, 1)}</td><td class="num muted">${pct(x.others, 1)}</td><td class="num"><span class="${x.delta < -0.02 ? 'late' : ''}">${(x.delta * 100).toFixed(1)} pts</span><div class="meter crit" style="margin-top:4px;width:60px;margin-left:auto"><span style="width:${(x.delta / (worst || -1)) * 100}%"></span></div></td></tr>`
    )
    .join('')}</tbody></table>`;
}

export function renderYield(fab: Fab) {
  const pf = ui.yield.product;
  for (const b of $$('[data-yield-product]')) b.setAttribute('aria-pressed', String(b.dataset.yieldProduct === pf));
  const lots = fab
    .shipped()
    .filter((l) => l.probe && (pf === 'all' || l.product === pf))
    .sort((a, b) => a.finished! - b.finished!);
  const ys = lots.map((l) => l.probe!.yield);
  const binsTotal: Record<number, number> = { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0 };
  let dies = 0;
  for (const l of lots) {
    for (const [b, n] of Object.entries(l.probe!.bins)) binsTotal[+b] += n;
    dies += l.probe!.dies;
  }
  const low = lots.filter((l) => l.probe!.yield < productById.get(l.product)!.baseYield - 0.08);
  const fails = bins
    .filter((b) => b.id !== 1)
    .map((b) => ({ b, v: binsTotal[b.id] / Math.max(1, dies) }))
    .sort((a, b) => b.v - a.v);
  const day = lots.filter((l) => l.finished! > fab.now - DAY);
  const lineYield = lots.length
    ? lots.reduce((s, l) => s + l.slots.length, 0) / lots.reduce((s, l) => s + l.startQty, 0)
    : 1;
  const tile = (label: string, value: string, note: string, cls = '') =>
    `<div class="card stat kpi ${cls}"><p class="stat-label">${esc(label)}</p><p class="stat-value">${value}</p><p class="stat-note"><span>${note}</span></p></div>`;
  patch(
    r('yield-kpis'),
    `<div class="kpi-row">${[
      tile('Probe yield · 7d', pct(avg(ys), 1), `${lots.length} lots probed`, avg(ys) < 0.9 ? 'warn' : 'good'),
      tile('Last 24h', day.length ? pct(avg(day.map((l) => l.probe!.yield)), 1) : '—', `${day.length} lots`),
      tile('Line yield', pct(lineYield, 1), 'Wafers out ÷ wafers started'),
      tile('Low-yield lots', String(low.length), '8+ pts below product baseline', low.length ? 'warn' : ''),
      tile('Top fail bin', fails[0] ? fails[0].b.short : '—', fails[0] ? `${pct(fails[0].v, 1)} of dies` : ''),
    ].join('')}</div>`
  );

  const host = r('yield-trend');
  const prods = products.filter((p) => pf === 'all' || p.id === pf);
  patch(
    host,
    lineChart(
      host?.clientWidth ?? 700,
      prods.map((p) => ({
        cls: p.series,
        points: lots
          .filter((l) => l.product === p.id)
          .map((l) => ({
            x: l.finished!,
            y: l.probe!.yield * 100,
            tipTitle: `${l.id} · ${pct(l.probe!.yield, 1)}`,
            tipBody: `${p.id} ${p.name} · probed ${stamp(l.finished!, fab.now)} on ${l.probe!.tool}`,
          })),
      })),
      { height: 230, yFmt: (v) => `${Math.round(v)}%`, xFmt: (v) => dayLabel(v).split(' ').slice(0, 2).join(' ') }
    )
  );
  patch(
    r('yield-legend'),
    prods.map((p) => `<span><i class="bg-${p.series}"></i>${p.id} · ${esc(p.name)}</span>`).join('')
  );
  patch(
    r('yield-pareto'),
    bars(
      fails.map((x) => ({
        label: `Bin ${x.b.id} · ${x.b.short}`,
        value: x.v,
        display: pct(x.v, 2),
        tip: `${num(binsTotal[x.b.id])} failing dies of ${num(dies)} tested`,
      }))
    )
  );
  const common = commonality(lots).slice(0, 8);
  patch(r('yield-common'), common.length ? commonTable(common) : empty('Not enough probed lots yet.'));

  // Wafer map viewer.
  const sel = $<HTMLSelectElement>('[data-yield-lot]');
  const choices = [...lots].reverse().slice(0, 60);
  if (!choices.some((l) => l.id === ui.yield.lot)) {
    const lotsAll = fab.shipped().filter((l) => l.probe);
    ui.yield.lot = (lotsAll.find((l) => l.id === ui.yield.lot) ? ui.yield.lot : choices[0]?.id) ?? '';
  }
  if (sel) {
    const html = choices
      .map((l) => `<option value="${l.id}">${l.id} · ${l.product} · ${pct(l.probe!.yield, 1)}</option>`)
      .join('');
    if (sel.dataset.sig !== html && document.activeElement !== sel) {
      sel.innerHTML = html || '<option value="">No probed lots</option>';
      sel.dataset.sig = html;
    }
    if (ui.yield.lot && choices.some((l) => l.id === ui.yield.lot)) sel.value = ui.yield.lot;
  }
  const lot = fab.lots.get(ui.yield.lot);
  if (!lot?.probe) {
    patch(r('yield-wafers'), empty('Pick a probed lot.'));
    patch(r('yield-map'), '');
    patch(r('yield-lotinfo'), '');
  } else {
    const pr = lot.probe;
    if (!pr.slots.includes(ui.yield.wafer)) ui.yield.wafer = pr.slots[pr.yields.indexOf(Math.min(...pr.yields))];
    const base = productById.get(lot.product)!.baseYield;
    patch(
      r('yield-wafers'),
      `<div class="wafer-strip">${pr.slots
        .map(
          (s, i) =>
            `<button type="button" class="wafer-chip ${pr.yields[i] < base - 0.08 ? 'low' : ''}" data-wafer="${s}" data-key="w:${s}" aria-pressed="${s === ui.yield.wafer}" data-tip-title="Wafer ${s}" data-tip-body="Die yield ${pct(pr.yields[i], 1)}"><span>#${s}</span><b>${Math.round(pr.yields[i] * 100)}</b></button>`
        )
        .join('')}</div>`
    );
    const dies = waferMap(lot, ui.yield.wafer);
    const n = productById.get(lot.product)!.grid;
    const cell = 300 / n;
    const counts: Record<number, number> = { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0 };
    for (const d of dies) counts[d.bin]++;
    const binName = new Map<number, string>(bins.map((b) => [b.id, b.name]));
    patch(
      r('yield-map'),
      `<div class="wafer"><svg viewBox="-6 -6 312 312" role="img" aria-label="Wafer ${ui.yield.wafer} map"><circle class="edge" cx="150" cy="150" r="152"/><path class="notch" d="M143 302 L150 292 L157 302 Z"/>${dies
        .map(
          (d) =>
            `<rect class="d${d.bin}" x="${(d.x * cell + 0.4).toFixed(2)}" y="${(d.y * cell + 0.4).toFixed(2)}" width="${(cell - 0.8).toFixed(2)}" height="${(cell - 0.8).toFixed(2)}" rx="0.8" data-tip-title="Die (${d.x}, ${d.y})" data-tip-body="Bin ${d.bin} · ${esc(binName.get(d.bin))}"/>`
        )
        .join('')}</svg></div><div class="legend" style="justify-content:center;margin-top:10px">${bins
        .map(
          (b) =>
            `<span><i class="${b.id === 1 ? 'bin-pass' : `bin-${b.id}`}"></i>${esc(b.short)} <b>${counts[b.id]}</b></span>`
        )
        .join('')}</div>`
    );
    const sig = lot.sig;
    const sigs = [
      ['Edge ring', sig.edge, 'etch'],
      ['Center loss', sig.center, 'film / implant'],
      ['Reticle repeater', sig.field, 'litho'],
      ['Scratch', sig.scratch, 'CMP / PVD'],
    ] as const;
    const top = [...sigs].sort((a, b) => b[1] - a[1])[0];
    const keyOps = routes[lot.route].ops.filter((o) => ['etch', 'litho', 'cvd', 'cmp'].includes(o.type));
    patch(
      r('yield-lotinfo'),
      `<dl class="kv"><dt>Lot</dt><dd>${lotLink(lot.id)}</dd><dt>Product</dt><dd>${esc(lot.product)}</dd><dt>Lot yield</dt><dd>${pct(pr.yield, 1)}</dd><dt>Wafer ${ui.yield.wafer}</dt><dd>${pct(counts[1] / Math.max(1, dies.length), 1)} · ${dies.length} dies</dd><dt>Signature</dt><dd>${top[1] > 0.04 ? `${top[0]} <span class="muted">(${top[2]})</span>` : 'Random defects'}</dd></dl><h3 class="section-label" style="margin:14px 0 6px">Tools at key steps</h3><div class="flex flex-wrap gap-1.5">${keyOps
        .map(
          (o) =>
            `<span class="badge" data-tip-title="${o.op} ${esc(o.name)}" data-tip-body="${esc(lot.toolsUsed[o.op] ?? '—')}">${o.op} ${esc(lot.toolsUsed[o.op] ?? '—')}</span>`
        )
        .join('')}</div>`
    );
  }
  patch(
    r('yield-low'),
    low.length
      ? `<table class="data-table dense"><tbody>${[...low]
          .reverse()
          .slice(0, 10)
          .map(
            (l) =>
              `<tr><td>${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${stamp(l.finished!, fab.now)}</span></td><td class="num late">${pct(l.probe!.yield, 1)}</td><td class="num">${plain('Maps', 'viewWafers', { lot: l.id }, 'circle-dot', 'sm')}</td></tr>`
          )
          .join('')}</tbody></table>`
      : empty('No low-yield lots this week.')
  );
}

/* ------------------------------------------------------------------ Holds */

export function renderHolds(fab: Fab) {
  const all = wipOf(fab).filter((l) => l.state === 'hold' || l.holdAfter);
  for (const c of $$('[data-holds-count]')) {
    const k = c.dataset.holdsCount!;
    c.textContent = String(k === 'all' ? all.length : all.filter((l) => l.hold?.category === k).length);
  }
  const list = all
    .filter((l) => ui.holds.cat === 'all' || l.hold?.category === ui.holds.cat)
    .sort((a, b) => (a.hold?.t ?? Infinity) - (b.hold?.t ?? Infinity));
  patch(
    r('holds'),
    list.length
      ? `<table class="data-table responsive"><thead><tr><th>Lot</th><th>Category</th><th>Reason</th><th>Held at</th><th>Held by</th><th>Age</th><th></th></tr></thead><tbody>${list
          .map((l) => {
            const h = l.hold;
            if (!h)
              return `<tr><td class="lead" data-label="Lot">${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${l.slots.length} wafers</span></td><td data-label="Category">${badge('Future hold', 'st-info', 'clock')}</td><td data-label="Reason">${esc(l.holdAfter!.reason)}</td><td data-label="Held at">After ${esc(opLabel(fab, l))}</td><td data-label="Held by">${esc(l.holdAfter!.by)}</td><td data-label="Age">—</td><td></td></tr>`;
            return `<tr><td class="lead" data-label="Lot">${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${l.slots.length} wafers · ${prioBadge(l.priority)}</span></td><td data-label="Category">${badge(h.category, h.category === 'SPC' || h.category === 'Equipment' ? 'st-crit' : 'st-warn')}</td><td data-label="Reason">${esc(h.reason)}${h.reworkTo !== undefined ? '<span class="cell-sub">Rework possible</span>' : ''}</td><td data-label="Held at"><span class="mono">${esc(h.op)}</span></td><td data-label="Held by">${esc(h.by)}</td><td data-label="Age"><span class="${fab.now - h.t > 4 * HOUR ? 'late' : ''}">${dur(fab.now - h.t)}</span></td><td class="num" data-label=""><div class="btn-row" style="justify-content:flex-end">${btn({ label: 'Disposition', act: 'dispo', perm: 'disposition', icon: 'gavel', cls: 'sm primary', data: { lot: l.id } })}${btn({ label: 'Split', act: 'split', perm: 'split', icon: 'arrows-split-2', cls: 'sm', data: { lot: l.id } })}</div></td></tr>`;
          })
          .join('')}</tbody></table>`
      : empty('No lots on hold.')
  );
  const cats = ['SPC', 'Equipment', 'Q-time', 'Defect', 'Manual'];
  patch(
    r('holds-sum'),
    bars(
      cats.map((c) => {
        const ls = all.filter((l) => l.hold?.category === c);
        return {
          label: c,
          value: ls.length,
          display: String(ls.length),
          tip: `${ls.reduce((s, l) => s + l.slots.length, 0)} wafers · oldest ${ls.length ? dur(fab.now - Math.min(...ls.map((l) => l.hold!.t))) : '—'}`,
        };
      }),
      Math.max(1, ...cats.map((c) => all.filter((l) => l.hold?.category === c).length))
    )
  );
}

/* ------------------------------------------------------------------ Lot sheet */

export function lotSheet(fab: Fab, id: string) {
  const l = fab.lots.get(id);
  if (!l) return { title: id, body: empty('This lot is no longer tracked.') };
  const p = productById.get(l.product)!;
  const op = opOf(fab, l);
  const ops = fab.route(l);
  const ql = fab.qtimeLeft(l);
  const title = `<span class="sheet-title-wrap"><span class="mono">${l.id}</span>${lotStateBadge(l.state)}${prioBadge(l.priority)}</span>`;
  const kv = (k: string, v: string) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  const active = l.state === 'queued' || l.state === 'running' || l.state === 'hold';
  const actions = active
    ? [
        l.state === 'queued'
          ? btn({
              label: 'Track in',
              act: 'trackIn',
              perm: 'trackIn',
              icon: 'player-play',
              cls: 'primary',
              data: { lot: l.id },
            })
          : '',
        l.state === 'hold'
          ? btn({
              label: 'Disposition',
              act: 'dispo',
              perm: 'disposition',
              icon: 'gavel',
              cls: 'primary',
              data: { lot: l.id },
            })
          : '',
        l.state !== 'hold' && !l.holdAfter
          ? btn({ label: 'Hold', act: 'hold', perm: 'hold', icon: 'hand-stop', data: { lot: l.id } })
          : '',
        l.state !== 'running' && l.slots.length > 1
          ? btn({ label: 'Split', act: 'split', perm: 'split', icon: 'arrows-split-2', data: { lot: l.id } })
          : '',
        btn({ label: 'Priority', act: 'prio', perm: 'priority', icon: 'flame', data: { lot: l.id } }),
      ].join('')
    : l.probe
      ? plain('Wafer maps', 'viewWafers', { lot: l.id }, 'circle-dot')
      : '';
  const where =
    l.state === 'running'
      ? `${toolLink(l.tool!)} · ${dur(l.runEnd! - fab.now)} left`
      : l.state === 'queued'
        ? `Queued ${dur(fab.now - l.arrived)}`
        : l.state === 'hold'
          ? `Held ${dur(fab.now - l.hold!.t)}`
          : stamp(l.finished!, fab.now);
  const holdNote = l.hold
    ? `<div class="notice" style="background:var(--st-warn-bg);border-color:transparent">${icon('hand-stop')}<span><b>${esc(l.hold.category)} hold</b> by ${esc(l.hold.by)}, ${dur(fab.now - l.hold.t)} ago: ${esc(l.hold.reason)}${l.hold.reworkTo !== undefined ? `. Rework to ${esc(ops[l.hold.reworkTo].name)} is possible.` : ''}</span></div>`
    : l.holdAfter
      ? `<div class="notice">${icon('clock')}<span>Future hold after this step: ${esc(l.holdAfter.reason)} (${esc(l.holdAfter.by)})</span></div>`
      : '';
  const slots = Array.from({ length: 25 }, (_, i) => i + 1)
    .map(
      (s) =>
        `<span class="${l.slots.includes(s) ? '' : 'gone'}" data-tip-title="Slot ${s}" data-tip-body="${l.slots.includes(s) ? 'In this lot' : 'Not in this lot (split or scrapped)'}"></span>`
    )
    .join('');
  const genealogy =
    l.parent || l.children.length
      ? `<p class="text-2" style="font-size:12.5px;margin-top:8px">${l.parent ? `Split from ${lotLink(l.parent)}. ` : ''}${l.children.length ? `Children: ${l.children.map(lotLink).join(', ')}` : ''}</p>`
      : '';
  const outByOp = new Map<string, number>();
  for (const h of l.history) if (h.kind === 'out' && h.op) outByOp.set(h.op, h.t);
  const route = `<div class="route">${ops
    .map((o, i) => {
      const st = i < l.step || l.state === 'done' ? 'done' : i === l.step && active ? 'current' : 'future';
      const tool = l.toolsUsed[o.op];
      const right =
        st === 'current'
          ? l.state === 'running'
            ? badge('Running', 'st-good', 'player-play')
            : l.state === 'hold'
              ? badge('Hold', 'st-warn', 'hand-stop')
              : badge('Queued', 'st-info', 'hourglass')
          : st === 'done'
            ? `<span class="muted">${tool ?? ''}${outByOp.get(o.op) ? ` · ${stamp(outByOp.get(o.op)!, fab.now)}` : ''}</span>`
            : `<span class="muted">${esc(areaById.get([...fab.tools.values()].find((t) => t.def.types.includes(o.type))!.def.area)!.short)}</span>`;
      return `<div class="route-step ${st}"><span class="route-dot"></span><span class="route-op mono">${o.op}</span><span>${esc(o.name)}${o.spc ? ` <span class="badge" style="padding:1px 6px">SPC</span>` : ''}${o.qtime ? ` <span class="badge" style="padding:1px 6px" data-tip-title="Q-time" data-tip-body="Must start within ${o.qtime} min of the previous step">QT</span>` : ''}</span>${right}</div>`;
    })
    .join('')}</div>`;
  const hist = `<div class="hist">${[...l.history]
    .reverse()
    .slice(0, 60)
    .map(
      (h) =>
        `<div class="hist-row"><time>${stamp(h.t, fab.now)}</time><span>${esc(h.text)}${h.tool ? ` · <span class="mono">${esc(h.tool)}</span>` : ''}<span class="hist-by">${esc(h.by)}</span></span></div>`
    )
    .join('')}</div>`;
  const body = `
    <p class="text-2" style="font-size:13px">${esc(p.id)} ${esc(p.name)} · route ${esc(l.route)} · ${esc(routes[l.route].name)}</p>
    ${holdNote}
    ${actions ? `<div class="btn-row">${actions}</div>` : ''}
    <dl class="kv-grid">
      ${kv('Current step', op ? `${op.op} ${esc(op.name)}` : 'Complete')}
      ${kv('Where', where)}
      ${kv('Wafers', `${l.slots.length} of ${l.startQty}`)}
      ${kv('Started', stamp(l.started, fab.now))}
      ${kv(active ? 'Due' : 'Was due', `<span class="${(active ? fab.now : l.finished!) > l.due ? 'late' : ''}">${stamp(l.due, fab.now)}</span>`)}
      ${kv('Cycle time', dur((l.finished ?? fab.now) - l.started))}
      ${active ? kv('Critical ratio', `<span class="${fab.cr(l) < 1 ? 'late' : ''}">${fab.cr(l).toFixed(2)}</span>`) : kv('Probe yield', l.probe ? pct(l.probe.yield, 1) : '—')}
      ${ql !== undefined ? kv('Q-time left', `<span class="${ql < HOUR ? 'late' : ''}">${dur(ql)}</span>`) : kv('Reworks', String(l.reworks))}
    </dl>
    <section class="sheet-section"><h3 class="section-label">Wafer slots</h3><div class="slots">${slots}</div>${genealogy}</section>
    <section class="sheet-section"><h3 class="section-label">Route · ${l.step}/${ops.length} steps</h3>${route}</section>
    <section class="sheet-section"><h3 class="section-label">History</h3>${hist}</section>`;
  return { title, body };
}

/* ------------------------------------------------------------------ Tool sheet */

export function toolSheet(fab: Fab, id: string) {
  const t = fab.tools.get(id);
  if (!t) return { title: id, body: empty('Unknown tool.') };
  const split = fab.e10Split(t);
  const title = `<span class="sheet-title-wrap"><span class="mono">${t.id}</span>${stateBadge(t.state, t.reason)}</span>`;
  const kv = (k: string, v: string) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  const phase = t.phase;
  const actions: string[] = [];
  if (t.state === 'UDT' && phase === 'alarm') {
    actions.push(
      btn({ label: 'Start repair', act: 'repair', perm: 'repair', icon: 'tool', cls: 'primary', data: { tool: t.id } })
    );
    if (t.alarm && !fab.alarms.find((a) => a.id === t.alarm)?.acked)
      actions.push(btn({ label: 'Acknowledge alarm', act: 'ack', perm: 'ackAlarm', data: { alarm: t.alarm } }));
  }
  if (phase === 'repair')
    actions.push(
      btn({
        label: 'Repair done → qualify',
        act: 'complete',
        perm: 'repair',
        icon: 'check',
        cls: 'primary',
        data: { tool: t.id },
      })
    );
  if (phase === 'pm')
    actions.push(
      btn({
        label: 'PM done → qualify',
        act: 'complete',
        perm: 'pm',
        icon: 'check',
        cls: 'primary',
        data: { tool: t.id },
      })
    );
  if (phase === 'qual')
    actions.push(
      btn({
        label: 'Qualification passed',
        act: 'release',
        perm: 'qual',
        icon: 'shield-check',
        cls: 'primary',
        data: { tool: t.id },
      })
    );
  if (phase === 'inhibit') {
    actions.push(
      btn({
        label: 'Release inhibit',
        act: 'release',
        perm: 'inhibit',
        icon: 'shield-check',
        cls: 'primary',
        data: { tool: t.id },
      })
    );
    actions.push(btn({ label: 'Start PM', act: 'pm', perm: 'pm', icon: 'calendar-cog', data: { tool: t.id } }));
  }
  if (fab.isUp(t)) {
    if (!t.running.length)
      actions.push(btn({ label: 'Start PM', act: 'pm', perm: 'pm', icon: 'calendar-cog', data: { tool: t.id } }));
    actions.push(btn({ label: 'Inhibit', act: 'inhibit', perm: 'inhibit', icon: 'flask', data: { tool: t.id } }));
    actions.push(
      btn({
        label: 'Call technician',
        act: 'callTech',
        perm: 'callTech',
        icon: 'bell-ringing',
        cls: 'danger',
        data: { tool: t.id },
      })
    );
  }
  const q = fab.queueFor(t.id);
  const room = fab.hasRoom(t);
  const queue = q.length
    ? `<table class="data-table dense"><tbody>${q
        .slice(0, 6)
        .map(
          (l, i) =>
            `<tr><td class="num muted">${i + 1}</td><td>${lotLink(l.id)}<span class="cell-sub">${esc(l.product)} · ${l.slots.length} wf</span></td><td>${prioBadge(l.priority)}</td><td>${esc(opLabel(fab, l))}</td><td class="num">${room ? btn({ label: 'Track in', act: 'trackIn', perm: 'trackIn', icon: 'player-play', cls: 'sm', data: { lot: l.id, tool: t.id } }) : ''}</td></tr>`
        )
        .join(
          ''
        )}</tbody></table>${q.length > 6 ? `<p class="muted" style="font-size:12px">and ${q.length - 6} more</p>` : ''}`
    : empty('No lots waiting for this tool.');
  const alarms = fab.alarms
    .filter((a) => a.tool === t.id)
    .slice(-6)
    .reverse();
  const wos = fab.wos
    .filter((w) => w.tool === t.id)
    .slice(-5)
    .reverse();
  const params = spcParams.filter((p) => spcTools(p.id).includes(t.id));
  const order: E10[] = ['PRD', 'SBY', 'ENG', 'SDT', 'UDT', 'NST'];
  const body = `
    <p class="text-2" style="font-size:13px">${esc(t.def.name)} · ${esc(areaById.get(t.def.area)!.name)} · ${esc(t.def.bay)} · ${esc(t.def.chambers.join(', '))}</p>
    ${t.reason ? `<div class="notice">${icon(e10[t.state].icon)}<span><b>${e10[t.state].name}</b> for ${dur(fab.now - t.since)}: ${esc(t.reason)}</span></div>` : ''}
    ${actions.length ? `<div class="btn-row">${actions.join('')}</div>` : ''}
    <dl class="kv-grid">
      ${kv('State since', `${stamp(t.since, fab.now)} · ${dur(fab.now - t.since)}`)}
      ${kv('Loaded', `${t.running.length} / ${t.def.capacity} lots`)}
      ${kv('Availability 24h', pct(split.PRD + split.SBY))}
      ${kv('Utilization 24h', pct(split.PRD))}
      ${kv('PM counter', `${num(t.wafersSincePM)} / ${num(t.def.pmInterval)}`)}
      ${kv('Last PM', `${dur(fab.now - t.lastPM)} ago`)}
      ${kv('Chamber condition', `<span class="${t.health < 0.5 ? 'late' : ''}">${pct(t.health)}</span>`)}
      ${kv('MTBF (design)', `${t.def.mtbf} h`)}
    </dl>
    <section class="sheet-section"><h3 class="section-label">Last 24 hours (SEMI E10)</h3>${stateStrip(t.log, fab.now - DAY, fab.now, true)}<div class="legend" style="margin-top:8px">${order
      .filter((s) => split[s] > 0.001)
      .map((s) => `<span><i class="f-${s}"></i>${e10[s].name} <b>${pct(split[s])}</b></span>`)
      .join('')}</div></section>
    ${
      t.running.length
        ? `<section class="sheet-section"><h3 class="section-label">Running</h3><div class="stack" style="gap:8px">${t.running
            .map((run) => {
              const l = fab.lots.get(run.lot)!;
              const v = (fab.now - run.start) / (run.end - run.start);
              return `<div class="task"><div class="task-main"><div class="task-title">${lotLink(run.lot)} <span class="muted" style="font-weight:500">${esc(opLabel(fab, l))}</span></div><div class="prog">${meter(v)}<span>${dur(run.end - fab.now)}</span></div></div></div>`;
            })
            .join('')}</div></section>`
        : ''
    }
    <section class="sheet-section"><h3 class="section-label">Dispatch queue · ${q.length}</h3>${queue}</section>
    ${params.length ? `<section class="sheet-section"><h3 class="section-label">SPC charts for this tool</h3><div class="btn-row">${params.map((p) => plain(p.name, 'spcTool', { param: p.id, tool: t.id }, 'chart-line', 'sm')).join('')}</div></section>` : ''}
    <section class="sheet-section"><h3 class="section-label">Recent alarms</h3>${
      alarms.length
        ? `<div class="hist">${alarms.map((a) => `<div class="hist-row"><time>${stamp(a.t, fab.now)}</time><span>${badge(SEV[a.sev].name, SEV[a.sev].cls)} ${esc(a.text)}<span class="hist-by">${a.cleared ? `Cleared by ${esc(a.cleared.by)}` : a.acked ? `Acked by ${esc(a.acked.by)}` : 'Unacknowledged'}</span></span></div>`).join('')}</div>`
        : empty('No alarms on this tool.')
    }</section>
    <section class="sheet-section"><h3 class="section-label">Work orders</h3>${
      wos.length
        ? `<div class="hist">${wos.map((w) => `<div class="hist-row"><time>${stamp(w.opened, fab.now)}</time><span><span class="mono strong">${w.id}</span> ${esc(w.kind)}: ${esc(w.text)}<span class="hist-by">${esc(w.status)}${w.by ? ` · ${esc(w.by)}` : ''} · ${dur((w.closed ?? fab.now) - w.opened)}</span></span></div>`).join('')}</div>`
        : empty('No work orders.')
    }</section>`;
  return { title, body };
}

/* ------------------------------------------------------------------ Search index */

export function searchIndex(fab: Fab, views: { id: string; label: string }[]) {
  return [
    ...views.map((v) => ({ type: 'View', title: v.label, view: v.id })),
    ...[...fab.tools.values()].map((t) => ({
      type: 'Tool',
      title: t.id,
      sub: `${t.def.name} · ${areaById.get(t.def.area)!.name} · ${e10[t.state].name}`,
      view: 'equipment',
      tool: t.id,
    })),
    ...[...fab.lots.values()].map((l) => ({
      type: 'Lot',
      title: l.id,
      sub: `${l.product} · ${LOT_STATE[l.state].name}${fab.op(l) ? ` · ${fab.op(l)!.op} ${fab.op(l)!.name}` : ''}`,
      view: 'lots',
      lot: l.id,
    })),
    ...spcParams.map((p) => ({ type: 'SPC', title: p.name, sub: `${p.id} · ${p.unit}`, view: 'spc', param: p.id })),
    ...personas.map((p) => ({
      type: 'Persona',
      title: `Work as ${p.role}`,
      sub: p.blurb,
      view: 'workspace',
      persona: p.id,
    })),
    ...products.map((p) => ({
      type: 'Product',
      title: `${p.id} ${p.name}`,
      sub: `Route ${p.route}`,
      view: 'yield',
      product: p.id,
    })),
  ];
}

export const toolStateName = (s: E10) => e10[s].name;
