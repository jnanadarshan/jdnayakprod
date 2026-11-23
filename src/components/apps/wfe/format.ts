import type { FabStatus } from '~/data/wfe';

export const usdB = (v: number) => `$${v >= 10 ? Math.round(v) : v.toFixed(1)}B`;
export const pct = (v: number, digits = 0) => `${v.toFixed(digits)}%`;
export const signedPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}%`;

export const statusStyle: Record<FabStatus, { cls: string; icon: string }> = {
  Operating: { cls: 'st-good', icon: 'tabler:circle-check' },
  Ramping: { cls: 'st-info', icon: 'tabler:trending-up' },
  Pilot: { cls: 'st-info', icon: 'tabler:flask' },
  Construction: { cls: 'st-warn', icon: 'tabler:crane' },
  Planned: { cls: 'st-muted', icon: 'tabler:calendar' },
  Delayed: { cls: 'st-warn', icon: 'tabler:clock-pause' },
  Cancelled: { cls: 'st-crit', icon: 'tabler:circle-x' },
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
