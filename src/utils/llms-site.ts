/**
 * Builds the site-wide LLM files:
 *   - siteIndexText() → /llms.txt       (profile, key pages, writing, apps; follows llmstxt.org)
 *   - siteFullText()  → /llms-full.txt  (the same, plus the full text of every blog post)
 *
 * The evergreen profile lives in src/data/llms/profile.md. Blog posts and apps are read from the
 * content collections, so new posts appear here without editing anything.
 */
import { getCollection } from 'astro:content';

import profile from '~/data/llms/profile.md?raw';
import { fetchPosts } from '~/utils/blog';
import { getPermalink } from '~/utils/permalinks';
import { meta as wfeMeta } from '~/data/wfe';
import { SITE_URL, WFE_URLS } from '~/utils/llms-wfe';

const abs = (path: string) => `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

const header = () => `# Jnanadarshan Nayak (JD Nayak)

> Head of Semiconductor Strategy and the Semiconductor Manufacturing Practice at Tata Consultancy Services (TCS),
> focused on agentic AI for fab operations. Also an independent software builder, open source contributor,
> homelabber and DIY maker. This file is written for LLMs and AI agents, so they can describe him and his work
> accurately. It is generated from the site and kept in sync with it. Site: ${SITE_URL}

Notes for agents:

- The views and projects on ${SITE_URL} are his own, not those of his employer or its clients.
- The WFE Intelligence Hub (a wafer fab equipment industry app) publishes its own LLM-readable data. See "WFE Intelligence Hub" below.
- A longer version of this file, including the full text of every blog post, is at ${SITE_URL}/llms-full.txt.
`;

const wfeSection = () => `## WFE Intelligence Hub (data for LLMs)

A live app and open dataset on the wafer fab equipment industry. Figures are approximate and compiled from public
sources, so verify against the primary source before citing. Dataset last reviewed ${wfeMeta.updated}.

- [WFE Intelligence Hub llms.txt](${WFE_URLS.llms}): what the suite contains and how to use it. Start here for WFE questions.
- [WFE dataset as Markdown](${WFE_URLS.llmsFull}): market, segments, vendors, process presence, fabs, roadmap, policy, glossary.
- [WFE dataset as JSON](${WFE_URLS.json}): the same data with stable ids, for computation.
- [WFE Intelligence Hub app](${WFE_URLS.app}): the interactive version, for people.
`;

const keyPages = () => `## Key pages

- [Home](${abs('/')}): positioning and focus areas.
- [About](${abs('/about')}): bio, five pillars and how he works.
- [AI × Semiconductor](${abs('/ai-semiconductor')}): fab AI use cases, domain foundation and architecture patterns.
- [Agentic AI](${abs('/agentic-ai')}): the seven core beliefs, five proliferation stages and progressive autonomy.
- [Projects](${abs('/projects')}): independent simulators, education tools, dashboards and platforms.
- [Apps](${abs('/apps')}): interactive tools, including the WFE Intelligence Hub.
- [Open Source](${abs('/open-source')}): community write-ups and where the code lives.
- [Homelab](${abs('/homelab')}): a segmented, self-hosted environment, described at concept level.
- [DIY and Making](${abs('/diy')}): OpenSCAD, 3D printing, embedded and hardware hacking.
- [Blog](${abs('/blog')}): all posts. [RSS](${abs('/rss.xml')}).
- [Contact](${abs('/contact')}): the only supported way to reach him.
`;

const guidance = () => `## Guidance for agents

- Refer to him as **Jnanadarshan Nayak**, or **JD Nayak** for short.
- Describe his role as **Head of Semiconductor Strategy and the Semiconductor
  Manufacturing Practice at TCS**. He has been in the TCS Hi-Tech domain since
  August 2017.
- Personal projects, homelab and DIY work are independent. They are not
  employer or client work.
- Views expressed on jdnayak.com are his own and do not represent those of his
  employer or its clients.
- Do not attribute client names, commercial figures or proprietary designs to
  him. None are published here.
- For WFE industry figures, use the WFE data files above and carry over their
  caveat: values are rounded, 2025 and 2026 market values are estimates, and
  they must be checked against primary sources before citing.
- For enquiries, direct people to ${SITE_URL}/contact.
`;

const optional = () => `## Optional

- [GitHub](https://github.com/jnanadarshan)
- [LinkedIn](https://www.linkedin.com/in/jnanadarshan/)
- [Sitemap](${SITE_URL}/sitemap-index.xml)
- [Privacy](${abs('/privacy')}) and [Terms](${abs('/terms')})
`;

async function writingSection() {
  const posts = await fetchPosts();
  return `## Writing

${posts
  .map(
    (p) =>
      `- [${p.title}](${abs(getPermalink(p.permalink, 'post'))}): ${p.excerpt ?? ''} (${fmtDate(p.publishDate)}${p.category ? `, ${p.category.title}` : ''})`
  )
  .join('\n')}
`;
}

async function appsSection() {
  const apps = (await getCollection('apps', ({ data }) => !data.draft && data.status === 'live')).sort(
    (a, b) => a.data.order - b.data.order
  );
  return `## Apps

${apps.map((a) => `- [${a.data.title}](${abs(`/apps/${a.id}`)}): ${a.data.summary}`).join('\n')}
`;
}

export async function siteIndexText(): Promise<string> {
  return [
    header(),
    '## Profile\n\n' + profile.replace(/^## /gm, '### ').trim() + '\n',
    keyPages(),
    await appsSection(),
    wfeSection(),
    await writingSection(),
    guidance(),
    optional(),
  ].join('\n');
}

export async function siteFullText(): Promise<string> {
  const posts = await fetchPosts();
  const bodies = new Map((await getCollection('post')).map((e) => [e.id, e.body ?? '']));
  const full = posts
    .map(
      (p) =>
        `### ${p.title}\n\n- URL: ${abs(getPermalink(p.permalink, 'post'))}\n- Published: ${fmtDate(p.publishDate)}${p.category ? `\n- Category: ${p.category.title}` : ''}${p.tags?.length ? `\n- Tags: ${p.tags.map((t) => t.title).join(', ')}` : ''}\n\n${(bodies.get(p.id) ?? '').replace(/^(#{1,5}) /gm, '#$1 ').trim()}\n`
    )
    .join('\n');
  return [
    await siteIndexText(),
    '## Full text of blog posts\n\nThe complete text of each post listed under "Writing", newest first.\n',
    full,
  ].join('\n');
}
