/**
 * WFE Intelligence Hub dataset.
 *
 * Every figure here is an approximation compiled from public sources (SEMI market statistics,
 * company annual reports and filings, government publications). Values are rounded; 2025 and
 * 2026 market values are estimates. Edit this file to update the app: every view, chart, table
 * and the search index are generated from it at build time.
 */

export const meta = {
  updated: '2026-11',
  baseYear: 2024,
  disclaimer:
    'Indicative figures compiled from public sources and rounded. Market values for 2025 and 2026 are estimates. Verify against the primary source before citing.',
};

/* ------------------------------------------------------------------ Market */

export interface AnnualPoint {
  year: number;
  value: number; // WFE spend, USD billions
  estimate?: boolean;
}

/** Global wafer fab equipment (WFE) spend, USD billions (approx.). */
export const annual: AnnualPoint[] = [
  { year: 2016, value: 37 },
  { year: 2017, value: 50 },
  { year: 2018, value: 54 },
  { year: 2019, value: 52 },
  { year: 2020, value: 61 },
  { year: 2021, value: 88 },
  { year: 2022, value: 94 },
  { year: 2023, value: 96 },
  { year: 2024, value: 104 },
  { year: 2025, value: 110, estimate: true },
  { year: 2026, value: 118, estimate: true },
];

/** Semiconductor equipment billings by region where tools ship, 2024, USD billions (approx.). */
export const regions = [
  { id: 'china', label: 'China', value: 49.6 },
  { id: 'korea', label: 'South Korea', value: 20.5 },
  { id: 'taiwan', label: 'Taiwan', value: 16.6 },
  { id: 'americas', label: 'North America', value: 13.7 },
  { id: 'japan', label: 'Japan', value: 7.8 },
  { id: 'europe', label: 'Europe', value: 4.9 },
  { id: 'row', label: 'Rest of world', value: 4.0 },
];

/** Share of WFE by end device, 2024 (approx., percent). */
export const deviceMix = [
  { id: 'logic', label: 'Foundry & logic', share: 58 },
  { id: 'dram', label: 'DRAM', share: 24 },
  { id: 'nand', label: 'NAND', share: 10 },
  { id: 'other', label: 'Specialty & other', share: 8 },
];

export const marketDrivers = [
  {
    title: 'AI accelerators pull leading-edge logic',
    body: 'GAA nanosheet ramps at 2 nm-class nodes and backside power delivery add deposition, etch and metrology steps per wafer.',
  },
  {
    title: 'HBM is the fastest-growing DRAM demand',
    body: 'HBM stacks use roughly three times the wafer area of standard DRAM per bit, and add TSV, thinning and bonding tools.',
  },
  {
    title: 'China spend is normalizing from a peak',
    body: 'Mature-node capacity builds kept China the largest region since 2020. Export controls and digestion moderate growth.',
  },
  {
    title: 'Memory capex recovers unevenly',
    body: 'DRAM capex is led by HBM and 1c-node conversions. NAND spend stays focused on layer-count upgrades over new capacity.',
  },
];

/* ------------------------------------------------------------------ Segments */

export interface Segment {
  id: string;
  name: string;
  share: number; // percent of WFE, approx.
  icon: string;
  summary: string;
  subsegments: string[];
  leaders: string[]; // vendor ids or plain names
  drivers: string[];
}

export const segments: Segment[] = [
  {
    id: 'litho',
    name: 'Lithography',
    share: 24,
    icon: 'tabler:aperture',
    summary:
      'Prints the circuit pattern. EUV scanners are the most expensive tools in the fab, and ASML is the only supplier.',
    subsegments: [
      'EUV scanners (0.33 NA, High-NA 0.55)',
      'DUV immersion (ArFi)',
      'Dry ArF, KrF, i-line',
      'Coater / developer tracks',
      'Mask writers',
    ],
    leaders: ['asml', 'Nikon', 'Canon', 'tel', 'screen'],
    drivers: [
      'High-NA EUV insertion at 14A-class logic and later DRAM',
      'More EUV layers per node',
      'DUV demand for mature-node China builds',
    ],
  },
  {
    id: 'etch',
    name: 'Etch',
    share: 22,
    icon: 'tabler:hammer',
    summary:
      'Removes material to transfer the pattern. Conductor and dielectric etch are both critical for 3D structures.',
    subsegments: [
      'Conductor etch',
      'Dielectric etch',
      'High-aspect-ratio and cryogenic etch',
      'Atomic layer etch (ALE)',
      'Selective / isotropic etch',
    ],
    leaders: ['lam', 'tel', 'amat', 'Hitachi High-Tech', 'amec', 'naura'],
    drivers: [
      '3D NAND channel holes beyond 300 layers',
      'GAA nanosheet release etch',
      'Patterning steps as multi-patterning persists',
    ],
  },
  {
    id: 'dep',
    name: 'Deposition',
    share: 22,
    icon: 'tabler:stack-2',
    summary: 'Adds thin films: CVD, ALD, PVD, epitaxy and electroplating. It is the broadest segment by tool count.',
    subsegments: [
      'CVD (PECVD, LPCVD)',
      'ALD',
      'PVD (sputter)',
      'Epitaxy',
      'Electrochemical deposition (ECD)',
      'Metal CVD (W, Mo)',
    ],
    leaders: ['amat', 'lam', 'tel', 'asm', 'kokusai', 'naura'],
    drivers: [
      'GAA Si/SiGe superlattice epitaxy',
      'Molybdenum replacing tungsten',
      'Backside power and new interconnect metals',
    ],
  },
  {
    id: 'pc',
    name: 'Process control',
    share: 12,
    icon: 'tabler:zoom-scan',
    summary: 'Inspects and measures wafers and masks to find defects and keep critical dimensions and overlay in spec.',
    subsegments: [
      'Wafer defect inspection',
      'Reticle / mask inspection',
      'Optical CD and film metrology',
      'Overlay metrology',
      'E-beam review and inspection',
    ],
    leaders: ['kla', 'amat', 'Hitachi High-Tech', 'onto', 'nova', 'Lasertec'],
    drivers: [
      'More inspection steps per layer at GAA',
      'EUV mask and pellicle inspection',
      'Advanced packaging metrology',
    ],
  },
  {
    id: 'clean',
    name: 'Clean',
    share: 6,
    icon: 'tabler:droplet',
    summary: 'Removes particles, residues and contamination between process steps. About one step in five is a clean.',
    subsegments: ['Single-wafer wet clean', 'Batch wet stations', 'Scrubbers', 'Dry / plasma clean'],
    leaders: ['screen', 'tel', 'lam', 'SEMES', 'acm'],
    drivers: ['Fragile 3D structures need gentler cleans', 'More clean steps at each new node', 'China localization'],
  },
  {
    id: 'cmp',
    name: 'CMP',
    share: 3,
    icon: 'tabler:circle-dashed',
    summary: 'Chemical mechanical planarization makes surfaces flat between layers and enables damascene copper lines.',
    subsegments: ['Dielectric CMP', 'Metal (Cu, W, Co) CMP', 'Post-CMP clean'],
    leaders: ['amat', 'Ebara'],
    drivers: ['Hybrid bonding needs very flat surfaces', 'Backside wafer thinning and planarization'],
  },
  {
    id: 'implant',
    name: 'Ion implant',
    share: 3,
    icon: 'tabler:bolt',
    summary: 'Implants dopant ions to set the electrical properties of transistors and wells.',
    subsegments: ['High-current', 'Medium-current', 'High-energy', 'SiC / power implant'],
    leaders: ['amat', 'axcelis', 'Sumitomo Heavy (SMIT)'],
    drivers: ['SiC and power devices', 'Image sensors need high-energy implant', 'Mature-node capacity in China'],
  },
  {
    id: 'thermal',
    name: 'Thermal & other',
    share: 8,
    icon: 'tabler:flame',
    summary: 'Furnaces, rapid thermal processing, annealing, and wafer bonding or other tools not covered above.',
    subsegments: [
      'Batch furnaces',
      'Rapid thermal processing (RTP)',
      'Laser anneal',
      'Wafer bonding',
      'Wafer handling & automation',
    ],
    leaders: ['kokusai', 'tel', 'amat', 'Mattson', 'EV Group'],
    drivers: ['Hybrid and fusion bonding for HBM and backside power', 'Low-thermal-budget anneals for new materials'],
  },
];

/* ------------------------------------------------------------------ Vendors */

export type VendorRegion = 'US' | 'Europe' | 'Japan' | 'China';

export interface Vendor {
  id: string;
  name: string;
  hq: string;
  region: VendorRegion;
  ticker: string;
  fy: string; // fiscal year the revenue refers to
  revenue: number; // USD billions, approx. (non-USD converted at period average)
  china?: number; // percent of revenue from China, approx.; omitted when not disclosed or uncertain
  focus: string[]; // segment ids
  summary: string;
  products: string[];
  site: string;
}

export const vendors: Vendor[] = [
  {
    id: 'asml',
    name: 'ASML',
    hq: 'Veldhoven, Netherlands',
    region: 'Europe',
    ticker: 'ASML',
    fy: 'FY2024',
    revenue: 30.6,
    china: 36,
    focus: ['litho', 'pc'],
    summary:
      'The only supplier of EUV lithography and the leader in DUV immersion scanners. It also sells computational lithography, metrology and e-beam inspection.',
    products: ['TWINSCAN NXE (EUV)', 'TWINSCAN EXE (High-NA EUV)', 'TWINSCAN NXT (ArFi)', 'YieldStar', 'HMI e-beam'],
    site: 'https://www.asml.com/en/investors',
  },
  {
    id: 'amat',
    name: 'Applied Materials',
    hq: 'Santa Clara, US',
    region: 'US',
    ticker: 'AMAT',
    fy: 'FY2024',
    revenue: 27.2,
    china: 37,
    focus: ['dep', 'etch', 'pc', 'cmp', 'implant', 'thermal'],
    summary:
      'Has the broadest WFE portfolio. Leads in PVD, CMP, epitaxy and ion implant, and is strong in CVD, etch and e-beam metrology.',
    products: [
      'Endura (PVD)',
      'Centura (epi, etch)',
      'Producer (CVD)',
      'Reflexion (CMP)',
      'VIISta (implant)',
      'PROVision / SEMVision (e-beam)',
    ],
    site: 'https://ir.appliedmaterials.com',
  },
  {
    id: 'tel',
    name: 'Tokyo Electron',
    hq: 'Tokyo, Japan',
    region: 'Japan',
    ticker: '8035.T',
    fy: 'FY2024 (Mar-25)',
    revenue: 16.0,
    focus: ['litho', 'etch', 'dep', 'clean', 'thermal'],
    summary:
      'Dominates coater/developer tracks, including nearly all EUV tracks. Strong in dielectric etch, batch deposition and cleaning.',
    products: [
      'CLEAN TRACK LITHIUS Pro (track)',
      'Tactras (etch)',
      'TELINDY (furnace)',
      'CELLESTA (clean)',
      'Synapse (bonding)',
    ],
    site: 'https://www.tel.com/ir/',
  },
  {
    id: 'lam',
    name: 'Lam Research',
    hq: 'Fremont, US',
    region: 'US',
    ticker: 'LRCX',
    fy: 'FY2024 (Jun-24)',
    revenue: 14.9,
    china: 42,
    focus: ['etch', 'dep', 'clean'],
    summary:
      'Leads in etch, especially conductor and high-aspect-ratio memory etch, and is strong in metal deposition and ECD. It is heavily exposed to memory.',
    products: [
      'Kiyo / Flex (etch)',
      'Vantex / Lam Cryo 3.0',
      'ALTUS (W/Mo ALD)',
      'SABRE (ECD)',
      'Striker (ALD)',
      'Akara (etch)',
    ],
    site: 'https://investor.lamresearch.com',
  },
  {
    id: 'kla',
    name: 'KLA',
    hq: 'Milpitas, US',
    region: 'US',
    ticker: 'KLAC',
    fy: 'FY2024 (Jun-24)',
    revenue: 9.8,
    china: 43,
    focus: ['pc'],
    summary:
      'The process-control leader, with a dominant position in wafer and reticle inspection, overlay metrology and yield software.',
    products: [
      '29xx / 39xx broadband plasma inspection',
      'Teron (reticle inspection)',
      'Archer (overlay)',
      'SpectraShape (CD)',
      'Klarity (analytics)',
    ],
    site: 'https://ir.kla.com',
  },
  {
    id: 'screen',
    name: 'SCREEN Holdings',
    hq: 'Kyoto, Japan',
    region: 'Japan',
    ticker: '7735.T',
    fy: 'FY2024 (Mar-25)',
    revenue: 4.1,
    focus: ['clean', 'litho'],
    summary:
      'The leader in wet cleaning, both single-wafer and batch. It also makes coater/developers and thermal tools.',
    products: ['SU-3400 (single-wafer clean)', 'FC-3100 (batch clean)', 'DT-3000 (coater/developer)'],
    site: 'https://www.screen.co.jp/en/ir',
  },
  {
    id: 'naura',
    name: 'NAURA',
    hq: 'Beijing, China',
    region: 'China',
    ticker: '002371.SZ',
    fy: 'FY2024',
    revenue: 4.1,
    focus: ['etch', 'dep', 'clean', 'thermal'],
    summary:
      'The largest Chinese WFE maker, with a broad portfolio in etch, PVD, CVD, furnaces and cleaning. It is a key beneficiary of localization.',
    products: ['Etch (ICP, CCP)', 'PVD', 'LPCVD / ALD', 'Vertical furnaces', 'Wet clean'],
    site: 'https://www.naura.com',
  },
  {
    id: 'asm',
    name: 'ASM International',
    hq: 'Almere, Netherlands',
    region: 'Europe',
    ticker: 'ASM.AS',
    fy: 'FY2024',
    revenue: 3.2,
    focus: ['dep'],
    summary: 'The leader in single-wafer ALD and a top player in epitaxy. GAA transistors are a structural tailwind.',
    products: ['Pulsar / EmerALD (ALD)', 'Intrepid (epi)', 'A400 / A412 (vertical furnace)', 'Eagle (PECVD)'],
    site: 'https://www.asm.com/investors',
  },
  {
    id: 'kokusai',
    name: 'Kokusai Electric',
    hq: 'Tokyo, Japan',
    region: 'Japan',
    ticker: '6525.T',
    fy: 'FY2024 (Mar-25)',
    revenue: 1.6,
    focus: ['dep', 'thermal'],
    summary: 'A batch deposition specialist, strong in batch ALD and furnaces for 3D NAND and DRAM.',
    products: ['AdvancedAce (batch ALD/CVD)', 'TSURUGI-C² (single-wafer)', 'Vertical furnaces'],
    site: 'https://www.kokusai-electric.com/en/ir/',
  },
  {
    id: 'amec',
    name: 'AMEC',
    hq: 'Shanghai, China',
    region: 'China',
    ticker: '688012.SS',
    fy: 'FY2024',
    revenue: 1.3,
    focus: ['etch', 'dep'],
    summary: 'A Chinese CCP and ICP etch maker that is growing in MOCVD and thin-film deposition.',
    products: ['Primo (CCP etch)', 'Primo nanova (ICP etch)', 'Prismo (MOCVD)'],
    site: 'https://www.amec-inc.com',
  },
  {
    id: 'axcelis',
    name: 'Axcelis',
    hq: 'Beverly, US',
    region: 'US',
    ticker: 'ACLS',
    fy: 'FY2024',
    revenue: 1.0,
    focus: ['implant'],
    summary: 'An ion implant pure-play with a strong position in SiC power and high-energy implant.',
    products: ['Purion H / M / XE', 'Purion Power Series (SiC)'],
    site: 'https://investor.axcelis.com',
  },
  {
    id: 'onto',
    name: 'Onto Innovation',
    hq: 'Wilmington, US',
    region: 'US',
    ticker: 'ONTO',
    fy: 'FY2024',
    revenue: 1.0,
    focus: ['pc'],
    summary: 'Supplies optical metrology, inspection and lithography for advanced packaging.',
    products: ['Atlas (OCD)', 'Dragonfly (2D/3D inspection)', 'JetStep (packaging litho)'],
    site: 'https://investors.ontoinnovation.com',
  },
  {
    id: 'acm',
    name: 'ACM Research',
    hq: 'Fremont, US / Shanghai',
    region: 'China',
    ticker: 'ACMR',
    fy: 'FY2024',
    revenue: 0.8,
    focus: ['clean', 'dep'],
    summary:
      'Single-wafer cleaning and electroplating. Most of its revenue comes from China through its Shanghai subsidiary.',
    products: ['SAPS / TEBO megasonic clean', 'Ultra ECP (plating)', 'Ultra Furnace'],
    site: 'https://ir.acmrcsh.com',
  },
  {
    id: 'nova',
    name: 'Nova',
    hq: 'Rehovot, Israel',
    region: 'Europe',
    ticker: 'NVMI',
    fy: 'FY2024',
    revenue: 0.7,
    focus: ['pc'],
    summary:
      'Supplies optical, X-ray and chemical metrology for dimensional and materials control. Grouped under Europe here.',
    products: ['PRISM (OCD)', 'VeraFlex (XPS)', 'Metrion (SIMS)', 'Nova ELIPSON'],
    site: 'https://ir.novami.com',
  },
];

/* ------------------------------------------------------------------ Fabs */

export type FabStatus = 'Operating' | 'Ramping' | 'Pilot' | 'Construction' | 'Planned' | 'Delayed' | 'Cancelled';
export type FabRegion = 'US' | 'Taiwan' | 'Korea' | 'Japan' | 'China' | 'Europe' | 'SE Asia' | 'India';

export interface Fab {
  id: string;
  company: string;
  site: string;
  region: FabRegion;
  kind: 'Foundry' | 'Logic' | 'DRAM' | 'NAND' | 'Packaging' | 'Specialty';
  node: string;
  status: FabStatus;
  start: string; // first output, actual or target
  investment?: string; // announced program value
}

export const fabs: Fab[] = [
  {
    id: 'tsmc-az-p1',
    company: 'TSMC',
    site: 'Arizona Fab 21 P1, Phoenix',
    region: 'US',
    kind: 'Foundry',
    node: 'N4',
    status: 'Operating',
    start: '2025',
    investment: '$165B (all Arizona phases)',
  },
  {
    id: 'tsmc-az-p2',
    company: 'TSMC',
    site: 'Arizona Fab 21 P2, Phoenix',
    region: 'US',
    kind: 'Foundry',
    node: 'N3',
    status: 'Construction',
    start: '2027',
  },
  {
    id: 'tsmc-az-p3',
    company: 'TSMC',
    site: 'Arizona Fab 21 P3, Phoenix',
    region: 'US',
    kind: 'Foundry',
    node: 'N2 / A16',
    status: 'Construction',
    start: '2028+',
  },
  {
    id: 'tsmc-f20',
    company: 'TSMC',
    site: 'Fab 20, Hsinchu (Baoshan)',
    region: 'Taiwan',
    kind: 'Foundry',
    node: 'N2',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'tsmc-f22',
    company: 'TSMC',
    site: 'Fab 22, Kaohsiung',
    region: 'Taiwan',
    kind: 'Foundry',
    node: 'N2 / A16',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'jasm-1',
    company: 'JASM (TSMC)',
    site: 'Fab 1, Kumamoto',
    region: 'Japan',
    kind: 'Foundry',
    node: '12–28 nm',
    status: 'Operating',
    start: '2024',
    investment: '~$20B (Fab 1 + 2)',
  },
  {
    id: 'jasm-2',
    company: 'JASM (TSMC)',
    site: 'Fab 2, Kumamoto',
    region: 'Japan',
    kind: 'Foundry',
    node: '6–7 nm',
    status: 'Construction',
    start: '2027+',
  },
  {
    id: 'esmc',
    company: 'ESMC (TSMC JV)',
    site: 'Dresden',
    region: 'Europe',
    kind: 'Foundry',
    node: '12–28 nm',
    status: 'Construction',
    start: '2027',
    investment: '~€10B',
  },
  {
    id: 'samsung-taylor',
    company: 'Samsung',
    site: 'Taylor, Texas',
    region: 'US',
    kind: 'Foundry',
    node: '2 nm',
    status: 'Construction',
    start: '2026',
    investment: '~$37B (Texas program)',
  },
  {
    id: 'samsung-p4',
    company: 'Samsung',
    site: 'Pyeongtaek P4',
    region: 'Korea',
    kind: 'DRAM',
    node: '1c DRAM',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'skh-m15x',
    company: 'SK hynix',
    site: 'M15X, Cheongju',
    region: 'Korea',
    kind: 'DRAM',
    node: 'HBM DRAM',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'skh-yongin',
    company: 'SK hynix',
    site: 'Yongin cluster, Fab 1',
    region: 'Korea',
    kind: 'DRAM',
    node: 'DRAM / HBM',
    status: 'Construction',
    start: '2027',
  },
  {
    id: 'skh-indiana',
    company: 'SK hynix',
    site: 'West Lafayette, Indiana',
    region: 'US',
    kind: 'Packaging',
    node: 'HBM packaging',
    status: 'Planned',
    start: '2028',
    investment: '~$3.9B',
  },
  {
    id: 'micron-id1',
    company: 'Micron',
    site: 'ID1, Boise',
    region: 'US',
    kind: 'DRAM',
    node: 'Leading-edge DRAM',
    status: 'Construction',
    start: '2027',
  },
  {
    id: 'micron-ny',
    company: 'Micron',
    site: 'Clay, New York',
    region: 'US',
    kind: 'DRAM',
    node: 'Leading-edge DRAM',
    status: 'Planned',
    start: '2030+',
    investment: 'Up to $100B (long term)',
  },
  {
    id: 'micron-hiroshima',
    company: 'Micron',
    site: 'Hiroshima',
    region: 'Japan',
    kind: 'DRAM',
    node: '1γ DRAM (EUV)',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'micron-sg',
    company: 'Micron',
    site: 'Singapore HBM assembly',
    region: 'SE Asia',
    kind: 'Packaging',
    node: 'HBM packaging',
    status: 'Construction',
    start: '2026–27',
  },
  {
    id: 'micron-sanand',
    company: 'Micron',
    site: 'Sanand, Gujarat',
    region: 'India',
    kind: 'Packaging',
    node: 'Assembly & test',
    status: 'Construction',
    start: '2025–26',
  },
  {
    id: 'intel-f52',
    company: 'Intel',
    site: 'Fab 52, Chandler',
    region: 'US',
    kind: 'Logic',
    node: 'Intel 18A',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'intel-ohio',
    company: 'Intel',
    site: 'Ohio One, New Albany',
    region: 'US',
    kind: 'Logic',
    node: 'Intel 14A-class',
    status: 'Delayed',
    start: '2030+',
    investment: '$28B (initial)',
  },
  {
    id: 'intel-magdeburg',
    company: 'Intel',
    site: 'Fab 29, Magdeburg',
    region: 'Europe',
    kind: 'Logic',
    node: 'Leading-edge',
    status: 'Cancelled',
    start: '—',
    investment: '~€30B (withdrawn)',
  },
  {
    id: 'rapidus',
    company: 'Rapidus',
    site: 'IIM-1, Chitose',
    region: 'Japan',
    kind: 'Foundry',
    node: '2 nm',
    status: 'Pilot',
    start: '2027 (volume)',
  },
  {
    id: 'tata-dholera',
    company: 'Tata Electronics (PSMC tech)',
    site: 'Dholera, Gujarat',
    region: 'India',
    kind: 'Foundry',
    node: '28–110 nm',
    status: 'Construction',
    start: '2026–27',
    investment: '~$11B',
  },
  {
    id: 'ti-sm1',
    company: 'Texas Instruments',
    site: 'SM1, Sherman',
    region: 'US',
    kind: 'Specialty',
    node: '300 mm analog',
    status: 'Operating',
    start: '2025',
  },
  {
    id: 'gf-malta',
    company: 'GlobalFoundries',
    site: 'Fab 8 expansion, Malta',
    region: 'US',
    kind: 'Specialty',
    node: '12–22 nm FDX / FinFET',
    status: 'Planned',
    start: '2027+',
  },
  {
    id: 'huahong-f9',
    company: 'Hua Hong',
    site: 'Fab 9, Wuxi',
    region: 'China',
    kind: 'Specialty',
    node: '40–90 nm',
    status: 'Ramping',
    start: '2025',
  },
  {
    id: 'umc-sg',
    company: 'UMC',
    site: 'Fab 12i P3, Singapore',
    region: 'SE Asia',
    kind: 'Foundry',
    node: '22–28 nm',
    status: 'Operating',
    start: '2025',
  },
  {
    id: 'vsmc',
    company: 'VSMC (Vanguard–NXP)',
    site: 'Singapore',
    region: 'SE Asia',
    kind: 'Foundry',
    node: '40–130 nm',
    status: 'Construction',
    start: '2027',
    investment: '~$7.8B',
  },
  {
    id: 'kioxia-k2',
    company: 'Kioxia / Sandisk',
    site: 'Kitakami K2',
    region: 'Japan',
    kind: 'NAND',
    node: 'BiCS 3D NAND',
    status: 'Ramping',
    start: '2025',
  },
];

export const fabStatusOrder: FabStatus[] = [
  'Operating',
  'Ramping',
  'Pilot',
  'Construction',
  'Planned',
  'Delayed',
  'Cancelled',
];

/* ------------------------------------------------------------------ Roadmap */

export type RoadmapArea = 'Logic' | 'DRAM' | 'NAND' | 'Lithography' | 'Packaging';

export interface RoadmapItem {
  year: string;
  area: RoadmapArea;
  title: string;
  detail: string;
  impact: string[]; // segment ids that benefit
}

export const roadmap: RoadmapItem[] = [
  {
    year: '2025',
    area: 'Logic',
    title: 'TSMC N2: first GAA nanosheet node at TSMC',
    detail:
      'Nanosheet transistors add Si/SiGe epitaxy stacks, selective etch to release the channels, and more ALD for the inner spacers.',
    impact: ['dep', 'etch', 'pc'],
  },
  {
    year: '2025',
    area: 'Logic',
    title: 'Intel 18A: RibbonFET with PowerVia',
    detail: 'Pairs GAA transistors with backside power delivery in high-volume manufacturing.',
    impact: ['dep', 'etch', 'cmp', 'thermal'],
  },
  {
    year: '2025',
    area: 'DRAM',
    title: '1c (sixth-generation 10 nm-class) DRAM',
    detail: 'More EUV layers per wafer. Production goes first to HBM4 base and core dies.',
    impact: ['litho', 'etch', 'dep'],
  },
  {
    year: '2025',
    area: 'NAND',
    title: '300+ layer 3D NAND',
    detail: 'Layer-count upgrades push high-aspect-ratio and cryogenic etch, and molybdenum word lines.',
    impact: ['etch', 'dep'],
  },
  {
    year: '2025',
    area: 'Lithography',
    title: 'High-NA EUV moves into R&D and pilot lines',
    detail: 'EXE:5000 tools at Intel, imec and memory makers. EXE:5200 adds productivity for HVM.',
    impact: ['litho', 'pc'],
  },
  {
    year: '2026',
    area: 'Logic',
    title: 'TSMC A16 with Super Power Rail',
    detail: 'Backside power reaches foundry. It adds wafer bonding, thinning and backside contact formation.',
    impact: ['thermal', 'cmp', 'etch', 'dep'],
  },
  {
    year: '2026',
    area: 'DRAM',
    title: 'HBM4 ramps for AI accelerators',
    detail: 'A 2048-bit interface, 12–16-high stacks, and a logic-process base die made at foundries.',
    impact: ['etch', 'dep', 'cmp', 'pc', 'thermal'],
  },
  {
    year: '2026',
    area: 'NAND',
    title: '400+ layer 3D NAND',
    detail: 'Multi-deck stacking and wafer bonding, such as CMOS-bonded-array architectures.',
    impact: ['etch', 'dep', 'thermal'],
  },
  {
    year: '2026',
    area: 'Packaging',
    title: 'CoWoS and SoIC capacity expansion',
    detail: 'Advanced packaging moves into front-end-like fabs with lithography, deposition and metrology.',
    impact: ['litho', 'dep', 'pc', 'cmp'],
  },
  {
    year: '2027',
    area: 'Packaging',
    title: 'Hybrid bonding for HBM4E and SoIC',
    detail: 'Cu-Cu direct bonding replaces micro-bumps at fine pitch and needs very flat CMP and very clean surfaces.',
    impact: ['cmp', 'clean', 'thermal', 'pc'],
  },
  {
    year: '2027',
    area: 'Lithography',
    title: 'High-NA EUV in high-volume manufacturing',
    detail: 'First HVM insertion is expected at 14A-class logic. It cuts multi-patterning steps on critical layers.',
    impact: ['litho'],
  },
  {
    year: '2028',
    area: 'Logic',
    title: '1.4 nm-class nodes (TSMC A14, Intel 14A)',
    detail: 'Second-generation GAA with higher sheet counts and tighter metal pitch.',
    impact: ['litho', 'dep', 'etch', 'pc'],
  },
  {
    year: '2028',
    area: 'Packaging',
    title: 'Panel-level packaging and glass substrates',
    detail: 'Larger formats make room for AI packages with more chiplets and HBM stacks.',
    impact: ['litho', 'pc'],
  },
  {
    year: '2030+',
    area: 'DRAM',
    title: '4F² vertical-channel and 3D DRAM',
    detail:
      'Vertical transistors, then stacked DRAM cells, shift DRAM spending from lithography toward deposition and etch, as happened in NAND.',
    impact: ['dep', 'etch'],
  },
  {
    year: '2032+',
    area: 'Logic',
    title: 'CFET (complementary FET)',
    detail: 'Stacked n- and p-type transistors add sequential integration steps and more bonding.',
    impact: ['dep', 'etch', 'thermal'],
  },
];

/* ------------------------------------------------------------------ Policy */

export type PolicyKind = 'Export control' | 'Subsidy' | 'Industrial policy';

export interface PolicyItem {
  date: string; // YYYY-MM
  region: string;
  kind: PolicyKind;
  title: string;
  detail: string;
}

export const policy: PolicyItem[] = [
  {
    date: '2021-12',
    region: 'India',
    kind: 'Subsidy',
    title: 'India Semiconductor Mission',
    detail: 'An incentive program of about $10B for fabs, display and assembly / test plants.',
  },
  {
    date: '2022-08',
    region: 'US',
    kind: 'Subsidy',
    title: 'CHIPS and Science Act signed',
    detail:
      '$52.7B in total, including $39B in manufacturing incentives and a 25% investment tax credit for fab equipment.',
  },
  {
    date: '2022-10',
    region: 'US',
    kind: 'Export control',
    title: 'BIS advanced computing and semiconductor rules',
    detail:
      'Restricts exports of tools for advanced logic, DRAM and NAND fabs in China, and limits support from US persons.',
  },
  {
    date: '2023-07',
    region: 'Japan',
    kind: 'Export control',
    title: 'Japan controls 23 equipment categories',
    detail: 'Covers lithography, etch, deposition and cleaning tools for advanced nodes.',
  },
  {
    date: '2023-09',
    region: 'Netherlands',
    kind: 'Export control',
    title: 'Dutch licences for advanced DUV',
    detail: 'Licences are required for the most advanced immersion DUV systems. EUV was already restricted.',
  },
  {
    date: '2023-09',
    region: 'EU',
    kind: 'Subsidy',
    title: 'EU Chips Act enters into force',
    detail: 'Targets €43B of public and private investment and 20% of global production by 2030.',
  },
  {
    date: '2023-10',
    region: 'US',
    kind: 'Export control',
    title: 'BIS update to the October 2022 rules',
    detail: 'Widens the equipment scope, closes loopholes and adds more destination countries.',
  },
  {
    date: '2024-05',
    region: 'China',
    kind: 'Industrial policy',
    title: 'Big Fund III launched',
    detail: 'A national IC fund of about ¥344B (≈ $47B) that targets equipment, materials and HBM.',
  },
  {
    date: '2024-11',
    region: 'Japan',
    kind: 'Subsidy',
    title: '¥10T AI and semiconductor package',
    detail: 'Multi-year support for Rapidus, JASM and AI infrastructure through 2030.',
  },
  {
    date: '2024-12',
    region: 'US',
    kind: 'Export control',
    title: 'BIS December 2024 rules',
    detail:
      'Adds 24 tool types, 3 software tools, HBM controls and about 140 entities, and extends the foreign direct product rules.',
  },
  {
    date: '2025-03',
    region: 'Korea',
    kind: 'Subsidy',
    title: 'Expanded K-Chips Act tax credits',
    detail: 'Higher investment tax credits for national strategic technology facilities.',
  },
  {
    date: '2025-08',
    region: 'US',
    kind: 'Industrial policy',
    title: 'US government takes an equity stake in Intel',
    detail: 'CHIPS grants are converted into a roughly 10% stake.',
  },
  {
    date: '2025-08',
    region: 'US',
    kind: 'Export control',
    title: 'VEU status revoked for Samsung and SK hynix China fabs',
    detail: 'Tool shipments to their China fabs now need individual licences.',
  },
  {
    date: '2025-09',
    region: 'US',
    kind: 'Export control',
    title: 'BIS 50% affiliates rule',
    detail:
      'Extends Entity List restrictions to majority-owned subsidiaries. It was later suspended for one year under a US–China trade arrangement.',
  },
];

/* ------------------------------------------------------------------ Process explorer */

export interface ProcessStep {
  id: string;
  step: string;
  segment: string; // segment id
  purpose: string;
  tools: { name: string; vendors: string[] }[];
  edge: string; // why it matters at leading edge
}

export const process: ProcessStep[] = [
  {
    id: 'oxidation',
    step: 'Oxidation & thermal',
    segment: 'thermal',
    purpose: 'Grow oxides, anneal implants and densify films.',
    tools: [
      { name: 'Vertical batch furnace', vendors: ['kokusai', 'tel', 'asm', 'naura'] },
      { name: 'Rapid thermal / laser anneal', vendors: ['amat', 'Mattson', 'SCREEN'] },
    ],
    edge: 'New channel materials and backside power need low-thermal-budget anneals.',
  },
  {
    id: 'deposition',
    step: 'Thin-film deposition',
    segment: 'dep',
    purpose: 'Deposit dielectric, metal and semiconductor films, from single atomic layers to microns thick.',
    tools: [
      { name: 'PECVD / LPCVD', vendors: ['amat', 'lam', 'tel', 'naura'] },
      { name: 'ALD', vendors: ['asm', 'lam', 'tel', 'kokusai', 'amat'] },
      { name: 'PVD', vendors: ['amat', 'naura'] },
      { name: 'Epitaxy', vendors: ['amat', 'asm'] },
      { name: 'Electroplating (ECD)', vendors: ['lam', 'amat', 'acm'] },
    ],
    edge: 'GAA superlattices, inner spacers and Mo/Ru metals all need atomic-scale control.',
  },
  {
    id: 'litho',
    step: 'Lithography',
    segment: 'litho',
    purpose: 'Coat photoresist, expose the pattern through a mask, and develop it.',
    tools: [
      { name: 'EUV scanner', vendors: ['asml'] },
      { name: 'DUV immersion scanner', vendors: ['asml', 'Nikon'] },
      { name: 'KrF / i-line steppers', vendors: ['asml', 'Canon', 'Nikon'] },
      { name: 'Coater / developer track', vendors: ['tel', 'screen'] },
    ],
    edge: 'High-NA EUV trades smaller exposure fields for resolution. Stochastic defects push inspection demand.',
  },
  {
    id: 'etch',
    step: 'Etch',
    segment: 'etch',
    purpose: 'Remove material selectively to transfer the resist pattern into the films below.',
    tools: [
      { name: 'Conductor etch (ICP)', vendors: ['lam', 'amat', 'Hitachi High-Tech', 'naura'] },
      { name: 'Dielectric etch (CCP)', vendors: ['tel', 'lam', 'amec'] },
      { name: 'Cryogenic / HAR etch', vendors: ['lam', 'tel'] },
      { name: 'Selective isotropic etch', vendors: ['amat', 'lam', 'tel'] },
    ],
    edge: 'NAND channel holes exceed 50:1 aspect ratio, and GAA release etch must remove SiGe without attacking Si.',
  },
  {
    id: 'implant',
    step: 'Ion implant',
    segment: 'implant',
    purpose: 'Dope silicon to form wells, sources/drains and junctions.',
    tools: [
      { name: 'High / medium current implant', vendors: ['amat', 'axcelis', 'Sumitomo Heavy (SMIT)'] },
      { name: 'High-energy implant', vendors: ['axcelis', 'amat'] },
    ],
    edge: 'Image sensors and SiC power devices drive high-energy and high-temperature implant.',
  },
  {
    id: 'cmp',
    step: 'CMP',
    segment: 'cmp',
    purpose: 'Planarize the wafer surface between layers and remove excess metal.',
    tools: [{ name: 'CMP polisher with integrated clean', vendors: ['amat', 'Ebara'] }],
    edge: 'Hybrid bonding needs nanometre-level flatness across the whole wafer.',
  },
  {
    id: 'clean',
    step: 'Wet & dry clean',
    segment: 'clean',
    purpose: 'Remove particles, residues and metals between steps.',
    tools: [
      { name: 'Single-wafer wet clean', vendors: ['screen', 'tel', 'lam', 'SEMES', 'acm'] },
      { name: 'Batch wet bench', vendors: ['screen', 'tel'] },
    ],
    edge: 'Tall, fragile 3D features collapse under surface tension, so cleans move to new drying methods.',
  },
  {
    id: 'metrology',
    step: 'Metrology & inspection',
    segment: 'pc',
    purpose: 'Measure CD, overlay and film thickness, and find killer defects on wafers and masks.',
    tools: [
      { name: 'Optical wafer inspection', vendors: ['kla', 'amat'] },
      { name: 'E-beam inspection / review', vendors: ['amat', 'kla', 'asml', 'Hitachi High-Tech'] },
      { name: 'Overlay & OCD metrology', vendors: ['kla', 'asml', 'nova', 'onto'] },
      { name: 'Mask / reticle inspection', vendors: ['kla', 'Lasertec'] },
    ],
    edge: 'Buried 3D structures can’t be seen from the top, which drives X-ray, e-beam and machine-learning metrology.',
  },
  {
    id: 'packaging',
    step: 'Advanced packaging',
    segment: 'thermal',
    purpose: 'Connect dies with TSVs, micro-bumps, hybrid bonds and interposers.',
    tools: [
      { name: 'Wafer bonders (hybrid / fusion)', vendors: ['EV Group', 'tel', 'amat'] },
      { name: 'Grinding / thinning', vendors: ['Disco'] },
      { name: 'Packaging lithography & inspection', vendors: ['onto', 'Canon', 'kla'] },
    ],
    edge: 'AI packages such as CoWoS and HBM shift spending toward front-end-class tools in the back end.',
  },
];

/* ------------------------------------------------------------------ Glossary */

export const glossary: { term: string; def: string }[] = [
  {
    term: 'WFE',
    def: 'Wafer fab equipment: the tools used in front-end wafer processing. Excludes test, assembly and fab facilities.',
  },
  {
    term: 'EUV',
    def: 'Extreme ultraviolet lithography at 13.5 nm wavelength. It replaces multiple DUV patterning steps on critical layers.',
  },
  { term: 'High-NA EUV', def: 'EUV with 0.55 numerical aperture, for about 8 nm resolution. ASML’s EXE platform.' },
  { term: 'DUV / ArFi', def: 'Deep ultraviolet (193 nm) immersion lithography, the workhorse for most layers.' },
  { term: 'GAA', def: 'Gate-all-around transistor (nanosheet or RibbonFET). The gate wraps the channel on all sides.' },
  {
    term: 'BSPDN',
    def: 'Backside power delivery network. Moves power lines under the transistors, as in PowerVia and Super Power Rail.',
  },
  { term: 'HBM', def: 'High-bandwidth memory: DRAM dies stacked with TSVs next to an accelerator.' },
  { term: 'ALD', def: 'Atomic layer deposition: self-limiting deposition of a film one atomic layer at a time.' },
  { term: 'ALE', def: 'Atomic layer etch: the etch counterpart of ALD, removing material layer by layer.' },
  { term: 'CMP', def: 'Chemical mechanical planarization: polishing the wafer flat with slurry and pads.' },
  { term: 'CD', def: 'Critical dimension: the width of the smallest feature, measured by CD-SEM or OCD.' },
  { term: 'Overlay', def: 'How well one layer’s pattern aligns to the layer below, measured in nanometres.' },
  {
    term: 'Hybrid bonding',
    def: 'Direct copper-to-copper and oxide-to-oxide bonding of dies or wafers, without solder bumps.',
  },
  { term: 'CoWoS', def: 'TSMC’s Chip-on-Wafer-on-Substrate 2.5D packaging, used for most AI accelerators.' },
  { term: 'TSV', def: 'Through-silicon via: a vertical electrical connection through a thinned die.' },
  { term: 'WSPM', def: 'Wafer starts per month: the usual unit of fab capacity.' },
  { term: 'Capital intensity', def: 'Capex as a share of revenue. Usually 25–35% for leading-edge chipmakers.' },
  { term: 'Book-to-bill', def: 'Orders divided by shipments. Above 1 means demand is growing.' },
  {
    term: 'VEU',
    def: 'Validated end user: a US export authorization that lets approved fabs receive controlled items without individual licences.',
  },
  {
    term: 'FDPR',
    def: 'Foreign direct product rule: extends US controls to foreign-made items built with US technology.',
  },
];

/* ------------------------------------------------------------------ Sources */

export const sources = [
  {
    label: 'SEMI: worldwide semiconductor equipment market statistics and forecasts',
    url: 'https://www.semi.org/en/products-services/market-data',
  },
  { label: 'ASML annual reports', url: 'https://www.asml.com/en/investors/annual-report' },
  { label: 'Applied Materials investor relations', url: 'https://ir.appliedmaterials.com' },
  { label: 'Lam Research investor relations', url: 'https://investor.lamresearch.com' },
  { label: 'Tokyo Electron IR library', url: 'https://www.tel.com/ir/' },
  { label: 'KLA investor relations', url: 'https://ir.kla.com' },
  { label: 'US Bureau of Industry and Security (BIS)', url: 'https://www.bis.gov' },
  { label: 'European Chips Act', url: 'https://digital-strategy.ec.europa.eu/en/policies/european-chips-act' },
  { label: 'CHIPS for America (NIST)', url: 'https://www.nist.gov/chips' },
];

/* ------------------------------------------------------------------ Helpers */

export const vendorById = new Map(vendors.map((v) => [v.id, v]));
export const segmentById = new Map(segments.map((s) => [s.id, s]));

/** Display name for a vendor id, or the plain name when it isn't a tracked vendor. */
export const vendorName = (idOrName: string) => vendorById.get(idOrName)?.name ?? idOrName;

export const latestActual = annual.filter((p) => !p.estimate).at(-1)!;
export const segmentSize = (s: Segment) => (s.share / 100) * latestActual.value;
