import { wfeIndexText } from '~/utils/llms-wfe';

export const GET = () => new Response(wfeIndexText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
