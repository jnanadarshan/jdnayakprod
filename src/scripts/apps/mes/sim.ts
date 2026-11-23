/**
 * Discrete-time fab simulator behind the MES app. One step = one simulated minute.
 *
 * Lots flow through re-entrant routes; tools move between SEMI E10 states (fail, get repaired,
 * qualify, run PMs); metrology steps produce SPC points that can put lots on hold and inhibit the
 * tool that caused the drift; probe turns accumulated tool damage into die yield and wafer maps.
 * An "autopilot" crew handles routine work so the fab keeps moving when nobody is clicking; user
 * actions from any persona go through the same methods and are logged with their name.
 */
import {
  alarmTexts,
  processMinutes,
  productById,
  products,
  routes,
  spcById,
  toolById,
  tools as toolDefs,
  type AreaId,
  type E10,
  type Op,
  type Priority,
  type StepType,
  type Tool,
} from '~/data/mes';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/* ------------------------------------------------------------------ RNG */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/* ------------------------------------------------------------------ Types */

export type LotState = 'queued' | 'running' | 'hold' | 'done' | 'scrapped';
export type HoldCategory = 'SPC' | 'Q-time' | 'Equipment' | 'Defect' | 'Manual';

export interface HistEntry {
  t: number;
  kind:
    | 'start'
    | 'in'
    | 'out'
    | 'hold'
    | 'release'
    | 'rework'
    | 'scrap'
    | 'split'
    | 'measure'
    | 'priority'
    | 'ship'
    | 'abort';
  op?: string;
  tool?: string;
  text: string;
  by: string;
}

export interface Hold {
  reason: string;
  category: HoldCategory;
  t: number;
  by: string;
  op: string;
  /** Step index a rework sends the lot back to, when rework is possible. */
  reworkTo?: number;
}

export interface ProbeResult {
  t: number;
  tool: string;
  /** Per-wafer die yield (0–1), aligned with `slots`. */
  yields: number[];
  slots: number[];
  bins: Record<number, number>;
  dies: number;
  yield: number;
}

export interface Lot {
  id: string;
  root: string;
  product: string;
  route: string;
  step: number;
  state: LotState;
  priority: Priority;
  /** Wafer slot numbers still in the lot (1–25). */
  slots: number[];
  startQty: number;
  started: number;
  due: number;
  arrived: number;
  lastOut: number;
  tool?: string;
  runStart?: number;
  runEnd?: number;
  hold?: Hold;
  holdAfter?: { reason: string; by: string };
  history: HistEntry[];
  toolsUsed: Record<string, string>;
  /** Accumulated yield damage by mechanism (drives wafer-map signatures). */
  sig: { edge: number; center: number; field: number; scratch: number };
  probe?: ProbeResult;
  parent?: string;
  children: string[];
  finished?: number;
  reworks: number;
}

export interface ToolRt {
  id: string;
  def: Tool;
  state: E10;
  since: number;
  phase?: 'alarm' | 'repair' | 'qual' | 'pm' | 'inhibit';
  /** When autopilot moves the tool to its next phase. */
  phaseEnd?: number;
  reason?: string;
  running: { lot: string; start: number; end: number }[];
  health: number;
  wafersSincePM: number;
  lastPM: number;
  log: { t: number; s: E10 }[];
  alarm?: string;
  wo?: string;
  drift: number;
  dir: 1 | -1;
  idleSince: number;
}

export interface Alarm {
  id: string;
  t: number;
  tool: string;
  sev: 'crit' | 'warn' | 'info';
  code: string;
  text: string;
  lot?: string;
  acked?: { t: number; by: string };
  cleared?: { t: number; by: string };
}

export interface WorkOrder {
  id: string;
  tool: string;
  kind: 'Repair' | 'PM' | 'Qualification';
  text: string;
  status: 'Open' | 'In progress' | 'Closed';
  opened: number;
  started?: number;
  closed?: number;
  by?: string;
}

export interface SpcPoint {
  t: number;
  lot: string;
  value: number;
  /** Process tool held responsible (the tool that ran the source op). */
  tool: string;
  met: string;
  rule?: 1 | 2 | 4;
  oos?: boolean;
}

export interface FabEvent {
  t: number;
  kind: 'lot' | 'tool' | 'spc' | 'alarm' | 'user' | 'yield';
  sev?: 'crit' | 'warn' | 'good';
  text: string;
  lot?: string;
  tool?: string;
}

export type DispatchRule = 'cr' | 'fifo' | 'edd' | 'prio';

export interface Settings {
  autopilot: boolean;
  rule: DispatchRule;
  /** Tools in these areas wait `manualDelay` idle minutes for a manual track-in. */
  manualAreas: AreaId[];
  manualDelay: number;
  /** Mean new lots per day. */
  startRate: number;
  /** WIP (lots) the start rate steers toward. */
  wipTarget: number;
}

const AUTO = 'Autopilot';
/** Minutes before the autopilot engineering crew dispositions a hold (scaled 0.6–1.6×). */
const HOLD_WAIT: Record<HoldCategory, number> = { SPC: 300, 'Q-time': 120, Equipment: 180, Defect: 240, Manual: 480 };
const XF_TARGET: Record<Priority, number> = { 1: 1.6, 2: 2.1, 3: 3, 4: 3.8 };
const SENSITIVE: Partial<Record<StepType, keyof Lot['sig']>> = {
  etch: 'edge',
  cvd: 'center',
  litho: 'field',
  cmp: 'scratch',
  implant: 'center',
  pvd: 'scratch',
};
const DEFECT_REASONS: Partial<Record<StepType | 'default', string[]>> = {
  default: ['Particle adders on monitor wafer', 'Wafer chip detected at load port', 'Recipe version mismatch flagged'],
  cmp: ['Possible scratch after polish', 'Slurry residue on wafer surface'],
  litho: ['Resist coating defect (comet)', 'Focus spot detected on wafer'],
  etch: ['Polymer residue after etch', 'Arcing mark suspected'],
  clean: ['Watermark after dry', 'Particle adders after clean'],
};
/** Remaining raw process minutes from each step to the end of each route. */
const REMAINING: Record<string, number[]> = Object.fromEntries(
  Object.values(routes).map((r) => {
    const out: number[] = [];
    let acc = 0;
    for (let i = r.ops.length - 1; i >= 0; i--) out[i] = acc += processMinutes[r.ops[i].type];
    return [r.id, out];
  })
);
const PREFIX: Record<string, string> = { 'AX-7100': 'A', 'MX-3300': 'M', 'PW-0900': 'P' };

/* ------------------------------------------------------------------ Wafer maps */

export interface Die {
  x: number;
  y: number;
  bin: number;
}

const geometry = new Map<string, { x: number; y: number; cx: number; cy: number; rad: number }[]>();
/** Die sites inside the wafer edge for a product's grid (cached). */
export function dieSites(productId: string) {
  let g = geometry.get(productId);
  if (g) return g;
  const n = productById.get(productId)!.grid;
  g = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cx = ((i + 0.5) / n) * 2 - 1;
      const cy = ((j + 0.5) / n) * 2 - 1;
      const rad = Math.hypot(cx, cy);
      if (rad <= 0.97) g.push({ x: i, y: j, cx, cy, rad });
    }
  }
  geometry.set(productId, g);
  return g;
}

/** Deterministic bin per die site for one wafer of a probed lot (same inputs → same map). */
export function waferBins(lot: Pick<Lot, 'root' | 'product' | 'sig'>, slot: number): Uint8Array {
  const p = productById.get(lot.product)!;
  const sites = dieSites(lot.product);
  const r = mulberry32(hash(`${lot.root}#${slot}`));
  const out = new Uint8Array(sites.length);
  const wv = 0.75 + r() * 0.5; // wafer-to-wafer variation
  const s = lot.sig;
  const scratchAngle = r() * Math.PI * 2;
  const hasScratch = r() < Math.min(0.9, s.scratch * 3);
  const sin = Math.sin(scratchAngle);
  const cos = Math.cos(scratchAngle);
  // A few random defect clusters per wafer.
  const clusters = Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({
    x: (r() - 0.5) * 1.5,
    y: (r() - 0.5) * 1.5,
    k: (0.1 + r() * 0.25) * (1 - p.baseYield) * 3,
  }));
  const base = (1 - p.baseYield) * 0.75 * wv;
  for (let k = 0; k < sites.length; k++) {
    const { x: i, y: j, cx, cy, rad } = sites[k];
    let rnd = base;
    for (const c of clusters) {
      const d2 = (cx - c.x) ** 2 + (cy - c.y) ** 2;
      if (d2 < 0.2) rnd += c.k * Math.exp(-d2 / 0.03);
    }
    const edge = rad > 0.7 ? s.edge * 2.4 * ((rad - 0.7) / 0.27) ** 2 * wv : 0;
    const center = rad < 0.5 ? s.center * 1.8 * (1 - rad / 0.5) * wv : 0;
    const field = s.field * 2.2 * (i % 4 === 1 && j % 3 === 0 ? 1 : 0.06);
    const scratch = hasScratch && rad < 0.9 && Math.abs(cx * sin - cy * cos - 0.25) < 0.05 ? 0.85 : 0;
    const total = rnd + edge + center + field + scratch;
    if (r() >= Math.min(0.97, total)) {
      out[k] = 1;
      continue;
    }
    // Pick the failure mechanism in proportion to its contribution.
    let pick = r() * total;
    let bin = 0;
    if ((pick -= rnd) <= 0) bin = [3, 5, 7, 9][Math.floor(r() * 4)];
    else if ((pick -= edge) <= 0) bin = 3;
    else if ((pick -= center) <= 0) bin = 9;
    else if ((pick -= field) <= 0) bin = 7;
    else bin = 5;
    out[k] = bin;
  }
  return out;
}

/** Die map with coordinates, for drawing. */
export function waferMap(lot: Pick<Lot, 'root' | 'product' | 'sig'>, slot: number): Die[] {
  const sites = dieSites(lot.product);
  const bins = waferBins(lot, slot);
  return sites.map((d, k) => ({ x: d.x, y: d.y, bin: bins[k] }));
}

/* ------------------------------------------------------------------ Engine */

export class Fab {
  now: number;
  rng: () => number;
  lots = new Map<string, Lot>();
  tools = new Map<string, ToolRt>();
  alarms: Alarm[] = [];
  wos: WorkOrder[] = [];
  spc: Record<string, SpcPoint[]> = {};
  events: FabEvent[] = [];
  moves: { t: number; w: number }[] = [];
  starts: { t: number; w: number }[] = [];
  settings: Settings = { autopilot: true, rule: 'cr', manualAreas: [], manualDelay: 15, startRate: 20, wipTarget: 56 };
  version = 0;
  private seq = { lot: 24100, alarm: 5100, wo: 31000 };
  private dirty = true;
  private wipCount = 0;

  constructor(seed: number, start: number) {
    this.rng = mulberry32(seed);
    start = Math.floor(start / MIN) * MIN;
    this.now = start;
    for (const def of toolDefs) {
      const used = this.rng();
      this.tools.set(def.id, {
        id: def.id,
        def,
        state: 'SBY',
        since: start,
        running: [],
        health: 1 - used * def.wear * def.pmInterval,
        wafersSincePM: Math.round(used * def.pmInterval),
        lastPM: start - used * 6 * DAY,
        log: [{ t: start, s: 'SBY' }],
        drift: 0,
        dir: this.rng() < 0.5 ? 1 : -1,
        idleSince: start,
      });
    }
    for (const p of spcById.keys()) this.spc[p] = [];
  }

  /* ---------------------------------------------------------------- Queries */

  route(lot: Lot) {
    return routes[lot.route].ops;
  }
  op(lot: Lot): Op | undefined {
    return routes[lot.route].ops[lot.step];
  }
  rawMinutes(op: Op) {
    return processMinutes[op.type];
  }
  remainingRaw(lot: Lot) {
    return REMAINING[lot.route][lot.step] ?? 0;
  }
  /** Critical ratio: time left to due over remaining work at target speed. < 1 means it will be late. */
  cr(lot: Lot) {
    const need = this.remainingRaw(lot) * MIN * 1.8;
    return need ? (lot.due - this.now) / need : 9;
  }
  isUp(t: ToolRt) {
    return t.state === 'PRD' || t.state === 'SBY';
  }
  canRun(t: ToolRt, lot: Lot) {
    const op = this.op(lot);
    return !!op && t.def.types.includes(op.type);
  }
  eligibleTools(lot: Lot) {
    return [...this.tools.values()].filter((t) => this.canRun(t, lot));
  }
  /** Can this tool take another lot right now? */
  hasRoom(t: ToolRt) {
    return this.isUp(t) && t.running.length < t.def.capacity && t.wafersSincePM < t.def.pmInterval;
  }
  qtimeLeft(lot: Lot) {
    const op = this.op(lot);
    if (!op?.qtime || lot.state !== 'queued' || lot.step === 0) return undefined;
    return op.qtime * MIN - (this.now - lot.lastOut);
  }
  /** Queued lots this tool can run, in dispatch order. */
  queueFor(toolId: string) {
    const t = this.tools.get(toolId)!;
    const q = [...this.lots.values()].filter((l) => l.state === 'queued' && this.canRun(t, l));
    return this.sortQueue(q);
  }
  sortQueue(q: Lot[]) {
    const rule = this.settings.rule;
    const score = (l: Lot) => {
      const ql = this.qtimeLeft(l);
      const qBoost = ql !== undefined && ql < 90 * MIN ? -1 : 0;
      if (rule === 'fifo') return [qBoost, l.arrived];
      if (rule === 'edd') return [qBoost, l.due];
      if (rule === 'prio') return [qBoost, l.priority, l.arrived];
      return [qBoost, Math.min(l.priority, 3), this.cr(l)];
    };
    const s = new Map(q.map((l) => [l.id, score(l)]));
    return q.sort((a, b) => {
      const x = s.get(a.id)!;
      const y = s.get(b.id)!;
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    });
  }
  wip() {
    return [...this.lots.values()].filter((l) => l.state === 'queued' || l.state === 'running' || l.state === 'hold');
  }
  activeAlarms() {
    return this.alarms.filter((a) => !a.cleared);
  }

  /* ---------------------------------------------------------------- Logging */

  private ev(e: Omit<FabEvent, 't'>) {
    this.events.push({ t: this.now, ...e });
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }
  private hist(lot: Lot, h: Omit<HistEntry, 't'>) {
    lot.history.push({ t: this.now, ...h });
  }
  private setState(t: ToolRt, s: E10, phase?: ToolRt['phase'], reason?: string) {
    t.phase = phase;
    t.reason = reason;
    if (!phase) t.phaseEnd = undefined;
    if (t.state === s) return;
    t.state = s;
    t.since = this.now;
    t.log.push({ t: this.now, s });
    if (t.log.length > 400) t.log.splice(0, t.log.length - 400);
    if (s === 'SBY') t.idleSince = this.now;
  }
  private raise(tool: string, sev: Alarm['sev'], code: string, text: string, lot?: string) {
    const a: Alarm = { id: `ALM-${++this.seq.alarm}`, t: this.now, tool, sev, code, text, lot };
    this.alarms.push(a);
    if (this.alarms.length > 300) {
      const drop = this.alarms.findIndex((x) => x.cleared);
      if (drop >= 0) this.alarms.splice(drop, 1);
    }
    this.ev({ kind: 'alarm', sev: sev === 'crit' ? 'crit' : 'warn', text: `${code} ${text}`, tool, lot });
    return a;
  }
  private openWO(tool: string, kind: WorkOrder['kind'], text: string) {
    const w: WorkOrder = { id: `WO-${++this.seq.wo}`, tool, kind, text, status: 'Open', opened: this.now };
    this.wos.push(w);
    if (this.wos.length > 250) {
      const drop = this.wos.findIndex((x) => x.status === 'Closed');
      if (drop >= 0) this.wos.splice(drop, 1);
    }
    return w;
  }
  private wo(id?: string) {
    return id ? this.wos.find((w) => w.id === id) : undefined;
  }
  private closeWO(t: ToolRt, by: string) {
    const w = this.wo(t.wo);
    if (w && w.status !== 'Closed') {
      w.status = 'Closed';
      w.closed = this.now;
      w.by ??= by;
    }
    t.wo = undefined;
  }

  /* ---------------------------------------------------------------- Lot lifecycle */

  newLot(productId: string, priority: Priority, qty = 25, by = AUTO, step = 0) {
    const p = productById.get(productId)!;
    const id = `${PREFIX[productId]}${++this.seq.lot}.1`;
    const ops = routes[p.route].ops;
    const raw = ops.reduce((s, o) => s + processMinutes[o.type], 0);
    const lot: Lot = {
      id,
      root: id.split('.')[0],
      product: productId,
      route: p.route,
      step,
      state: 'queued',
      priority,
      slots: Array.from({ length: qty }, (_, i) => i + 1),
      startQty: qty,
      started: this.now,
      due: this.now + raw * MIN * XF_TARGET[priority],
      arrived: this.now,
      lastOut: this.now,
      history: [],
      toolsUsed: {},
      sig: { edge: 0, center: 0, field: 0, scratch: 0 },
      children: [],
      reworks: 0,
    };
    this.lots.set(id, lot);
    this.hist(lot, { kind: 'start', op: ops[step].op, text: `Lot started: ${qty} wafers, ${p.name}`, by });
    this.starts.push({ t: this.now, w: qty });
    this.dirty = true;
    return lot;
  }

  private pickProduct() {
    let x = this.rng();
    for (const p of products) if ((x -= p.mix) <= 0) return p.id;
    return products[0].id;
  }
  private pickPriority(): Priority {
    const x = this.rng();
    return x < 0.05 ? 1 : x < 0.17 ? 2 : x < 0.95 ? 3 : 4;
  }

  /** Seed the line with WIP spread over the route, as if the fab had been running. */
  seedWip(count: number) {
    for (let i = 0; i < count; i++) {
      const pid = this.pickProduct();
      const ops = routes[productById.get(pid)!.route].ops;
      const step = Math.floor(this.rng() * (ops.length - 1));
      const age = ops.slice(0, step).reduce((s, o) => s + processMinutes[o.type], 0) * MIN * (1.8 + this.rng());
      const lot = this.newLot(
        pid,
        this.pickPriority(),
        this.rng() < 0.85 ? 25 : 22 + Math.floor(this.rng() * 3),
        AUTO,
        step
      );
      lot.started -= age;
      lot.due -= age;
      lot.arrived = this.now - this.rng() * 3 * HOUR;
      lot.lastOut = lot.arrived;
      for (const o of ops.slice(0, step)) {
        const opts = toolDefs.filter((t) => t.types.includes(o.type));
        lot.toolsUsed[o.op] = opts[Math.floor(this.rng() * opts.length)].id;
      }
    }
    this.starts.length = 0;
  }

  trackIn(lotId: string, toolId: string, by = AUTO) {
    const lot = this.lots.get(lotId);
    const t = this.tools.get(toolId);
    if (!lot || !t || lot.state !== 'queued' || !this.canRun(t, lot) || !this.hasRoom(t)) return false;
    const op = this.op(lot)!;
    const scale = 0.3 + 0.7 * (lot.slots.length / 25);
    const minutes = processMinutes[op.type] * scale * (0.95 + this.rng() * 0.15);
    lot.state = 'running';
    lot.tool = toolId;
    lot.runStart = this.now;
    lot.runEnd = this.now + minutes * MIN;
    lot.toolsUsed[op.op] = toolId;
    t.running.push({ lot: lotId, start: this.now, end: lot.runEnd });
    if (t.state === 'SBY') this.setState(t, 'PRD');
    this.hist(lot, { kind: 'in', op: op.op, tool: toolId, text: `Track in: ${op.name} · ${op.recipe}`, by });
    if (by !== AUTO) this.ev({ kind: 'user', text: `${by} tracked ${lotId} into ${toolId}`, lot: lotId, tool: toolId });
    this.version++;
    return true;
  }

  private trackOut(t: ToolRt, lot: Lot) {
    const op = this.op(lot)!;
    t.running = t.running.filter((r) => r.lot !== lot.id);
    t.wafersSincePM += lot.slots.length;
    t.health = Math.max(0.05, t.health - t.def.wear * lot.slots.length * (0.7 + this.rng() * 0.6));
    t.drift = Math.max(-0.6, Math.min(0.6, t.drift + gauss(this.rng) * 0.08));
    const mech = SENSITIVE[op.type];
    if (mech) lot.sig[mech] += Math.max(0, 0.8 - t.health) ** 2 * 2.6;
    this.moves.push({ t: this.now, w: lot.slots.length });
    lot.tool = undefined;
    lot.runStart = lot.runEnd = undefined;
    lot.lastOut = this.now;
    this.hist(lot, { kind: 'out', op: op.op, tool: t.id, text: `Track out: ${op.name}`, by: AUTO });

    let spcHold: Hold | undefined;
    if (op.spc) spcHold = this.measure(lot, op, t);
    if (op.type === 'probe') this.probe(lot, t);

    lot.step++;
    if (lot.step >= this.route(lot).length) {
      lot.state = 'done';
      lot.finished = this.now;
      this.hist(lot, { kind: 'ship', text: `Shipped: ${lot.slots.length} wafers`, by: AUTO });
      this.ev({ kind: 'lot', sev: 'good', text: `${lot.id} completed and shipped`, lot: lot.id });
    } else {
      lot.state = 'queued';
      lot.arrived = this.now;
      if (spcHold) this.putOnHold(lot, spcHold);
      else if (this.rng() < 0.004) {
        const why = DEFECT_REASONS[op.type] ?? DEFECT_REASONS.default!;
        this.putOnHold(lot, {
          reason: why[Math.floor(this.rng() * why.length)],
          category: 'Defect',
          t: this.now,
          by: 'Inline inspection',
          op: this.op(lot)!.op,
        });
      } else if (lot.holdAfter) {
        this.putOnHold(lot, {
          reason: lot.holdAfter.reason,
          category: 'Manual',
          t: this.now,
          by: lot.holdAfter.by,
          op: this.op(lot)!.op,
        });
        lot.holdAfter = undefined;
      }
    }
    if (t.state === 'PRD' && !t.running.length) this.setState(t, 'SBY');
    this.dirty = true;
    this.version++;
  }

  private putOnHold(lot: Lot, h: Hold) {
    lot.state = 'hold';
    lot.hold = h;
    this.hist(lot, { kind: 'hold', op: h.op, text: `Hold (${h.category}): ${h.reason}`, by: h.by });
    this.ev({ kind: 'lot', sev: 'warn', text: `${lot.id} on hold: ${h.reason}`, lot: lot.id });
  }

  private measure(lot: Lot, op: Op, met: ToolRt): Hold | undefined {
    const p = spcById.get(op.spc!)!;
    const src = this.tools.get(lot.toolsUsed[p.sourceOp] ?? '');
    const shift = src ? src.dir * (1 - src.health) * 3.4 + src.drift : 0;
    const z = gauss(this.rng) + shift;
    const value = Math.max(p.id === 'M1-DEF' ? 0.005 : -Infinity, p.target + z * p.sigma);
    const pt: SpcPoint = { t: this.now, lot: lot.id, value, tool: src?.id ?? '—', met: met.id };
    const series = this.spc[p.id];
    series.push(pt);
    if (series.length > 500) series.splice(0, series.length - 500);
    this.hist(lot, {
      kind: 'measure',
      op: op.op,
      tool: met.id,
      text: `${p.name}: ${value.toFixed(p.sigma < 0.1 ? 3 : p.sigma < 5 ? 2 : 0)} ${p.unit}`,
      by: AUTO,
    });

    // Western Electric rules on this parameter for the responsible tool.
    const zs = series.filter((x) => x.tool === pt.tool).map((x) => (x.value - p.target) / p.sigma);
    const zl = zs.at(-1)!;
    const last3 = zs.slice(-3);
    const last8 = zs.slice(-8);
    pt.oos = value > p.usl || value < p.lsl;
    if (Math.abs(zl) > 3) pt.rule = 1;
    else if (last3.length === 3 && last3.filter((v) => v > 2).length >= 2 && zl > 2) pt.rule = 2;
    else if (last3.length === 3 && last3.filter((v) => v < -2).length >= 2 && zl < -2) pt.rule = 2;
    else if (last8.length === 8 && (last8.every((v) => v > 0) || last8.every((v) => v < 0))) pt.rule = 4;

    if (pt.rule === 1) {
      const text = `${p.name} ${pt.oos ? 'out of spec' : 'out of control'} (${value.toFixed(2)} ${p.unit})`;
      this.raise(src?.id ?? met.id, 'crit', `SPC-${p.id}`, text, lot.id);
      this.ev({
        kind: 'spc',
        sev: 'crit',
        text: `${p.id} rule 1 on ${pt.tool}: ${lot.id}`,
        lot: lot.id,
        tool: pt.tool,
      });
      if (src && this.isUp(src)) {
        this.setState(src, 'ENG', 'inhibit', `SPC inhibit: ${p.name}`);
        src.phaseEnd = this.now + (40 + this.rng() * 60) * MIN;
        src.idleSince = this.now;
      }
      const srcIdx = this.route(lot).findIndex((x) => x.op === p.sourceOp);
      const srcOp = this.route(lot)[srcIdx];
      return {
        reason: text,
        category: 'SPC',
        t: this.now,
        by: 'SPC (OCAP)',
        op: this.route(lot)[lot.step + 1]?.op ?? op.op,
        reworkTo: srcOp?.type === 'litho' ? srcIdx : undefined,
      };
    }
    if (pt.rule && src) {
      const recent = this.alarms.some(
        (a) => a.code === `SPC-${p.id}` && a.tool === src.id && a.sev === 'warn' && this.now - a.t < 6 * HOUR
      );
      if (!recent) this.raise(src.id, 'warn', `SPC-${p.id}`, `${p.name} trend: rule ${pt.rule} on ${src.id}`, lot.id);
    }
    return undefined;
  }

  private probe(lot: Lot, t: ToolRt) {
    const p = productById.get(lot.product)!;
    const bins: Record<number, number> = { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0 };
    const yields: number[] = [];
    let dies = 0;
    for (const s of lot.slots) {
      const m = waferBins(lot, s);
      let good = 0;
      for (const b of m) {
        bins[b]++;
        if (b === 1) good++;
      }
      dies += m.length;
      yields.push(good / m.length);
    }
    const y = bins[1] / Math.max(1, dies);
    lot.probe = { t: this.now, tool: t.id, yields, slots: [...lot.slots], bins, dies, yield: y };
    this.hist(lot, { kind: 'measure', op: '3000', tool: t.id, text: `Probe yield ${(y * 100).toFixed(1)}%`, by: AUTO });
    if (y < p.baseYield - 0.08) {
      this.ev({ kind: 'yield', sev: 'warn', text: `${lot.id} low yield ${(y * 100).toFixed(1)}%`, lot: lot.id });
      this.raise(t.id, 'warn', 'YLD-LOW', `${lot.id} probe yield ${(y * 100).toFixed(1)}% below limit`, lot.id);
    }
  }

  /* ---------------------------------------------------------------- Lot actions */

  hold(lotId: string, reason: string, by: string) {
    const lot = this.lots.get(lotId);
    if (!lot) return false;
    if (lot.state === 'running') {
      lot.holdAfter = { reason, by };
      this.hist(lot, { kind: 'hold', text: `Future hold set: ${reason}`, by });
    } else if (lot.state === 'queued') {
      this.putOnHold(lot, { reason, category: 'Manual', t: this.now, by, op: this.op(lot)!.op });
    } else return false;
    this.ev({ kind: 'user', text: `${by} held ${lotId}: ${reason}`, lot: lotId });
    this.version++;
    return true;
  }

  disposition(lotId: string, action: 'release' | 'rework' | 'scrap', scrap: number, comment: string, by: string) {
    const lot = this.lots.get(lotId);
    if (!lot || lot.state !== 'hold' || !lot.hold) return false;
    const note = comment ? ` (${comment})` : '';
    if (scrap > 0) {
      const n = Math.min(scrap, lot.slots.length);
      const gone = lot.slots.splice(lot.slots.length - n, n);
      this.hist(lot, { kind: 'scrap', text: `Scrapped wafer${n > 1 ? 's' : ''} ${gone.join(', ')}${note}`, by });
      this.ev({ kind: 'lot', sev: 'crit', text: `${lotId}: ${n} wafer${n > 1 ? 's' : ''} scrapped`, lot: lotId });
      if (!lot.slots.length) {
        lot.state = 'scrapped';
        lot.finished = this.now;
        lot.hold = undefined;
        this.version++;
        return true;
      }
    }
    if (action === 'rework' && lot.hold.reworkTo !== undefined) {
      lot.step = lot.hold.reworkTo;
      lot.reworks++;
      this.hist(lot, { kind: 'rework', op: this.op(lot)!.op, text: `Rework to ${this.op(lot)!.name}${note}`, by });
    } else {
      this.hist(lot, { kind: 'release', text: `Released from ${lot.hold.category} hold${note}`, by });
    }
    if (by !== AUTO && by !== 'Engineering')
      this.ev({ kind: 'user', text: `${by} dispositioned ${lotId}: ${action}`, lot: lotId });
    lot.hold = undefined;
    lot.state = 'queued';
    lot.arrived = this.now;
    lot.lastOut = this.now;
    this.dirty = true;
    this.version++;
    return true;
  }

  split(lotId: string, count: number, by: string) {
    const lot = this.lots.get(lotId);
    if (!lot || lot.state === 'running' || lot.state === 'done' || lot.state === 'scrapped') return undefined;
    if (count < 1 || count >= lot.slots.length) return undefined;
    const childId = `${lot.root}.${lotsWithRoot(this, lot.root) + 1}`;
    const slots = lot.slots.splice(lot.slots.length - count, count);
    const child: Lot = {
      ...structuredClone(lot),
      id: childId,
      slots,
      startQty: count,
      parent: lot.id,
      children: [],
      hold: lot.hold ? { ...lot.hold } : undefined,
    };
    this.lots.set(childId, child);
    lot.children.push(childId);
    this.hist(lot, { kind: 'split', text: `Split ${count} wafers (${slots.join(', ')}) to ${childId}`, by });
    this.hist(child, { kind: 'split', text: `Created by split from ${lot.id}`, by });
    this.ev({ kind: 'user', text: `${by} split ${count} wafers from ${lotId} to ${childId}`, lot: childId });
    this.dirty = true;
    this.version++;
    return childId;
  }

  setPriority(lotId: string, p: Priority, by: string) {
    const lot = this.lots.get(lotId);
    if (!lot || lot.priority === p) return false;
    const raw = this.route(lot).reduce((s, o) => s + processMinutes[o.type], 0);
    lot.priority = p;
    lot.due = Math.min(lot.due, lot.started + raw * MIN * XF_TARGET[p]);
    this.hist(lot, { kind: 'priority', text: `Priority set to ${['', 'Hot', 'Rush', 'Normal', 'Eng'][p]}`, by });
    this.ev({
      kind: 'user',
      text: `${by} set ${lotId} priority to ${['', 'Hot', 'Rush', 'Normal', 'Eng'][p]}`,
      lot: lotId,
    });
    this.version++;
    return true;
  }

  /* ---------------------------------------------------------------- Tool actions */

  ackAlarm(id: string, by: string) {
    const a = this.alarms.find((x) => x.id === id);
    if (!a || a.acked) return false;
    a.acked = { t: this.now, by };
    if (by !== AUTO) this.ev({ kind: 'user', text: `${by} acknowledged ${a.id} on ${a.tool}`, tool: a.tool });
    this.version++;
    return true;
  }
  clearAlarm(id: string, by: string) {
    const a = this.alarms.find((x) => x.id === id);
    if (!a || a.cleared) return false;
    a.acked ??= { t: this.now, by };
    a.cleared = { t: this.now, by };
    this.version++;
    return true;
  }

  private fail(t: ToolRt, text: string, by = AUTO) {
    const a = this.raise(t.id, 'crit', `E-${1000 + Math.floor(this.rng() * 8999)}`, text);
    for (const r of [...t.running]) {
      const lot = this.lots.get(r.lot);
      if (!lot) continue;
      t.running = t.running.filter((x) => x.lot !== lot.id);
      lot.tool = undefined;
      lot.runStart = lot.runEnd = undefined;
      lot.state = 'queued';
      lot.arrived = this.now;
      this.hist(lot, { kind: 'abort', op: this.op(lot)!.op, tool: t.id, text: `Aborted on ${t.id}: ${text}`, by });
      if (this.rng() < 0.5)
        this.putOnHold(lot, {
          reason: `Aborted on ${t.id}: ${text}`,
          category: 'Equipment',
          t: this.now,
          by: AUTO,
          op: this.op(lot)!.op,
        });
    }
    this.setState(t, 'UDT', 'alarm', text);
    t.alarm = a.id;
    t.wo = this.openWO(t.id, 'Repair', text).id;
    t.phaseEnd = this.now + (12 + this.rng() * 30) * MIN;
    this.ev({ kind: 'tool', sev: 'crit', text: `${t.id} down: ${text}`, tool: t.id });
    this.dirty = true;
    this.version++;
  }

  /** Operator / manager reports a problem: the tool goes down and pages a technician. */
  callTech(toolId: string, text: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || !this.isUp(t)) return false;
    this.fail(t, text, by);
    this.ev({ kind: 'user', text: `${by} called a technician to ${toolId}`, tool: toolId });
    return true;
  }

  startRepair(toolId: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || t.state !== 'UDT' || t.phase !== 'alarm') return false;
    if (t.alarm) this.ackAlarm(t.alarm, by);
    t.phase = 'repair';
    t.phaseEnd = this.now + (50 + this.rng() * 150) * MIN;
    const w = this.wo(t.wo);
    if (w) {
      w.status = 'In progress';
      w.started = this.now;
      w.by = by;
    }
    if (by !== AUTO) this.ev({ kind: 'user', text: `${by} started repair on ${toolId}`, tool: toolId });
    this.version++;
    return true;
  }

  /** Repair or PM done: the tool goes to qualification. */
  completeWork(toolId: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || !(t.phase === 'repair' || t.phase === 'pm')) return false;
    if (t.phase === 'pm') {
      t.health = 1;
      t.drift = 0;
      t.wafersSincePM = 0;
      t.lastPM = this.now;
    } else {
      t.health = Math.min(1, t.health + 0.15);
    }
    if (t.alarm) this.clearAlarm(t.alarm, by);
    t.alarm = undefined;
    this.closeWO(t, by);
    t.wo = this.openWO(t.id, 'Qualification', 'Post-maintenance qualification run').id;
    this.setState(t, 'ENG', 'qual', 'Qualification');
    t.phaseEnd = this.now + (25 + this.rng() * 35) * MIN;
    const w = this.wo(t.wo);
    if (w) {
      w.status = 'In progress';
      w.started = this.now;
      w.by = by;
    }
    this.ev({
      kind: 'tool',
      text: `${toolId} ${by === AUTO ? '' : `(${by}) `}maintenance complete, qualifying`,
      tool: toolId,
    });
    this.version++;
    return true;
  }

  /** Qualification passed or inhibit lifted: back to production. */
  releaseTool(toolId: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || t.state !== 'ENG') return false;
    this.closeWO(t, by);
    this.setState(t, 'SBY');
    this.ev({
      kind: 'tool',
      sev: 'good',
      text: `${toolId} released to production${by === AUTO ? '' : ` by ${by}`}`,
      tool: toolId,
    });
    this.dirty = true;
    this.version++;
    return true;
  }

  startPM(toolId: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || t.running.length || !(this.isUp(t) || t.phase === 'inhibit' || t.state === 'NST')) return false;
    this.closeWO(t, by);
    const w = this.openWO(t.id, 'PM', t.def.pmName);
    w.status = 'In progress';
    w.started = this.now;
    w.by = by;
    t.wo = w.id;
    this.setState(t, 'SDT', 'pm', t.def.pmName);
    t.phaseEnd = this.now + (t.def.area === 'diff' ? 240 : 100 + this.rng() * 80) * MIN;
    this.ev({
      kind: 'tool',
      text: `${toolId} PM started: ${t.def.pmName}${by === AUTO ? '' : ` (${by})`}`,
      tool: toolId,
    });
    this.version++;
    return true;
  }

  inhibit(toolId: string, reason: string, by: string) {
    const t = this.tools.get(toolId);
    if (!t || !this.isUp(t)) return false;
    this.setState(t, 'ENG', 'inhibit', reason);
    t.phaseEnd = this.now + 6 * HOUR;
    this.ev({ kind: 'user', text: `${by} inhibited ${toolId}: ${reason}`, tool: toolId });
    this.version++;
    return true;
  }

  /* ---------------------------------------------------------------- Clock */

  advance(minutes: number) {
    for (let i = 0; i < minutes; i++) this.step();
  }

  step() {
    this.now += MIN;
    const r = this.rng;
    const auto = this.settings.autopilot;

    // Finish runs.
    for (const t of this.tools.values()) {
      for (const run of [...t.running]) {
        if (run.end <= this.now) {
          const lot = this.lots.get(run.lot);
          if (lot) this.trackOut(t, lot);
        }
      }
    }

    for (const t of this.tools.values()) {
      // Random failures, more likely on worn tools.
      if (this.isUp(t) && r() < (1 + 2 * (1 - t.health)) / (t.def.mtbf * 60)) {
        const texts = alarmTexts[t.def.types[0]] ?? alarmTexts.default;
        this.fail(t, texts[Math.floor(r() * texts.length)]);
        continue;
      }
      // Night shift: the second prober is not scheduled.
      if (t.id === 'PRB-02') {
        const h = new Date(this.now).getHours();
        const night = h >= 22 || h < 6;
        if (night && t.state === 'SBY' && !t.running.length)
          this.setState(t, 'NST', undefined, 'No test demand on night shift');
        else if (!night && t.state === 'NST') this.setState(t, 'SBY');
      }
      if (!auto || t.phaseEnd === undefined || this.now < t.phaseEnd) {
        // PM due: drain, then start the PM.
        if (auto && this.isUp(t) && !t.running.length && t.wafersSincePM >= t.def.pmInterval) this.startPM(t.id, AUTO);
        continue;
      }
      if (t.phase === 'alarm') this.startRepair(t.id, AUTO);
      else if (t.phase === 'repair' || t.phase === 'pm') this.completeWork(t.id, AUTO);
      else if (t.phase === 'qual') this.releaseTool(t.id, AUTO);
      else if (t.phase === 'inhibit') {
        // OCAP: the inhibited tool gets a chamber clean before it can run again.
        t.phaseEnd = undefined;
        this.startPM(t.id, AUTO);
      }
    }

    // Q-time violations and autopilot dispositions.
    for (const lot of this.lots.values()) {
      if (lot.state === 'queued') {
        const ql = this.qtimeLeft(lot);
        if (ql !== undefined && ql < 0) {
          const op = this.op(lot)!;
          this.putOnHold(lot, {
            reason: `Q-time exceeded before ${op.name} (${op.qtime} min max)`,
            category: 'Q-time',
            t: this.now,
            by: 'MES',
            op: op.op,
            reworkTo: lot.step - 1,
          });
          this.raise('—', 'warn', 'QT-EXCEED', `${lot.id} Q-time exceeded at ${op.op} ${op.name}`, lot.id);
        }
      } else if (auto && lot.state === 'hold' && lot.hold && lot.hold.category !== 'Manual') {
        const wait = HOLD_WAIT[lot.hold.category] * MIN * (0.6 + (hash(lot.id + lot.hold.t) % 100) / 100);
        if (this.now - lot.hold.t > wait) {
          const x = r();
          if (lot.hold.category === 'Q-time') this.disposition(lot.id, 'rework', 0, 'reclean', 'Engineering');
          else if (lot.hold.reworkTo !== undefined && x < 0.35)
            this.disposition(lot.id, 'rework', 0, 'resist rework', 'Engineering');
          else if (x < 0.12)
            this.disposition(lot.id, 'release', 1 + Math.floor(r() * 2), 'damaged wafers', 'Engineering');
          else this.disposition(lot.id, 'release', 0, 'within spec, use as is', 'Engineering');
        }
      } else if (auto && lot.state === 'hold' && lot.hold?.category === 'Manual' && this.now - lot.hold.t > 8 * HOUR) {
        this.disposition(lot.id, 'release', 0, 'no action needed', 'Engineering');
      }
    }

    // Autopilot clears warning alarms after a while and acknowledges critical ones with the repair.
    if (auto && this.now % (10 * MIN) === 0) {
      for (const a of this.alarms) {
        if (a.cleared) continue;
        if (a.sev !== 'crit' && this.now - a.t > 3 * HOUR) this.clearAlarm(a.id, AUTO);
        else if (a.sev === 'crit' && a.code.startsWith('SPC') && this.now - a.t > 2 * HOUR) this.clearAlarm(a.id, AUTO);
      }
    }

    // New lot starts, CONWIP-style: the start rate leans toward the WIP target.
    if (auto && this.now % (15 * MIN) === 0) this.wipCount = this.wip().length;
    const lean = Math.min(1.8, Math.max(0.4, this.settings.wipTarget / Math.max(1, this.wipCount)));
    if (auto && r() < (this.settings.startRate * lean) / 1440) this.newLot(this.pickProduct(), this.pickPriority());

    // Dispatch.
    if (this.dirty || this.now % (5 * MIN) === 0) {
      this.dirty = false;
      // Longest-idle tool first, so work spreads across identical tools.
      const order = [...this.tools.values()]
        .filter((t) => auto && this.hasRoom(t))
        .sort((a, b) => a.running.length - b.running.length || a.idleSince - b.idleSince);
      if (order.length) {
        const byType = new Map<StepType, Lot[]>();
        for (const l of this.lots.values()) {
          if (l.state !== 'queued') continue;
          const ty = this.op(l)!.type;
          (byType.get(ty) ?? byType.set(ty, []).get(ty)!).push(l);
        }
        for (const q of byType.values()) this.sortQueue(q);
        for (const t of order) {
          const manual = this.settings.manualAreas.includes(t.def.area);
          if (manual && !t.running.length && this.now - t.idleSince < this.settings.manualDelay * MIN) continue;
          for (const ty of t.def.types) {
            const q = byType.get(ty);
            while (q?.length && this.hasRoom(t)) this.trackIn(q.shift()!.id, t.id);
          }
        }
      }
    }

    // Housekeeping.
    if (this.now % HOUR === 0) {
      const cut = this.now - 2 * DAY;
      this.moves = this.moves.filter((m) => m.t > cut);
      this.starts = this.starts.filter((m) => m.t > cut - 5 * DAY);
      for (const [id, l] of this.lots) {
        if ((l.state === 'done' || l.state === 'scrapped') && l.finished! < this.now - 10 * DAY) this.lots.delete(id);
      }
    }
    this.version++;
  }

  /* ---------------------------------------------------------------- KPIs */

  /** Time in each E10 state over the window ending now. */
  e10Split(t: ToolRt, window = DAY) {
    const from = this.now - window;
    const out: Record<E10, number> = { PRD: 0, SBY: 0, ENG: 0, SDT: 0, UDT: 0, NST: 0 };
    const log = t.log;
    for (let i = 0; i < log.length; i++) {
      const a = Math.max(from, log[i].t);
      const b = i + 1 < log.length ? log[i + 1].t : this.now;
      if (b > a) out[log[i].s] += b - a;
    }
    const total = Object.values(out).reduce((s, v) => s + v, 0) || 1;
    for (const k of Object.keys(out) as E10[]) out[k] /= total;
    return out;
  }

  shipped(window = 7 * DAY) {
    return [...this.lots.values()].filter((l) => l.state === 'done' && l.finished! > this.now - window);
  }
}

function lotsWithRoot(fab: Fab, root: string) {
  let n = 0;
  for (const id of fab.lots.keys()) if (id.startsWith(`${root}.`)) n++;
  return n;
}

/** Tools grouped by step type, for route displays. */
export const toolsForType = (type: StepType) => toolDefs.filter((t) => t.types.includes(type)).map((t) => t.id);
export { toolById };
