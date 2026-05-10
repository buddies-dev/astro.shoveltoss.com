# Plan 02 — Design System: Spacing, Type, Mobile-First

> **Prereq:** [01 — Dead Code Cleanup](./01-dead-code-cleanup.md) merged. Can run in parallel with [03 — Image Performance](./03-image-performance.md). Next: [04 — Componentization](./04-componentization.md).

After Plan 01 lands, the site has consistent *absence* of leftover CSS. This plan introduces a small, explicit design system and rewrites every page against it.

## Why this plan exists

Current state, from auditing the markup:

- **Inconsistent type sizes.** `text-sm sm:text-base` is the most common pattern, but pages also use `text-lg`, `text-xl`, `text-md` (note: `text-md` is *not* a default Tailwind class — it silently has no effect), and `text-3xl sm:text-[4rem]` for the page title. There's no rhythm.
- **Inconsistent spacing.** Gaps and padding are scattered across `gap-1`, `gap-2`, `gap-4`, `gap-8`, `gap-20`, `p-2`, `p-4`, `pl-8`, `pl-10`, `pt-10`, `m-1`, `m-4`. No system.
- **Mobile-first violations.** `invisible w-0 sm:visible sm:w-auto` (e.g. `index.astro:17`, `rules.astro:25`) keeps elements in flow at zero width on mobile — should be `hidden sm:block`. `sm:invisible sm:w-0` for desktop-hidden should be `sm:hidden`. `rules.astro:13` uses `flex flex-row sm:gap-20` which forces a row on mobile and renders an invisible image *still in flow*.
- **Layout shift on the hero.** The two GIFs on the homepage are `<img>` with no width/height and no aspect-ratio — they cause CLS during load.
- **Page-width drift.** `champions`, `gallery`, `merch` each had their own `main { width: 800px; }` override. Index didn't. Plan 01 deleted them all; we need one canonical rule.

## 1. Define tokens in `global.css`

Tailwind v4 takes its design tokens from `@theme` directives, not a JS config. Replace `src/styles/global.css` with:

```css
@import "tailwindcss";

@theme {
  /* Type scale — pick 5 sizes, use only these */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;     /* page heading desktop */
  --text-3xl: 4rem;       /* hero only, if at all */

  /* Brand */
  --color-bg: #0f1115;
  --color-surface: #1a1d23;
  --color-fg: #f5f5f7;
  --color-fg-muted: #a1a1aa;
  --color-accent: #c084fc;
}

:root {
  background: var(--color-bg);
  color: var(--color-fg);
  color-scheme: dark;
}

html { font-family: ui-sans-serif, system-ui, sans-serif; }
body { min-height: 100dvh; }
```

Notes:
- Drop the `font-size: 20px` on `html` that Layout.astro currently sets — it fights every Tailwind size class. Use `text-base` for body copy instead.
- `min-height: 100dvh` on `body` plus `flex flex-col` makes the footer stick to the bottom on short pages (currently it doesn't).
- The accent color is intentionally simpler than the four-variable gradient that was deleted in Plan 01. Reintroduce a gradient only if a real design calls for it.

**Spacing scale:** keep Tailwind's default `0.25rem` step. The discipline is in *which* steps you use, not redefining them. Allow only: `1, 2, 3, 4, 6, 8, 12, 16` for `p-`/`m-`/`gap-`. Anything else needs a reason in code review.

## 2. Layout rules

Edit `src/layouts/Layout.astro`:

- Delete the `<style is:global>` block entirely. Move what survives into `global.css` (the `code` font-family is already covered by Tailwind's `font-mono`; the `main` override is replaced below).
- Body becomes `class="flex min-h-dvh flex-col bg-[--color-bg] text-[--color-fg]"`.
- Wrap `<slot />` in a centered container: `<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">`. `max-w-3xl` (48rem / 768px) replaces the old `width: 800px`.
- Header: stop letting the heading dominate vertical space on mobile. The current header takes ~30% of the mobile viewport before any content shows. New rules:
  - `<header>` becomes `class="flex flex-col items-center gap-2 px-4 py-3 sm:gap-4 sm:py-6"` — explicit gap between `<h1>` and `<Nav>` instead of the current implicit margin collapse.
  - `<h1>` becomes `class="text-2xl leading-tight sm:text-4xl"` — drops mobile from `text-3xl` to `text-2xl`, kills the `sm:text-[4rem]` arbitrary value, and `leading-tight` shaves another few px.
  - The header has no border or background — it should feel continuous with the page. Add `border-b border-white/5` only if the visual hierarchy reads ambiguously after the rest of Plan 02 lands.
- Drop the `<Image src={shovels}>` in the footer to a smaller `h-16 sm:h-20` and add `loading="lazy"`. (Plan 03 covers image specifics.)

## 3. Page-by-page rewrite

The shared rules: vertical rhythm uses `space-y-6` on the page root for sections, `space-y-3` within a section. Body copy is `text-base` everywhere (mobile-first), headings step up by one size on `sm:`. No `text-md`, no `sm:text-[4rem]`, no `gap-20`.

### `src/pages/index.astro`

- Replace the desktop/mobile sprite columns (`invisible w-0 sm:visible sm:w-auto` on lines 17–19, 32–34) with a single decorative strip rendered once and shown on `sm:` only via `hidden sm:flex`.
- Remove the duplicate mobile-only sprite row at lines 40–44. One decorative element per breakpoint, not three.
- Hero GIFs (lines 22–29): give explicit `width`/`height` (Cloudinary returns whatever size is requested; pick something like 240×240 each) so the browser can reserve space — see Plan 03.
- Body copy: `text-base text-[--color-fg-muted]`.
- **Add a "Play the game" promo block.** The Game link is being removed from the nav (see Nav.astro below) and gets prime real estate on the landing page instead. Place it after the hero, before the "Shoveltoss is a phenomena…" copy:

  ```astro
  <a
    href="https://shoveltoss.ing"
    target="_blank"
    rel="noopener noreferrer"
    class="group mx-auto flex w-full max-w-md items-center justify-between gap-4 rounded-lg bg-[--color-surface] px-5 py-4 ring-1 ring-white/10 transition hover:ring-[--color-accent]"
  >
    <div class="flex flex-col">
      <span class="text-lg font-semibold">Play Shoveltoss</span>
      <span class="text-sm text-[--color-fg-muted]">Try the browser game at shoveltoss.ing</span>
    </div>
    <span class="text-2xl transition group-hover:translate-x-0.5">🎮</span>
  </a>
  ```

  The shape (full-width tappable card, label + arrow/icon, hover state on the ring) makes it feel like a primary CTA without needing a heavier "button" component.

### `src/pages/rules.astro`

- The outer `flex flex-row sm:gap-20` (line 13) becomes `flex flex-col sm:flex-row sm:gap-12` so the layout stacks on mobile.
- The decorative golden-shovel image (line 25) becomes `hidden sm:block` instead of `invisible w-0 sm:visible sm:w-auto`.
- The bullets (lines 17–22) — drop the `text-sm sm:text-base` repeated on each `<li>`. Put `class="text-base"` on the `<ul>`. Also drop the inline `<style>` block; the `max-width: 75vw` on `li` was working around the missing column constraint — the new `max-w-3xl` main container covers it.
- The 8 rule sub-sections (lines 32–79) are repeated structure — Plan 04 extracts them as a `<RuleSection>` component. For now, just normalize the type sizes: heading `text-lg`, body `text-base text-[--color-fg-muted]`, gap `space-y-4`.

### `src/pages/champions.astro`

- Drop the leftover `flex flex-col lg:flex-col` (line 33) — that's a no-op.
- Image columns (lines 26–28, 36–39, 53–56): use `aspect-[4/3] overflow-hidden` instead of fixed `max-h-[285px]` so the layout works on every viewport. Plan 03 swaps these `<img>` for sized Cloudinary requests.
- Heading sizes: `text-lg` everywhere — already mostly consistent.
- Plan 04 turns each entry into `<ChampionCard>`.

### `src/pages/gallery.astro`

- The grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4` — mobile-first, no awkward `flex flex-wrap content-center md:grid lg:grid xl:grid` chain (which is what's there now and most of those classes are redundant).
- Each tile: `aspect-[4/3]` wrapper, image fills with `object-cover`. Removes the `lg:max-h-[185px]` clamp that only kicks in at one breakpoint.

### `src/pages/merch.astro`

- The implicit `<Layout>` slot needs a wrapper: `<div class="grid gap-6 sm:grid-cols-2">` so future merch additions tile cleanly.
- Drop `lg:max-w-[50vh]` (a viewport-height-based width is rarely what you want for a product image).

### `src/components/Nav.astro`

After Plan 01 fixed the malformed HTML, restyle the nav as a single horizontal bar with breathing room on mobile:

```astro
---
const links = [
  { href: '/',          label: 'Home' },
  { href: '/rules',     label: 'Rules' },
  { href: '/gallery',   label: 'Gallery' },
  { href: '/champions', label: 'Champions' },
  { href: '/merch',     label: 'Merch' },
];
---
<nav class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-base sm:gap-x-6">
  {links.map(({ href, label }) => (
    <a
      href={href}
      class:list={[
        "py-1 underline-offset-4 hover:underline",
        Astro.url.pathname === href && "underline"
      ]}
    >{label}</a>
  ))}
</nav>
```

Mobile spacing notes (the thing that prompted this change):
- `gap-x-5` (1.25rem) between links on mobile, bumped to `gap-x-6` on `sm:`. Current `gap-2`/`gap-4` is too cramped for tap targets.
- `gap-y-1` so wrapped links don't pile on top of each other.
- `py-1` on each `<a>` enlarges the tap target vertically without affecting visual layout — important for thumbs.
- The `text-sm sm:text-base` size step the current Nav uses is dropped: `text-base` everywhere is fine and easier to hit.

**Game link is removed.** It now lives as a CTA block on the landing page (see `index.astro` above) pointing at `https://shoveltoss.ing`. Reasons:
- Mixing internal routes with an external link in the same nav row created an awkward 6th item that wrapped on mobile and pulled focus from the actual site sections.
- The game is a feature worth promoting, not a footnote — landing-page CTA gets it more clicks.
- Active-link logic via `Astro.url.pathname` matches site routes only; the external URL never matched anything anyway.

A `links` array at the top of the component frontmatter is the source of truth — adding a route means editing one array. Plan 04 moves this array to `src/lib/nav.ts` so it can be shared with a footer-nav or sitemap if those ever exist. The `currentPage` prop is gone (Plan 01 removed it).

## Verification

1. `npm run build` passes.
2. DevTools at 375px width: every page is readable without horizontal scroll. No element is "invisible but taking space" — toggle "Show layout shifts" to confirm.
3. DevTools at 1280px: main content is centered, ~768px wide, with consistent left/right padding.
4. Search `src` for class names that shouldn't exist: `text-md` (invalid), `invisible w-0`, `sm:invisible`, `gap-20`. All should be zero hits.
5. Lighthouse mobile run on the homepage: CLS < 0.05 (currently the unsized GIFs are likely worse).
