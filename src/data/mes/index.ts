/**
 * Master data for the Fab MES simulator: a fictional 300 mm fab ("FAB-1") with a re-entrant
 * logic route, a shorter power route, 29 tools across nine areas, SPC parameters, probe bins
 * and the personas that use the system. Everything here is static; the simulation engine in
 * src/scripts/apps/mes/ turns it into live lots, tool states, measurements and yield.
 */

export type AreaId = 'wet' | 'diff' | 'film' | 'litho' | 'etch' | 'imp' | 'cmp' | 'met' | 'test';

export type StepType =
  | 'clean'
  | 'oxidation'
  | 'anneal'
  | 'rtp'
  | 'cvd'
  | 'pvd'
  | 'litho'
  | 'etch'
  | 'implant'
  | 'cmp'
  | 'cd'
  | 'ovl'
  | 'thk'
  | 'defect'
  | 'probe';

export interface Area {
  id: AreaId;
  name: string;
  short: string;
}

export const areas: Area[] = [
  { id: 'wet', name: 'Wet Clean', short: 'WET' },
  { id: 'diff', name: 'Diffusion', short: 'DIFF' },
  { id: 'film', name: 'Thin Film', short: 'FILM' },
  { id: 'litho', name: 'Photolithography', short: 'LITH' },
  { id: 'etch', name: 'Etch', short: 'ETCH' },
  { id: 'imp', name: 'Implant', short: 'IMP' },
  { id: 'cmp', name: 'CMP', short: 'CMP' },
  { id: 'met', name: 'Metrology', short: 'MET' },
  { id: 'test', name: 'Probe & Test', short: 'TEST' },
];
export const areaById = new Map(areas.map((a) => [a.id, a]));

export interface Tool {
  id: string;
  name: string;
  area: AreaId;
  types: StepType[];
  /** Lots the tool can process at once (furnace tubes, cluster chambers). */
  capacity: number;
  /** Wafers between preventive maintenance. */
  pmInterval: number;
  pmName: string;
  /** Mean time between unscheduled failures, hours. */
  mtbf: number;
  /** Health lost per wafer (drives SPC drift and yield loss). */
  wear: number;
  chambers: string[];
  bay: string;
}

const t = (
  id: string,
  name: string,
  area: AreaId,
  types: StepType[],
  o: Partial<Pick<Tool, 'capacity' | 'pmInterval' | 'pmName' | 'mtbf' | 'wear' | 'chambers' | 'bay'>> = {}
): Tool => ({
  id,
  name,
  area,
  types,
  capacity: o.capacity ?? 1,
  pmInterval: o.pmInterval ?? 2400,
  pmName: o.pmName ?? 'Weekly PM',
  mtbf: o.mtbf ?? 110,
  wear: o.wear ?? 0.00012,
  chambers: o.chambers ?? ['CH-A'],
  bay: o.bay ?? `Bay ${areas.findIndex((a) => a.id === area) + 1}`,
});

export const tools: Tool[] = [
  t('WET-01', 'Single-wafer wet clean', 'wet', ['clean'], { capacity: 2, chambers: ['CH-1', 'CH-2', 'CH-3', 'CH-4'] }),
  t('WET-02', 'Single-wafer wet clean', 'wet', ['clean'], { capacity: 2, chambers: ['CH-1', 'CH-2', 'CH-3', 'CH-4'] }),
  t('DIFF-01', 'Vertical furnace (oxidation)', 'diff', ['oxidation', 'anneal'], {
    capacity: 4,
    pmInterval: 3200,
    pmName: 'Tube clean',
    mtbf: 160,
    chambers: ['Tube'],
  }),
  t('DIFF-02', 'Vertical furnace (oxidation)', 'diff', ['oxidation', 'anneal'], {
    capacity: 4,
    pmInterval: 3200,
    pmName: 'Tube clean',
    mtbf: 160,
    chambers: ['Tube'],
  }),
  t('DIFF-03', 'Vertical furnace (anneal)', 'diff', ['anneal', 'oxidation'], {
    capacity: 4,
    pmInterval: 3200,
    pmName: 'Tube clean',
    mtbf: 160,
    chambers: ['Tube'],
  }),
  t('RTP-01', 'Rapid thermal processor', 'diff', ['rtp'], { capacity: 1, chambers: ['CH-A', 'CH-B'] }),
  t('CVD-01', 'PECVD cluster', 'film', ['cvd'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('CVD-02', 'PECVD cluster', 'film', ['cvd'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('CVD-03', 'LPCVD cluster', 'film', ['cvd'], { capacity: 2, pmName: 'Chamber wet clean', chambers: ['PM1', 'PM2'] }),
  t('PVD-01', 'PVD metal cluster', 'film', ['pvd'], {
    pmName: 'Target / shield change',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('PVD-02', 'PVD metal cluster', 'film', ['pvd'], {
    pmName: 'Target / shield change',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('LITH-01', 'ArF immersion scanner + track', 'litho', ['litho'], {
    pmInterval: 3000,
    pmName: 'Lens / stage calibration',
    mtbf: 90,
    wear: 0.00008,
    chambers: ['Stage', 'Track'],
  }),
  t('LITH-02', 'ArF immersion scanner + track', 'litho', ['litho'], {
    pmInterval: 3000,
    pmName: 'Lens / stage calibration',
    mtbf: 90,
    wear: 0.00008,
    chambers: ['Stage', 'Track'],
  }),
  t('LITH-03', 'KrF scanner + track', 'litho', ['litho'], {
    pmInterval: 3000,
    pmName: 'Lens / stage calibration',
    mtbf: 90,
    wear: 0.00008,
    chambers: ['Stage', 'Track'],
  }),
  t('ETCH-01', 'Conductor etch cluster', 'etch', ['etch'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('ETCH-02', 'Conductor etch cluster', 'etch', ['etch'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  // The fab's problem child: a chamber that seasons badly and drifts between cleans.
  t('ETCH-03', 'Dielectric etch cluster', 'etch', ['etch'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    wear: 0.00034,
    mtbf: 80,
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('ETCH-04', 'Dielectric etch cluster', 'etch', ['etch'], {
    capacity: 2,
    pmName: 'Chamber wet clean',
    chambers: ['PM1', 'PM2', 'PM3'],
  }),
  t('IMP-01', 'High-current implanter', 'imp', ['implant'], {
    pmName: 'Source change',
    mtbf: 85,
    chambers: ['End station'],
  }),
  t('IMP-02', 'Medium-current implanter', 'imp', ['implant'], {
    pmName: 'Source change',
    mtbf: 85,
    chambers: ['End station'],
  }),
  t('CMP-01', 'CMP polisher', 'cmp', ['cmp'], {
    capacity: 2,
    pmName: 'Pad / conditioner change',
    chambers: ['P1', 'P2', 'P3'],
  }),
  t('CMP-02', 'CMP polisher', 'cmp', ['cmp'], {
    capacity: 2,
    pmName: 'Pad / conditioner change',
    chambers: ['P1', 'P2', 'P3'],
  }),
  t('MET-CD-01', 'CD-SEM', 'met', ['cd'], { pmInterval: 5000, pmName: 'Calibration', mtbf: 200, wear: 0.00002 }),
  t('MET-CD-02', 'CD-SEM', 'met', ['cd'], { pmInterval: 5000, pmName: 'Calibration', mtbf: 200, wear: 0.00002 }),
  t('MET-OVL-01', 'Overlay metrology', 'met', ['ovl'], {
    pmInterval: 5000,
    pmName: 'Calibration',
    mtbf: 200,
    wear: 0.00002,
  }),
  t('MET-THK-01', 'Film thickness ellipsometer', 'met', ['thk'], {
    capacity: 2,
    pmInterval: 5000,
    pmName: 'Calibration',
    mtbf: 200,
    wear: 0.00002,
  }),
  t('MET-DEF-01', 'Brightfield defect inspection', 'met', ['defect'], {
    pmInterval: 5000,
    pmName: 'Calibration',
    mtbf: 150,
    wear: 0.00002,
  }),
  t('PRB-01', 'Wafer prober + tester', 'test', ['probe'], { pmInterval: 4000, pmName: 'Probe card clean', mtbf: 140 }),
  t('PRB-02', 'Wafer prober + tester', 'test', ['probe'], { pmInterval: 4000, pmName: 'Probe card clean', mtbf: 140 }),
];
export const toolById = new Map(tools.map((x) => [x.id, x]));

/** Raw process minutes per lot (25 wafers) by step type. */
export const processMinutes: Record<StepType, number> = {
  clean: 45,
  oxidation: 210,
  anneal: 160,
  rtp: 40,
  cvd: 60,
  pvd: 50,
  litho: 55,
  etch: 50,
  implant: 45,
  cmp: 55,
  cd: 25,
  ovl: 20,
  thk: 15,
  defect: 35,
  probe: 95,
};

export interface SpcParam {
  id: string;
  name: string;
  unit: string;
  target: number;
  sigma: number;
  /** Spec limits (engineering), wider than the ±3σ control limits. */
  lsl: number;
  usl: number;
  /** Op number of the process step whose tool is held responsible for drift. */
  sourceOp: string;
}

export const spcParams: SpcParam[] = [
  {
    id: 'NIT-THK',
    name: 'Pad nitride thickness',
    unit: 'Å',
    target: 1500,
    sigma: 12,
    lsl: 1440,
    usl: 1560,
    sourceOp: '0300',
  },
  { id: 'STI-CD', name: 'STI resist CD', unit: 'nm', target: 62, sigma: 0.8, lsl: 58, usl: 66, sourceOp: '0500' },
  {
    id: 'CMP-THK',
    name: 'Post-CMP oxide thickness',
    unit: 'Å',
    target: 3200,
    sigma: 25,
    lsl: 3075,
    usl: 3325,
    sourceOp: '0900',
  },
  { id: 'GATE-OVL', name: 'Gate overlay', unit: 'nm', target: 0, sigma: 1.1, lsl: -5.5, usl: 5.5, sourceOp: '1500' },
  {
    id: 'GATE-CD',
    name: 'Gate CD (post etch)',
    unit: 'nm',
    target: 28,
    sigma: 0.45,
    lsl: 25.8,
    usl: 30.2,
    sourceOp: '1700',
  },
  {
    id: 'M1-DEF',
    name: 'Metal 1 defect density',
    unit: 'def/cm²',
    target: 0.08,
    sigma: 0.02,
    lsl: 0,
    usl: 0.18,
    sourceOp: '2400',
  },
  {
    id: 'CT-CD',
    name: 'Contact CD (post etch)',
    unit: 'nm',
    target: 40,
    sigma: 0.6,
    lsl: 37,
    usl: 43,
    sourceOp: '2200',
  },
];
export const spcById = new Map(spcParams.map((p) => [p.id, p]));

export interface Op {
  op: string;
  name: string;
  type: StepType;
  recipe: string;
  /** SPC parameter measured at this (metrology) step. */
  spc?: string;
  /** Max minutes allowed between the previous op's track-out and this op's track-in. */
  qtime?: number;
}

const o = (op: string, name: string, type: StepType, recipe: string, extra: Partial<Op> = {}): Op => ({
  op,
  name,
  type,
  recipe,
  ...extra,
});

export const routes: Record<string, { id: string; name: string; ops: Op[] }> = {
  'LGC-28': {
    id: 'LGC-28',
    name: '28 nm logic, 2 metal',
    ops: [
      o('0100', 'Incoming clean', 'clean', 'SC1-SC2-STD'),
      o('0200', 'Pad oxidation', 'oxidation', 'OX-PAD-100A', { qtime: 360 }),
      o('0300', 'Pad nitride deposition', 'cvd', 'SIN-1500A'),
      o('0350', 'Nitride thickness', 'thk', 'THK-SIN-49PT', { spc: 'NIT-THK' }),
      o('0500', 'STI lithography', 'litho', 'L-STI-ARF'),
      o('0550', 'STI resist CD', 'cd', 'CD-STI-9PT', { spc: 'STI-CD' }),
      o('0700', 'STI etch', 'etch', 'E-STI-SI'),
      o('0800', 'STI oxide fill', 'cvd', 'HDP-OX-5K'),
      o('0900', 'STI CMP', 'cmp', 'CMP-STI-OX'),
      o('0950', 'Post-CMP thickness', 'thk', 'THK-OX-49PT', { spc: 'CMP-THK' }),
      o('1100', 'Well implant', 'implant', 'I-NWELL-P31'),
      o('1200', 'Well anneal', 'anneal', 'AN-WELL-1000C'),
      o('1250', 'Pre-gate clean', 'clean', 'HF-LAST-PRE'),
      o('1300', 'Gate oxidation', 'oxidation', 'OX-GATE-20A', { qtime: 240 }),
      o('1400', 'Poly deposition', 'cvd', 'POLY-800A'),
      o('1500', 'Gate lithography', 'litho', 'L-GATE-ARF'),
      o('1550', 'Gate overlay', 'ovl', 'OVL-GATE-13FLD', { spc: 'GATE-OVL' }),
      o('1700', 'Gate etch', 'etch', 'E-GATE-POLY'),
      o('1750', 'Gate CD', 'cd', 'CD-GATE-9PT', { spc: 'GATE-CD' }),
      o('1900', 'S/D implant', 'implant', 'I-NSD-AS75'),
      o('2000', 'Spike anneal', 'rtp', 'RTP-SPIKE-1050'),
      o('2100', 'Contact lithography', 'litho', 'L-CT-ARF'),
      o('2200', 'Contact etch', 'etch', 'E-CT-OX'),
      o('2250', 'Contact CD', 'cd', 'CD-CT-9PT', { spc: 'CT-CD' }),
      o('2300', 'Metal 1 deposition', 'pvd', 'PVD-TI-TIN-W'),
      o('2400', 'Metal 1 CMP', 'cmp', 'CMP-W-M1'),
      o('2450', 'M1 defect inspection', 'defect', 'DEF-M1-BF', { spc: 'M1-DEF' }),
      o('2600', 'Metal 2 lithography', 'litho', 'L-M2-KRF'),
      o('2700', 'Metal 2 etch', 'etch', 'E-M2-AL'),
      o('2800', 'Passivation deposition', 'cvd', 'PASS-SIN-OX'),
      o('3000', 'Wafer probe', 'probe', 'PRB-LGC-FULL'),
    ],
  },
  'PWR-180': {
    id: 'PWR-180',
    name: '180 nm power BCD, 1 metal',
    ops: [
      o('0100', 'Incoming clean', 'clean', 'SC1-SC2-STD'),
      o('0200', 'Pad oxidation', 'oxidation', 'OX-PAD-250A', { qtime: 360 }),
      o('0300', 'Pad nitride deposition', 'cvd', 'SIN-1500A'),
      o('0350', 'Nitride thickness', 'thk', 'THK-SIN-49PT', { spc: 'NIT-THK' }),
      o('0500', 'Active lithography', 'litho', 'L-ACT-KRF'),
      o('0700', 'Active etch', 'etch', 'E-ACT-SI'),
      o('1100', 'Drift implant', 'implant', 'I-NDRIFT-P31'),
      o('1200', 'Drive-in anneal', 'anneal', 'AN-DRIVE-1100C'),
      o('1300', 'Gate oxidation', 'oxidation', 'OX-GATE-120A', { qtime: 240 }),
      o('1400', 'Poly deposition', 'cvd', 'POLY-2500A'),
      o('1500', 'Gate lithography', 'litho', 'L-GATE-KRF'),
      o('1700', 'Gate etch', 'etch', 'E-GATE-POLY'),
      o('1900', 'S/D implant', 'implant', 'I-NSD-AS75'),
      o('2000', 'Spike anneal', 'rtp', 'RTP-SPIKE-1000'),
      o('2200', 'Contact etch', 'etch', 'E-CT-OX'),
      o('2300', 'Metal deposition', 'pvd', 'PVD-ALCU-4UM'),
      o('2450', 'Metal defect inspection', 'defect', 'DEF-M1-BF', { spc: 'M1-DEF' }),
      o('2800', 'Passivation deposition', 'cvd', 'PASS-SIN-OX'),
      o('3000', 'Wafer probe', 'probe', 'PRB-PWR-FULL'),
    ],
  },
};

export interface Product {
  id: string;
  name: string;
  route: string;
  /** Die grid size across the wafer (square grid clipped to the wafer edge). */
  grid: number;
  /** Baseline die yield with healthy tools (0–1). */
  baseYield: number;
  /** Share of new lot starts. */
  mix: number;
  /** Series index in the chart palette (fixed per product, never by rank). */
  series: 1 | 2 | 3;
}

export const products: Product[] = [
  { id: 'AX-7100', name: 'Edge AI SoC', route: 'LGC-28', grid: 22, baseYield: 0.9, mix: 0.45, series: 1 },
  { id: 'MX-3300', name: 'Microcontroller', route: 'LGC-28', grid: 30, baseYield: 0.94, mix: 0.3, series: 2 },
  { id: 'PW-0900', name: 'Power management IC', route: 'PWR-180', grid: 34, baseYield: 0.96, mix: 0.25, series: 3 },
];
export const productById = new Map(products.map((p) => [p.id, p]));

/** Probe bins. Bin 1 is a good die; four fail bins, each with a fixed chart color. */
export const bins = [
  { id: 1, name: 'Pass', short: 'Pass' },
  { id: 3, name: 'Leakage (IDDQ)', short: 'Leakage' },
  { id: 5, name: 'Open / short', short: 'Open/short' },
  { id: 7, name: 'Functional', short: 'Functional' },
  { id: 9, name: 'Parametric (Vt, speed)', short: 'Parametric' },
] as const;

/** SEMI E10 equipment states. */
export type E10 = 'PRD' | 'SBY' | 'ENG' | 'SDT' | 'UDT' | 'NST';
export const e10: Record<E10, { name: string; cls: string; icon: string; hint: string }> = {
  PRD: { name: 'Productive', cls: 'st-good', icon: 'player-play', hint: 'Processing production lots' },
  SBY: { name: 'Standby', cls: 'st-info', icon: 'player-pause', hint: 'Up and available, waiting for work' },
  ENG: { name: 'Engineering', cls: 'st-eng', icon: 'flask', hint: 'Qualification, inhibit or engineering runs' },
  SDT: { name: 'Scheduled down', cls: 'st-warn', icon: 'calendar-cog', hint: 'Preventive maintenance' },
  UDT: {
    name: 'Unscheduled down',
    cls: 'st-crit',
    icon: 'alert-octagon',
    hint: 'Failure or alarm, waiting for repair',
  },
  NST: { name: 'Non-scheduled', cls: 'st-muted', icon: 'moon', hint: 'Not scheduled for production' },
};

/** Alarm texts by step type, used when a tool fails. */
export const alarmTexts: Partial<Record<StepType, string[]>> & { default: string[] } = {
  default: ['Wafer handling robot: position error', 'Chiller flow low', 'Load port FOUP mapping error'],
  etch: ['RF reflected power high', 'Chamber pressure out of range', 'ESC helium leak rate high'],
  cvd: ['Precursor flow deviation', 'Heater zone 2 over temperature', 'Chamber pressure out of range'],
  pvd: ['Target power arc count exceeded', 'Cryo pump regeneration fault'],
  litho: ['Reticle stage synchronization error', 'Immersion hood leak detected', 'Track hot plate temperature fault'],
  implant: ['Beam current unstable', 'Source arc chamber fault', 'End-station vacuum fault'],
  cmp: ['Pad conditioner torque high', 'Slurry flow low', 'Endpoint signal lost'],
  oxidation: ['Tube temperature profile deviation', 'Boat elevator fault'],
  anneal: ['Tube temperature profile deviation', 'Boat elevator fault'],
  probe: ['Probe card contact resistance high', 'Tester channel fault'],
};

export type PersonaId = 'operator' | 'technician' | 'engineer' | 'yield' | 'manager';

export interface Persona {
  id: PersonaId;
  role: string;
  person: string;
  badge: string;
  icon: string;
  blurb: string;
  /** Areas this persona is assigned to (bay ownership). Empty = whole fab. */
  areas: AreaId[];
  /** Tabs this persona works in most; marked in the tab bar. */
  focus: string[];
}

export const personas: Persona[] = [
  {
    id: 'operator',
    role: 'Operator',
    person: 'M. Okafor',
    badge: 'OP-2214',
    icon: 'tabler:user',
    blurb: 'Runs lots: picks the next lot from the dispatch list, tracks it in and out, reports tool problems.',
    areas: ['litho', 'met'],
    focus: ['dispatch', 'lots'],
  },
  {
    id: 'technician',
    role: 'Equipment Technician',
    person: 'R. Chen',
    badge: 'ET-0871',
    icon: 'tabler:tool',
    blurb: 'Keeps tools up: answers alarms, repairs and qualifies tools, runs preventive maintenance.',
    areas: ['etch', 'film', 'cmp'],
    focus: ['equipment', 'maintenance', 'alarms'],
  },
  {
    id: 'engineer',
    role: 'Process Engineer',
    person: 'S. Iyer',
    badge: 'PE-0412',
    icon: 'tabler:flask',
    blurb: 'Owns process control: watches SPC, dispositions held lots, inhibits drifting tools, splits lots.',
    areas: ['etch', 'litho'],
    focus: ['spc', 'holds', 'lots'],
  },
  {
    id: 'yield',
    role: 'Yield Engineer',
    person: 'K. Novak',
    badge: 'YE-0190',
    icon: 'tabler:chart-dots',
    blurb: 'Finds yield loss: reads wafer maps and bin Paretos, runs tool commonality to find the cause.',
    areas: [],
    focus: ['yield', 'spc', 'lots'],
  },
  {
    id: 'manager',
    role: 'Shift Manager',
    person: 'D. Mensah',
    badge: 'SM-0033',
    icon: 'tabler:briefcase',
    blurb: 'Runs the shift: watches WIP, moves and outs, sets lot priority, starts new lots, clears bottlenecks.',
    areas: [],
    focus: ['overview', 'lots', 'equipment'],
  },
];
export const personaById = new Map(personas.map((p) => [p.id, p]));

export type Action =
  | 'trackIn'
  | 'hold'
  | 'disposition'
  | 'split'
  | 'priority'
  | 'startLot'
  | 'ackAlarm'
  | 'repair'
  | 'pm'
  | 'qual'
  | 'inhibit'
  | 'callTech';

/** Who may do what. The UI disables an action for other personas and says who can. */
export const permissions: Record<Action, PersonaId[]> = {
  trackIn: ['operator'],
  hold: ['operator', 'engineer', 'yield', 'manager'],
  disposition: ['engineer', 'yield'],
  split: ['engineer', 'yield'],
  priority: ['manager'],
  startLot: ['manager'],
  ackAlarm: ['operator', 'technician'],
  repair: ['technician'],
  pm: ['technician'],
  qual: ['technician', 'engineer'],
  inhibit: ['engineer'],
  callTech: ['operator', 'manager'],
};

export const priorities = {
  1: { name: 'Hot', cls: 'st-crit', icon: 'flame' },
  2: { name: 'Rush', cls: 'st-warn', icon: 'bolt' },
  3: { name: 'Normal', cls: 'st-muted', icon: 'point' },
  4: { name: 'Eng', cls: 'st-eng', icon: 'flask' },
} as const;
export type Priority = keyof typeof priorities;

export const meta = {
  fab: 'FAB-1',
  fabName: 'FAB-1 · 300 mm',
  disclaimer:
    'A simulation. FAB-1, its tools, products, people and numbers are fictional; the model is simplified but follows how a real fab MES works.',
};
