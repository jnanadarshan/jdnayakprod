# jdnayak.com

Personal website of Jnanadarshan Nayak (JD Nayak), covering agentic AI for semiconductor manufacturing, software projects, open source, homelab and DIY making.

Built with [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/), starting from the MIT-licensed AstroWind theme (see `LICENSE.md`). Deployed on Netlify.

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Build the static site to `dist/` |
| `npm run check` | Type-check and lint |

## Structure

- `src/pages/` : site pages (home, AI × Semiconductor, Agentic AI, Projects, Open Source, Homelab, DIY, About, Contact)
- `src/content/post/` : blog posts in Markdown
- `src/navigation.ts` : header and footer links
- `src/config.yaml` : site name, SEO defaults and blog settings

The contact form is a Netlify Form, so no email address is published.
