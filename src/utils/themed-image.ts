import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/*.svg', { eager: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** HTML for a light/dark pair of illustrations (`name-light.svg`, `name-dark.svg`), switched by the site theme. */
export function themedImage(name: string, alt: string): string {
  const light = files[`/src/assets/images/${name}-light.svg`]?.default;
  const dark = files[`/src/assets/images/${name}-dark.svg`]?.default;
  if (!light || !dark) return '';
  const img = (m: ImageMetadata, cls: string) =>
    `<img src="${m.src}" width="${m.width}" height="${m.height}" alt="${esc(alt)}" class="mx-auto w-full h-auto ${cls}" loading="lazy" />`;
  return img(light, 'dark:hidden') + img(dark, 'hidden dark:block');
}
