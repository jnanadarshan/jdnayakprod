/** Rendering helpers for the MES app: escaping, formatting, icons, buttons, patching and charts. */
import {
  e10,
  permissions,
  personaById,
  priorities,
  type Action,
  type E10,
  type PersonaId,
  type Priority,
} from '~/data/mes';
import { DAY, HOUR, MIN } from './sim';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/* ------------------------------------------------------------------ Formatting */

export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const num = (v: number) => v.toLocaleString('en-US');
export const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
export const dayLabel = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const stamp = (t: number, now: number) =>
  now - t < 20 * HOUR && new Date(t).getDate() === new Date(now).getDate()
    ? hhmm(t)
    : `${new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${hhmm(t)}`;

export function dur(ms: number) {
  const neg = ms < 0;
  ms = Math.abs(ms);
  let s: string;
  if (ms < HOUR) s = `${Math.max(0, Math.round(ms / MIN))}m`;
  else if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.round((ms - h * HOUR) / MIN);
    s = m ? `${h}h ${m}m` : `${h}h`;
  } else s = `${(ms / DAY).toFixed(1)}d`;
  return neg ? `−${s}` : s;
}

export function shift(t: number) {
  const h = new Date(t).getHours();
  const day = h >= 6 && h < 18;
  const start = new Date(t);
  start.setMinutes(0, 0, 0);
  start.setHours(day ? 6 : h >= 18 ? 18 : -6);
  return { name: day ? 'Day shift' : 'Night shift', crew: day ? 'A crew' : 'C crew', start: start.getTime() };
}

/* ------------------------------------------------------------------ Icons */

/** References the symbols astro-icon renders once in the page's icon sprite. */
export const icon = (name: string, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><use href="#ai:tabler:${name}"></use></svg>`;

/* ------------------------------------------------------------------ Badges */

export const badge = (text: string, cls = '', ic?: string, tip?: string) =>
  `<span class="badge ${cls}"${tip ? ` data-tip-title="${esc(text)}" data-tip-body="${esc(tip)}"` : ''}>${ic ? icon(ic) : ''}${esc(text)}</span>`;

export const stateBadge = (s: E10, tip?: string) => {
  const d = e10[s];
  return badge(d.name, d.cls, d.icon, tip ?? d.hint);
};

export const prioBadge = (p: Priority) => {
  const d = priorities[p];
  return badge(d.name, d.cls, d.icon);
};

export const LOT_STATE: Record<string, { name: string; cls: string; icon: string }> = {
  queued: { name: 'Queued', cls: 'st-info', icon: 'hourglass' },
  running: { name: 'Running', cls: 'st-good', icon: 'player-play' },
  hold: { name: 'On hold', cls: 'st-warn', icon: 'hand-stop' },
  done: { name: 'Shipped', cls: 'st-muted', icon: 'truck-delivery' },
  scrapped: { name: 'Scrapped', cls: 'st-crit', icon: 'trash' },
};
export const lotStateBadge = (s: string) => {
  const d = LOT_STATE[s];
  return badge(d.name, d.cls, d.icon);
};

export const SEV = {
  crit: { name: 'Critical', cls: 'st-crit', icon: 'alert-octagon' },
  warn: { name: 'Warning', cls: 'st-warn', icon: 'alert-triangle' },
  info: { name: 'Info', cls: 'st-info', icon: 'info-circle' },
} as const;

/* ------------------------------------------------------------------ Permission-aware buttons */

let current: PersonaId = 'operator';
export const setPersona = (p: PersonaId) => (current = p);
export const persona = () => personaById.get(current)!;
export const can = (a: Action) => permissions[a].includes(current);
export const whoCan = (a: Action) => permissions[a].map((p) => personaById.get(p)!.role).join(' or ');

export interface BtnOpts {
  label: string;
  act: string;
  perm: Action;
  icon?: string;
  cls?: string;
  data?: Record<string, string | number | undefined>;
}

/** A button that always renders; personas without the permission see it locked with who can do it. */
export function btn({ label, act, perm, icon: ic, cls = '', data = {} }: BtnOpts) {
  const ok = can(perm);
  const attrs = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
  const key = `${act}:${Object.values(data).join(':')}`;
  const lock = ok
    ? ''
    : ` aria-disabled="true" data-perm="${perm}" data-tip-title="Requires ${esc(whoCan(perm))}" data-tip-body="Switch persona in the top bar to do this."`;
  return `<button type="button" class="mes-btn ${cls}" data-act="${act}" data-key="${esc(key)}"${attrs}${lock}>${icon(ok ? (ic ?? 'check') : 'lock')}${esc(label)}</button>`;
}

/* ------------------------------------------------------------------ Patching */

const cache = new WeakMap<Element, string>();

/** Replace an element's HTML only when it changed, keeping keyboard focus on the same control. */
export function patch(el: Element | null, html: string) {
  if (!el || cache.get(el) === html) return;
  const active = document.activeElement as HTMLElement | null;
  const key =
    active && el.contains(active)
      ? (active.dataset.key ?? active.dataset.lotOpen ?? active.dataset.toolOpen)
      : undefined;
  el.innerHTML = html;
  cache.set(el, html);
  if (key) {
    const again = $$<HTMLElement>('[data-key],[data-lot-open],[data-tool-open]', el).find(
      (x) => (x.dataset.key ?? x.dataset.lotOpen ?? x.dataset.toolOpen) === key
    );
    again?.focus({ preventScroll: true });
  }
}

export const meter = (v: number, cls = '') =>
  `<div class="meter ${cls}"><span style="width:${Math.max(0, Math.min(1, v)) * 100}%"></span></div>`;

/* ------------------------------------------------------------------ Charts */

const niceStep = (max: number, ticks: number) => {
  const s = max / ticks || 1;
  const mag = 10 ** Math.floor(Math.log10(s));
  const n = s / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
};

export interface ColDatum {
  label: string;
  parts: { value: number; cls: string }[];
  tip: string;
  tipTitle?: string;
}

/** Column chart in HTML (stacked parts, 2px gaps between segments). */
export function columns(data: ColDatum[], { height = 150, every = 1 } = {}) {
  const max0 = Math.max(1, ...data.map((d) => d.parts.reduce((s, p) => s + p.value, 0)));
  const step = niceStep(max0, 3);
  const max = step * Math.ceil(max0 / step);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  return `<div class="cols" style="--h:${height}px"><div class="cols-plot">${ticks
    .map((t) => `<div class="cols-grid" style="bottom:${(t / max) * 100}%"><span>${num(t)}</span></div>`)
    .join('')}${data
    .map(
      (d) =>
        `<div class="cols-col" tabindex="0" data-tip-title="${esc(d.tipTitle ?? d.label)}" data-tip-body="${esc(d.tip)}">${[
          ...d.parts,
        ]
          .reverse()
          .filter((p) => p.value > 0)
          .map((p) => `<span class="${p.cls}" style="height:calc(${(p.value / max) * 100}% - 2px)"></span>`)
          .join('')}</div>`
    )
    .join('')}</div><div class="cols-axis">${data
    .map((d, i) => `<span>${i % every === 0 ? esc(d.label) : ''}</span>`)
    .join('')}</div></div>`;
}

export interface BarRow {
  label: string;
  value: number;
  display: string;
  tip?: string;
  cls?: string;
  attrs?: string;
}
/** Ranked horizontal bars (shared .bar-list styles). */
export function bars(rows: BarRow[], max = Math.max(1e-9, ...rows.map((r) => r.value))) {
  return `<div class="bar-list" role="list">${rows
    .map(
      (r) =>
        `<div class="bar-row" role="listitem" tabindex="0" data-tip-title="${esc(r.label)}" data-tip-body="${esc(r.tip ?? r.display)}"${r.attrs ?? ''}><span class="bar-row-label">${esc(r.label)}</span><span class="bar-track"><span class="bar-fill ${r.cls ?? ''}" style="width:calc(${(r.value / max) * 100}% - 52px)"></span><span class="bar-value">${esc(r.display)}</span></span></div>`
    )
    .join('')}</div>`;
}

export const spark = (vals: number[]) => {
  if (vals.length < 2) return '';
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 64},${20 - ((v - min) / (max - min || 1)) * 18}`);
  return `<svg class="kpi-spark" viewBox="0 0 64 22" aria-hidden="true"><path d="M${pts.join('L')}"/></svg>`;
};

/** E10 timeline strip from a state log over [from, to]. */
export function stateStrip(log: { t: number; s: E10 }[], from: number, to: number, tall = false) {
  const segs: string[] = [];
  for (let i = 0; i < log.length; i++) {
    const a = Math.max(from, log[i].t);
    const b = Math.min(to, i + 1 < log.length ? log[i + 1].t : to);
    if (b <= a) continue;
    const s = log[i].s;
    segs.push(
      `<span class="f-${s}" style="flex:${b - a}" data-tip-title="${e10[s].name}" data-tip-body="${hhmm(a)}–${hhmm(b)} · ${dur(b - a)}"></span>`
    );
  }
  return `<div class="state-strip${tall ? ' tall' : ''}" role="img" aria-label="Equipment state timeline">${segs.join('')}</div>`;
}

export interface LinePoint {
  x: number;
  y: number;
  cls?: string;
  tipTitle: string;
  tipBody: string;
  r?: number;
}
export interface LineSeries {
  cls: number;
  points: LinePoint[];
  line?: boolean;
}
export interface RefLine {
  y: number;
  cls: 'ctl' | 'spec' | 'center';
  label: string;
}

/** Time-series line/point chart in SVG, drawn at the container's real width so text never scales. */
export function lineChart(
  width: number,
  series: LineSeries[],
  {
    height = 240,
    refs = [] as RefLine[],
    zones = [] as [number, number][],
    yFmt = (v: number) => String(v),
    xFmt = (v: number) => hhmm(v),
    yMin,
    yMax,
  }: {
    height?: number;
    refs?: RefLine[];
    zones?: [number, number][];
    yFmt?: (v: number) => string;
    xFmt?: (v: number) => string;
    yMin?: number;
    yMax?: number;
  } = {}
) {
  const all = series.flatMap((s) => s.points);
  if (!all.length) return '<p class="empty-sm">No data yet.</p>';
  const w = Math.max(280, width);
  const m = { l: 46, r: 64, t: 10, b: 24 };
  const xs = all.map((p) => p.x);
  const ys = [...all.map((p) => p.y), ...refs.map((r) => r.y)];
  let lo = yMin ?? Math.min(...ys);
  let hi = yMax ?? Math.max(...ys);
  const pad = (hi - lo) * 0.08 || 1;
  if (yMin === undefined) lo -= pad;
  if (yMax === undefined) hi += pad;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs) || x0 + 1;
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * (w - m.l - m.r);
  const Y = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (height - m.t - m.b);
  const step = niceStep(hi - lo, 4);
  const yt: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yt.push(v);
  const xt = Array.from({ length: 5 }, (_, i) => x0 + ((x1 - x0) * i) / 4);
  let svg = `<svg width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img">`;
  for (const [a, b] of zones)
    svg += `<rect class="zone" x="${m.l}" width="${w - m.l - m.r}" y="${Y(b)}" height="${Math.max(0, Y(a) - Y(b))}"/>`;
  for (const v of yt)
    svg += `<line class="gl" x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`;
  xt.forEach((v, i) => {
    svg += `<text class="ax" x="${X(v)}" y="${height - 6}" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}">${esc(xFmt(v))}</text>`;
  });
  for (const r of refs)
    svg += `<line class="ref ${r.cls}" x1="${m.l}" x2="${w - m.r}" y1="${Y(r.y)}" y2="${Y(r.y)}"/><text class="ref-label" x="${w - m.r + 6}" y="${Y(r.y) + 4}">${esc(r.label)}</text>`;
  for (const s of series) {
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    if (s.line !== false && pts.length > 1)
      svg += `<path class="line stroke-${s.cls}" d="M${pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('L')}"/>`;
  }
  for (const s of series) {
    for (const p of s.points) {
      const cx = X(p.x).toFixed(1);
      const cy = Y(p.y).toFixed(1);
      svg += `<g class="hp" data-tip-title="${esc(p.tipTitle)}" data-tip-body="${esc(p.tipBody)}"><circle class="hit" cx="${cx}" cy="${cy}" r="9"/><circle class="pt ${p.cls ?? `fill-${s.cls}`}" cx="${cx}" cy="${cy}" r="${p.r ?? 4}"/></g>`;
    }
  }
  return `${svg}</svg>`;
}
