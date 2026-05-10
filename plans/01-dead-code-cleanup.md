# Plan 01 — Dead Code & Asset Cleanup

> **Start here.** First in the sequence — no prerequisites. Next: [02 — Design System](./02-design-system.md).

Strip everything that no markup references. Should be a single PR. No visible change to the rendered site.

## 1. Remove the copy/paste `<style>` blocks on pages

Every page has a `<style>` block of leftover classes from the Astro starter. None of them are used by the page's markup.

- `src/pages/index.astro:53-83` — delete the entire `<style>` block (`.astro-a`, `h1`, `.text-gradient`, `.link-card-grid`).
- `src/pages/champions.astro:62-94` — delete the entire `<style>` block. The `main { width: 800px; … }` overrides here, on `gallery`, and on `merch` should be replaced by a single rule in the layout (see Plan 02). Don't reintroduce them on individual pages.
- `src/pages/gallery.astro:32-89` — delete the entire `<style>` block.
- `src/pages/merch.astro:26-83` — delete the entire `<style>` block.
- `src/pages/rules.astro:85-90` — keep this for now (the `li` rule has a real effect: `max-width: 75vw`). Plan 02 replaces it with utility classes.

**Verify:** grep for each removed class name (`.astro-a`, `.text-gradient`, `.instructions`, `.link-card-grid`) afterward — should return zero hits.

## 2. Drop the `--accent-*` CSS variables and unreachable component styles

After step 1, the `--accent` / `--accent-light` / `--accent-dark` / `--accent-gradient` variables in `src/layouts/Layout.astro:44-54` are referenced only by:

- A commented-out hover rule in `src/components/Card.astro:41-47`.
- A `.link-card:is(:hover, :focus-within)` rule in `src/components/Nav.astro:49-55` whose selector matches nothing (the Nav has no `.link-card` element).

Action:

- Delete the `:root { --accent… }` block in `Layout.astro`.
- In `Card.astro`, delete the entire `<style>` block — `.link-card`, `.link-card > a`, `h2`, `p`, and the commented hover rule. The component will be restyled with utilities in Plan 04.
- In `Nav.astro`, delete the entire `<style>` block. None of its selectors match anything in the rendered Nav.

If you later want a brand color, define it as a `@theme` token in `src/styles/global.css` (see Plan 02), not a `:root` variable in the layout.

## 3. Fix the malformed Nav HTML while you're in there

`src/components/Nav.astro:9-18` has four `<a>` tags closed with `</span>`. Browsers recover, but it's invalid markup and confuses tooling. Replace each `</span>` with `</a>` and delete the trailing stray `</span>` on line 18.

The `currentPage` prop on `Nav` is also accepted but never used — remove it from `Props` and from the `Layout.astro:32` call site. Plan 02 reintroduces active-link styling using `Astro.url.pathname` instead, since that doesn't require the layout to thread the heading through.

## 4. Prune unused props on Card

`src/components/Card.astro:2-5` declares `icon` and `direction` props. Neither is read inside the component. `champions.astro:31,48` passes `direction="row"` but nothing consumes it. Remove the `Props` interface and the `direction` attributes at the call sites.

## 5. Delete unused public assets

Confirmed via grep — these files are not imported or referenced by any source file:

- `public/cross-shovels.png` (only `cross-shovels2.png` is used)
- `public/shovel-white.png`
- `public/shoveltoss.com.png` (only referenced by `README.md`; if you want it for the README, move it to a non-served path like `docs/` and update the README link)

In `public/images.json`, the `home` and `champions` arrays are not consumed by any page. Delete those keys; keep only `shop` and `gallery`. (Inline URLs in `index.astro` and `champions.astro` will be migrated to use `images.json` in Plan 04 if it's worth the indirection — for now, just remove the dead keys.)

## 6. Tidy boilerplate

- `src/pages/rules.astro:6-8` — remove the empty `interface Props {}` and `const {} = Astro.props;`.
- `src/layouts/Layout.astro:21` — `<meta name="description" content="Astro description" />` is a placeholder. Replace with real copy (e.g. "Shoveltoss — the shovel-based pastime. Rules, champions, and merch.") or delete.

## Verification

1. `npm run build` succeeds.
2. Visual smoke test: load `/`, `/rules`, `/champions`, `/gallery`, `/merch` in dev — should look unchanged.
3. View source on each page — no `<style>` block on `index`, `champions`, `gallery`, `merch`. Layout still injects a `<style is:global>` (until Plan 02 collapses it further).
4. `grep -r "astro-a\|text-gradient\|link-card-grid\|--accent" src` returns no hits.
