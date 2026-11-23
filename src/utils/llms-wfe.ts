/**
 * Builds the LLM-readable views of the WFE Intelligence Hub dataset:
 *   - wfeIndexText()  → /apps/wfe-intelligence-hub/llms.txt       (what the suite is, where its data lives)
 *   - wfeFullText()   → /apps/wfe-intelligence-hub/llms-full.txt  (the whole dataset as Markdown)
 *   - wfeJson()       → /apps/wfe-intelligence-hub/data.json       (the whole dataset as JSON)
 *
 * Everything is derived from src/data/wfe, the same modules the app renders from, so the human
 * and machine views cannot drift apart.
 */
import {
  meta,
  annual,
  regions,
  deviceMix,
  marketDrivers,
  segments,
  vendors,
  fabs,
  fabStatusOrder,
  roadmap,
  policy,
  process,
  glossary,
  sources,
  segmentById,
  vendorName,
  latestActual,
  segmentSize,
} from '~/data/wfe';
import { stages, crossProcess, columns, heatmap, chokepoints } from '~/data/wfe/presence';

export const SITE_URL = 'https://jdnayak.com';
export const WFE_BASE = `${SITE_URL}/apps/wfe-intelligence-hub`;
export const WFE_URLS = {
  app: WFE_BASE,
  llms: `${WFE_BASE}/llms.txt`,
  llmsFull: `${WFE_BASE}/llms-full.txt`,
  json: `${WFE_BASE}/data.json`,
};

const LEVEL_WORDS = {
  dom: 'Dominant (>40% share)',
  str: 'Strong (20-40%)',
  mod: 'Moderate (10-20%)',
  low: 'Present (<10%)',
  none: '-',
} as const;
const PILL_WORDS = { dom: 'dominant', str: 'strong', pres: 'present' } as const;

const seg = (id: string) => segmentById.get(id)?.name ?? id;
const cell = (s: string | number | undefined) =>
  String(s ?? '')
    .replace(/\|/g, '/')
    .replace(/\n/g, ' ');
const row = (...cols: (string | number | undefined)[]) => `| ${cols.map(cell).join(' | ')} |`;
const table = (head: string[], rows: (string | number | undefined)[][]) =>
  [row(...head), row(...head.map(() => '---')), ...rows.map((r) => row(...r))].join('\n');

const citation = `Cite as: "WFE Intelligence Hub, JD Nayak, ${WFE_BASE} (dataset reviewed ${meta.updated})".`;

/* ------------------------------------------------------------------ llms.txt (index) */

export function wfeIndexText(): string {
  return `# WFE Intelligence Hub

> A free, mobile-friendly web app and open dataset on the wafer fab equipment (WFE) industry: market size,
> equipment segments, vendors, fab construction, technology roadmap, export-control and subsidy policy, and
> which vendors dominate which process steps. Built and maintained by Jnanadarshan (JD) Nayak, https://jdnayak.com.

Dataset last reviewed: ${meta.updated}. Base year for market figures: ${meta.baseYear}.

**Read this before quoting numbers.** ${meta.disclaimer} All values are rounded approximations compiled from public sources
(SEMI statistics, company filings, government publications). They are not primary data, and they are an independent
personal project, not employer or client work. ${citation}

## Machine-readable data

- [Full dataset as Markdown](${WFE_URLS.llmsFull}): every table in one file. Best for reading or retrieval.
- [Full dataset as JSON](${WFE_URLS.json}): the same data with stable ids (vendor ids, segment ids, fab ids). Best for computation.

## What is in the dataset

- **Market:** global WFE spend ${annual[0].year}-${annual.at(-1)!.year} (USD billions; ${annual
    .filter((a) => a.estimate)
    .map((a) => a.year)
    .join(' and ')} are estimates), equipment billings by region, share by end device, and the demand drivers.
- **Segments (${segments.length}):** ${segments.map((s) => s.name).join(', ')}. Each has an approximate share of WFE, sub-segments, leaders and demand drivers.
- **Vendors (${vendors.length}):** ${vendors.map((v) => v.name).join(', ')}. Each has headquarters, ticker, latest fiscal-year revenue, China revenue share where known, focus segments and products.
- **Presence:** a vendor-by-process heatmap (${heatmap.length} vendors × ${columns.length} process areas), the front-end process flow with leading vendors per stage, and ${chokepoints.length} single-vendor chokepoints.
- **Fabs (${fabs.length}):** announced and operating fabs by company, site, region, node, status and target start.
- **Roadmap (${roadmap.length} items):** logic, DRAM, NAND, lithography and packaging milestones, with the segments each one benefits.
- **Policy (${policy.length} items):** export controls, subsidies and industrial policy, by date and region.
- **Process explorer (${process.length} steps):** front-end process steps with tool types and the vendors that supply them.
- **Glossary (${glossary.length} terms)** and **sources (${sources.length})**.

## Human-facing views

- [WFE Intelligence Hub](${WFE_URLS.app}): the interactive app (Overview, Presence, Market, Segments, Vendors, Fabs, Roadmap, Policy, Process explorer, About and sources).
- [All apps](${SITE_URL}/apps)

## Optional

- [Site profile for LLMs](${SITE_URL}/llms.txt): who built this, and how to describe him.
- [Contact](${SITE_URL}/contact)
`;
}

/* ------------------------------------------------------------------ llms-full.txt */

export function wfeFullText(): string {
  const out: string[] = [];
  const push = (...s: string[]) => out.push(...s);

  push(
    '# WFE Intelligence Hub: full dataset',
    '',
    `> Wafer fab equipment industry data, by Jnanadarshan (JD) Nayak. App: ${WFE_URLS.app}. Index: ${WFE_URLS.llms}. JSON: ${WFE_URLS.json}.`,
    '',
    `Dataset last reviewed: ${meta.updated}.`,
    '',
    `**${meta.disclaimer}** Values are rounded approximations from public sources. ${citation}`,
    '',
    '## Method and definitions',
    '',
    '- WFE means front-end wafer processing equipment. Test, assembly and fab facilities are excluded unless noted.',
    '- Regional figures are total semiconductor equipment billings by where tools ship, so they sum to more than WFE.',
    '- Vendor revenue is the latest full fiscal year, including services, converted to USD at period-average rates.',
    `- Segment sizes apply approximate shares to the latest actual WFE total (${latestActual.year}: USD ${latestActual.value}B).`,
    '- Fab status and timing follow company announcements and change often.',
    '- Ids in brackets, such as `[asml]` or `[etch]`, match the ids in data.json.',
    ''
  );

  push(
    '## Market',
    '',
    '### Global WFE spend, USD billions',
    '',
    table(
      ['Year', 'WFE spend (USD B)', 'Basis'],
      annual.map((a) => [a.year, a.value, a.estimate ? 'estimate' : 'actual'])
    ),
    '',
    '### Equipment billings by region, 2024, USD billions',
    '',
    table(
      ['Region', 'USD B'],
      regions.map((r) => [r.label, r.value])
    ),
    '',
    '### WFE share by end device, 2024',
    '',
    table(
      ['End device', 'Share %'],
      deviceMix.map((d) => [d.label, d.share])
    ),
    '',
    '### Demand drivers',
    '',
    ...marketDrivers.map((d) => `- **${d.title}.** ${d.body}`),
    ''
  );

  push('## Segments', '');
  for (const s of segments) {
    push(
      `### ${s.name} [${s.id}]`,
      '',
      `${s.summary}`,
      '',
      `- Share of WFE: about ${s.share}% (about USD ${segmentSize(s).toFixed(1)}B on ${latestActual.year} actuals)`,
      `- Sub-segments: ${s.subsegments.join('; ')}`,
      `- Leading vendors: ${s.leaders.map(vendorName).join(', ')}`,
      `- Demand drivers: ${s.drivers.join('; ')}`,
      ''
    );
  }

  push(
    '## Vendors',
    '',
    table(
      [
        'Vendor [id]',
        'HQ',
        'Region',
        'Ticker',
        'Fiscal year',
        'Revenue (USD B)',
        'China % of revenue',
        'Focus segments',
      ],
      vendors.map((v) => [
        `${v.name} [${v.id}]`,
        v.hq,
        v.region,
        v.ticker,
        v.fy,
        v.revenue,
        v.china ?? 'n/d',
        v.focus.map(seg).join(', '),
      ])
    ),
    '',
    '"n/d" means not disclosed or too uncertain to publish.',
    ''
  );
  for (const v of vendors) {
    push(
      `### ${v.name} [${v.id}]`,
      '',
      v.summary,
      '',
      `- Products: ${v.products.join('; ')}`,
      `- Investor site: ${v.site}`,
      ''
    );
  }

  push(
    '## Process presence',
    '',
    'Where each vendor is dominant along the front-end process flow. Qualitative and approximate.',
    ''
  );
  push('### Front-end process flow: leading vendors by stage', '');
  push(
    table(
      ['Stage', 'Description', 'Vendors (level)'],
      stages.map((s) => [s.name, s.sub, s.pills.map((p) => `${p.t} (${PILL_WORDS[p.level]})`).join(', ')])
    ),
    ''
  );
  push('### Cross-process and inline steps', '');
  push(
    table(
      ['Step', 'Description', 'Vendors (level)'],
      crossProcess.map((s) => [s.title, s.desc, s.pills.map((p) => `${p.t} (${PILL_WORDS[p.level]})`).join(', ')])
    ),
    ''
  );
  push(
    '### Vendor × process heatmap',
    '',
    `Levels: ${Object.entries(LEVEL_WORDS)
      .filter(([k]) => k !== 'none')
      .map(([, w]) => w)
      .join('; ')}. A dash means no meaningful presence.`,
    ''
  );
  push(
    table(
      ['Vendor', ...columns],
      heatmap.map((h) => [h.vendor, ...h.levels.map((l) => (l === 'none' ? '-' : LEVEL_WORDS[l].split(' ')[0]))])
    ),
    ''
  );
  push('### Critical chokepoints', '', ...chokepoints.map((c) => `- **${c.title}** (${c.pill}). ${c.desc}`), '');

  push('## Fabs', '', `Status values: ${fabStatusOrder.join(', ')}.`, '');
  push(
    table(
      ['Company', 'Site', 'Region', 'Kind', 'Node', 'Status', 'Start', 'Announced investment'],
      [...fabs]
        .sort((a, b) => fabStatusOrder.indexOf(a.status) - fabStatusOrder.indexOf(b.status))
        .map((f) => [f.company, f.site, f.region, f.kind, f.node, f.status, f.start, f.investment])
    ),
    ''
  );

  push('## Technology roadmap', '');
  for (const r of roadmap) {
    push(`- **${r.year} · ${r.area} · ${r.title}.** ${r.detail} Benefits: ${r.impact.map(seg).join(', ')}.`);
  }
  push('');

  push('## Policy', '');
  for (const p of [...policy].sort((a, b) => a.date.localeCompare(b.date))) {
    push(`- **${p.date} · ${p.region} · ${p.kind} · ${p.title}.** ${p.detail}`);
  }
  push('');

  push('## Process explorer', '');
  for (const p of process) {
    push(
      `### ${p.step} [${p.id}]`,
      '',
      `${p.purpose} Segment: ${seg(p.segment)}.`,
      '',
      ...p.tools.map((t) => `- ${t.name}: ${t.vendors.map(vendorName).join(', ')}`),
      '',
      `Why it matters at the leading edge: ${p.edge}`,
      ''
    );
  }

  push('## Glossary', '', ...glossary.map((g) => `- **${g.term}:** ${g.def}`), '');
  push('## Sources', '', ...sources.map((s) => `- [${s.label}](${s.url})`), '');

  return out.join('\n');
}

/* ------------------------------------------------------------------ data.json */

export function wfeJson() {
  return {
    name: 'WFE Intelligence Hub dataset',
    description:
      'Wafer fab equipment industry data: market, segments, vendors, process presence, fabs, roadmap and policy.',
    url: WFE_URLS.app,
    author: { name: 'Jnanadarshan Nayak', url: SITE_URL },
    updated: meta.updated,
    baseYear: meta.baseYear,
    disclaimer: meta.disclaimer,
    citation: citation.replace(/^Cite as: "/, '').replace(/"\.$/, ''),
    units: {
      currency: 'USD',
      market: 'billions (annual, region, vendor revenue)',
      share: 'percent',
      presenceLevels: { dom: '>40% share', str: '20-40%', mod: '10-20%', low: '<10%', pres: '<10%', none: 'none' },
    },
    related: { llms: WFE_URLS.llms, llmsFull: WFE_URLS.llmsFull, siteProfile: `${SITE_URL}/llms.txt` },
    market: { annual, regions, deviceMix, drivers: marketDrivers },
    segments: segments.map((s) => {
      const { icon, ...rest } = s;
      void icon; // UI-only field
      return { ...rest, sizeUsdB: Number(segmentSize(s).toFixed(1)) };
    }),
    vendors,
    presence: {
      stages,
      crossProcess,
      columns,
      heatmap: heatmap.map(({ vendor, levels }) => ({ vendor, levels })),
      chokepoints,
    },
    fabs,
    fabStatusOrder,
    roadmap,
    policy,
    process,
    glossary,
    sources,
  };
}
