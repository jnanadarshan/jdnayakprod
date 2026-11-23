import { wfeFullText } from '~/utils/llms-wfe';

export const GET = () => new Response(wfeFullText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
