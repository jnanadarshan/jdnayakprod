import { wfeJson } from '~/utils/llms-wfe';

export const GET = () =>
  new Response(JSON.stringify(wfeJson(), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
