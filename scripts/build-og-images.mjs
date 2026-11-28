// Renders SVG post header images to PNG social cards (1200x630) for Open Graph / Twitter.
// LinkedIn, X and Facebook ignore SVG og:image, so each post whose `image:` is a local SVG
// gets a PNG twin at src/assets/images/og/<name>.png, picked up by adaptOpenGraphImages().
//
// Run locally after adding or changing a post header SVG, then commit the PNG:
//   npm run og-images              (all posts)
//   npm run og-images -- my-post   (only posts whose filename contains "my-post")
// Rendered on your machine on purpose: the build server may lack the fonts the SVGs use.
import { readdir, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POSTS = path.join(ROOT, 'src/content/post');
const IMAGES = path.join(ROOT, 'src/assets/images');
const OUT = path.join(IMAGES, 'og');
const W = 1200;
const H = 630;
const BG = '#ffffff';
const filters = process.argv.slice(2);

// librsvg (used by sharp) does not support CSS custom properties, so var(--x) colours render black.
// The header SVGs declare their light theme in the first `:root{...}` block and override it in a
// prefers-color-scheme:dark media query. Drop the dark block and inline the light values.
function inlineCssVars(svg) {
  const vars = {};
  const root = svg.match(/:root\s*\{([^}]*)\}/);
  for (const [, k, v] of (root?.[1] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) vars[k] = v.trim();
  return svg
    .replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (m, k, fb) => vars[k] ?? fb?.trim() ?? m);
}

const files = (await readdir(POSTS)).filter(
  (f) => /\.mdx?$/.test(f) && (!filters.length || filters.some((s) => f.includes(s)))
);
await mkdir(OUT, { recursive: true });

for (const file of files) {
  const src = await readFile(path.join(POSTS, file), 'utf8');
  const m = src.match(/^image:\s*['"]?~\/assets\/images\/([^'"\s]+)\.svg['"]?\s*$/m);
  if (!m) continue;
  const name = m[1];
  const svg = Buffer.from(inlineCssVars(await readFile(path.join(IMAGES, `${name}.svg`), 'utf8')));
  const art = await sharp(svg, { density: 220 })
    .resize(W - 60, H - 40, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .png()
    .toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${name}.png`));
  console.log(`og/${name}.png  <-  ${file}`);
}
