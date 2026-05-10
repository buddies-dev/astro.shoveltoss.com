# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Astro dev server.
- `npm run build` — runs `astro check` (type-check `.astro` files) then `astro build`. Use this to validate changes; there is no separate lint or test setup.
- `npm run preview` — serve the built `dist/` locally.

## Architecture

Static marketing site for shoveltoss.com built with **Astro 6 + Tailwind v4**, deployed to Netlify (`netlify.toml` pins `NODE_VERSION=22`, publishes `dist/`).

- Tailwind v4 is wired through Vite via `@tailwindcss/vite` in `astro.config.mjs` — there is no `tailwind.config.*` file. Global CSS lives in `src/styles/global.css` and is imported once from `src/layouts/Layout.astro`.
- All pages route through `src/layouts/Layout.astro`, which provides the `<head>`, header (`Nav`), `<main><slot /></main>`, footer, and the Umami analytics snippet. Pages must pass both `title` and `heading` props.
- View transitions are enabled site-wide via `<ClientRouter />` in the layout — keep client-side state aware of Astro's swap behavior when adding scripts.
- TypeScript path aliases (defined in `tsconfig.json`, extends `astro/tsconfigs/strict`):
  - `@public/*` → `public/*` (used to import images for `astro:assets` `<Image>`)
  - `@components/*` → `src/components/*`
  - `@layouts/*` → `src/layouts/*`
- Pages in `src/pages/` map to routes by filename. Adding a route also requires updating the link list in `src/components/Nav.astro` (it's not generated).
- Prefer `astro:assets` `<Image>` for local images under `public/`; remote images (Cloudinary) are used as plain `<img>`.
