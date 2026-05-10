# Cleanup Plans — Index

Each plan is self-bootstrapping — open the one you want and the header tells you what it depends on. This file exists for the "where do I start?" question and to hold the global checklist.

| # | Plan | Depends on |
|---|---|---|
| 01 | [Dead code & asset cleanup](./01-dead-code-cleanup.md) | — |
| 02 | [Design system: spacing, type, mobile-first](./02-design-system.md) | 01 |
| 03 | [Image & loading performance (Cloudinary)](./03-image-performance.md) | 01 (parallel with 02) |
| 04 | [Componentization](./04-componentization.md) | 01, 02, 03 |

## Definition of done

After all four plans land:

- `npm run build` passes (it runs `astro check`, which type-checks `.astro`).
- No page has its own `<style>` block unless it has a page-specific reason; shared rules live in `global.css` or component styles.
- A single Tailwind theme defines the spacing scale, type scale, and color tokens used everywhere.
- Mobile is the base layout; `sm:`/`md:`/`lg:` are additive only. No `invisible w-0` hacks.
- All images are Cloudinary URLs threaded through a single `cld()` helper. `public/` contains only truly static files.
- LCP image has explicit dimensions, is preloaded, and is not lazy-loaded; everything else is.
- Repeated markup (champion entry, rule section, gallery tile) is a component.
