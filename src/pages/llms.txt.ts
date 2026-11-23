import { siteIndexText } from '~/utils/llms-site';

export const GET = async () =>
  new Response(await siteIndexText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
