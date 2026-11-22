import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'AI × Semiconductor', href: getPermalink('/ai-semiconductor') },
    { text: 'Agentic AI', href: getPermalink('/agentic-ai') },
    { text: 'Projects', href: getPermalink('/projects') },
    { text: 'Demos', href: getPermalink('/demos') },
    {
      text: 'Beyond Work',
      links: [
        { text: 'Open Source', href: getPermalink('/open-source') },
        { text: 'Homelab', href: getPermalink('/homelab') },
        { text: 'DIY & Making', href: getPermalink('/diy') },
      ],
    },
    { text: 'Blog', href: getBlogPermalink() },
    { text: 'About', href: getPermalink('/about') },
  ],
  actions: [{ text: 'Contact', href: getPermalink('/contact') }],
};

export const footerData = {
  links: [
    {
      title: 'Work',
      links: [
        { text: 'AI × Semiconductor', href: getPermalink('/ai-semiconductor') },
        { text: 'Agentic AI', href: getPermalink('/agentic-ai') },
        { text: 'Projects', href: getPermalink('/projects') },
        { text: 'Demos', href: getPermalink('/demos') },
      ],
    },
    {
      title: 'Beyond Work',
      links: [
        { text: 'Open Source', href: getPermalink('/open-source') },
        { text: 'Homelab', href: getPermalink('/homelab') },
        { text: 'DIY & Making', href: getPermalink('/diy') },
      ],
    },
    {
      title: 'Site',
      links: [
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'About', href: getPermalink('/about') },
        { text: 'Contact', href: getPermalink('/contact') },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/jnanadarshan' },
  ],
  footNote: `
    © ${new Date().getFullYear()} Jnanadarshan Nayak. Views expressed here are my own and do not represent those of my employer or its clients. <br class="sm:hidden" /><a class="underline" href="/llms.txt">For LLMs and AI agents: read /llms.txt</a>
  `,
};
