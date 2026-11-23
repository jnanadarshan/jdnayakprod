import { siteFullText } from '~/utils/llms-site';

export const GET = async () =>
  new Response(await siteFullText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
