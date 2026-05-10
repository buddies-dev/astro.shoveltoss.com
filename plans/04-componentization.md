# Plan 04 — Componentization

> **Prereq:** [01 — Dead Code Cleanup](./01-dead-code-cleanup.md), [02 — Design System](./02-design-system.md), and [03 — Image Performance](./03-image-performance.md) all merged. Last in the sequence.

After Plans 01–03, the markup is already cleaner and more uniform. This plan extracts the few patterns that earn their keep. The bar: a component is worth creating only if it (a) is used in two or more places, (b) has non-trivial structure, *and* (c) saves real lines or eliminates a real bug source. Three similar lines is not abstraction-worthy.

What I'm *not* extracting and why:

- **PageHeader** — already lives in `Layout.astro`. Pulling it out adds an indirection without a benefit; pages already pass `heading` and `title`.
- **Footer** — same. One usage, lives in the layout, fine.
- **Section / Container** — covered by the `max-w-3xl` rule in `Layout.astro` plus `space-y-*` utilities. A `<Section>` component would be a wrapper around `<div class="space-y-4">`. Not worth it.

## 1. `<RuleSection>` — clear win

`src/pages/rules.astro:32-79` has 8 near-identical blocks: a heading and a left-bordered paragraph. Extract:

```astro
---
// src/components/RuleSection.astro
interface Props { title: string; }
const { title } = Astro.props;
---
<div>
  <h3 class="text-lg">{title}</h3>
  <p class="border-l pl-3 text-base text-[--color-fg-muted]"><slot /></p>
</div>
```

Then `rules.astro` becomes:

```astro
<RuleSection title="Determine The Order">
  A game of rock-paper-scissors is held. The winner selects if they would like to go first or second.
</RuleSection>
```

Saves ~50 lines and makes the file readable as a list of rules instead of a wall of divs.

Also extract the "How to Win" bullet list as its own block — but don't make a component for it, it's used once. Just inline cleanly.

## 2. `<ChampionCard>` — clear win

`src/pages/champions.astro` has 6 entries in two shapes: text-only and text+image. Both are messy and inconsistent (one entry has stray `flex flex-col lg:flex-col`; image columns have different overflow/clamp rules). Replace both with one component:

```astro
---
// src/components/ChampionCard.astro
import { cld } from '../lib/cloudinary';
interface Props { year: number | string; name: string; titles: number; image?: string; }
const { year, name, titles, image } = Astro.props;
---
<article class="rounded-md bg-[--color-surface] ring-1 ring-white/10 overflow-hidden flex flex-col sm:flex-row">
  <div class="flex-1 p-4 space-y-2">
    <h2 class="text-lg font-semibold">{year} — {name} ({titles})</h2>
    <p class="text-base text-[--color-fg-muted]"><slot /></p>
  </div>
  {image && (
    <div class="sm:flex-1 aspect-[4/3] overflow-hidden">
      <img
        src={cld(image, { w: 600 })}
        srcset={`${cld(image, { w: 400 })} 400w, ${cld(image, { w: 800 })} 800w`}
        sizes="(min-width: 640px) 50vw, 100vw"
        alt={`${name} ${year}`} loading="lazy" decoding="async"
        width="600" height="450"
        class="h-full w-full object-cover"
      />
    </div>
  )}
</article>
```

Replaces both `<Card>` invocations and inlines the surface styling. Note: `<Card>` after Plan 01 strips its `<style>` block has nothing in it. **Delete `src/components/Card.astro` entirely** — `ChampionCard` is the only place it was meaningfully used.

## 3. `<GalleryTile>` — borderline, do it anyway

`gallery.astro` is already a `.map()`, so the markup repetition is just inside one expression. But the tile has enough going on (anchor wrapping, aspect ratio, srcset, lazy, dimensions) that putting it in a component keeps the page readable:

```astro
---
// src/components/GalleryTile.astro
import { cld } from '../lib/cloudinary';
interface Props { src: string; }
const { src } = Astro.props;
---
<a href={src} target="_blank" rel="noopener noreferrer" class="block aspect-[4/3] overflow-hidden rounded-md">
  <img
    src={cld(src, { w: 600 })}
    srcset={`${cld(src, { w: 400 })} 400w, ${cld(src, { w: 800 })} 800w, ${cld(src, { w: 1200 })} 1200w`}
    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
    alt="Gallery image" loading="lazy" decoding="async"
    width="600" height="450"
    class="h-full w-full object-cover transition-transform hover:scale-[1.02]"
  />
</a>
```

The page collapses to:

```astro
<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
  {gallery.map((src) => <GalleryTile {src} />)}
</div>
```

Same pattern can be reused in `merch.astro`. Whether you call it `<MerchTile>` or just reuse `<GalleryTile>` is a judgment call — the markup is identical, so reuse. Rename it to `<ImageTile>` if that feels right.

## 4. Centralize the nav link list

Plan 02 already restructured `Nav.astro` to map over a `links` array. Move the array to `src/lib/nav.ts` so a hypothetical sitemap or footer-nav can read from the same source:

```ts
// src/lib/nav.ts
export const navLinks = [
  { href: '/',          label: 'Home' },
  { href: '/rules',     label: 'Rules' },
  { href: '/gallery',   label: 'Gallery' },
  { href: '/champions', label: 'Champions' },
  { href: '/merch',     label: 'Merch' },
  { href: 'https://maxrickettsuy.github.io/shoveltoss-game/', label: 'Game 🔗', external: true },
] as const;
```

Tiny refactor, but it's the *only* file you touch when adding a route — a real friction point flagged in `CLAUDE.md`.

## 5. What to keep an eye on

- Don't extract a `<Heading>` component. Tailwind utilities + the type tokens from Plan 02 do the job. A wrapper that just sets `text-lg font-semibold` is overhead.
- Don't extract a generic `<Card>`. The deleted `Card.astro` was already too generic to add value — it was a styled `<div>`. The two real card-like things on this site (`ChampionCard`, gallery tiles) want different behavior, so extract them separately.
- Resist the urge to make a CMS layer for `images.json`, champions data, or rules text until there's a second consumer. For five hand-edited pages it's fine to keep data inline or in tiny JSON files.

## Verification

1. `npm run build` passes (`astro check` will catch a missing prop or wrong type on the new components).
2. Line count: `champions.astro` should drop from ~95 to ~30; `rules.astro` from ~90 to ~40.
3. The data passed to each component is plain serializable types — no closures, no functions. Easier to migrate to a content collection later if it becomes worthwhile.
4. `src/components/Card.astro` is deleted; nothing imports it (`grep -r "Card.astro\|from.*Card" src` returns zero).
