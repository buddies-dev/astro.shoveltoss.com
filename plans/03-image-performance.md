# Plan 03 — Image & Loading Performance (Cloudinary-first)

> **Prereq:** [01 — Dead Code Cleanup](./01-dead-code-cleanup.md) merged. Can run in parallel with [02 — Design System](./02-design-system.md). Next: [04 — Componentization](./04-componentization.md).

You already have a Cloudinary account (`shoveltoss-com`) with most photos uploaded. This plan consolidates **all** image hosting on Cloudinary — the local PNG sprites move there too — so there is one optimization pipeline, one CDN, and one mental model. `public/` shrinks to truly static files (favicon, robots, etc.).

## What's actually slow right now

- **Local PNGs in `public/` are large for what they are:** `lucha.png` 234 KB, `shrek.png` 215 KB, `golden-shovel.png` 185 KB, `chuggo.png` 117 KB, `cross-shovels2.png` 74 KB. Plan 01 deletes the unused 1 MB `shoveltoss.com.png`. The rest are illustrations with flat color and should be ~10× smaller as AVIF/WebP at appropriate sizes.
- **Cloudinary URLs in `images.json`** request `f_auto` (good — auto AVIF/WebP) but no `q_auto`, no width sizing, no DPR handling. The browser downloads the full original for every tile.
- **Homepage GIFs** (`index.astro:22-29`) are plain `<img>` with no `width`/`height` and no aspect ratio. They cause layout shift and are the LCP candidate but get no preload. They're also GIFs, which is a 5–20× bandwidth penalty over MP4/WebM.
- **Mixed sourcing.** Some images live in `public/`, some on Cloudinary, some inline-URL'd in pages, some via `images.json`. Every page reasons about images differently.

## 1. Upload the local sprites to Cloudinary

In the Cloudinary dashboard, create a folder `shoveltoss.com/sprites/` and upload (drag-and-drop):

- `chuggo.png` → public_id `shoveltoss.com/sprites/chuggo`
- `shrek.png` → `shoveltoss.com/sprites/shrek`
- `lucha.png` → `shoveltoss.com/sprites/lucha`
- `golden-shovel.png` → `shoveltoss.com/sprites/golden-shovel`
- `cross-shovels2.png` → `shoveltoss.com/sprites/cross-shovels`

Once uploaded, **delete them from `public/`** (Plan 01 already deletes the truly unused ones; this finishes the job). After this, `public/` should contain only `favicon.svg` and `images.json` — and `images.json` itself becomes the only source of image references on the site.

Add the new sprite IDs to `public/images.json`:

```json
{
  "sprites": {
    "chuggo":        "https://res.cloudinary.com/shoveltoss-com/image/upload/shoveltoss.com/sprites/chuggo.png",
    "shrek":         "https://res.cloudinary.com/shoveltoss-com/image/upload/shoveltoss.com/sprites/shrek.png",
    "lucha":         "https://res.cloudinary.com/shoveltoss-com/image/upload/shoveltoss.com/sprites/lucha.png",
    "goldenShovel":  "https://res.cloudinary.com/shoveltoss-com/image/upload/shoveltoss.com/sprites/golden-shovel.png",
    "crossShovels":  "https://res.cloudinary.com/shoveltoss-com/image/upload/shoveltoss.com/sprites/cross-shovels.png"
  },
  "shop":    [ "..." ],
  "gallery": [ "..." ]
}
```

The `home` and `champions` keys that Plan 01 deletes stay deleted — pages will pull from `gallery`/`shop`/`sprites` only.

## 2. The single image helper

All image URLs on the site go through one builder. Create `src/lib/cloudinary.ts`:

```ts
type CldOpts = {
  w?: number;
  h?: number;
  q?: number | 'auto';
  c?: 'fill' | 'fit' | 'limit' | 'pad';
  ar?: string;          // aspect ratio, e.g. "4:3"
  format?: 'auto' | 'mp4' | 'webm' | 'jpg';
};

export function cld(url: string, opts: CldOpts = {}) {
  const { w, h, q = 'auto', c, ar, format = 'auto' } = opts;
  const params = [
    `f_${format}`,
    `q_${q}`,
    'dpr_auto',
    w && `w_${w}`,
    h && `h_${h}`,
    c && `c_${c}`,
    ar && `ar_${ar}`,
  ].filter(Boolean).join(',');
  return url.replace('/image/upload/', `/image/upload/${params}/`)
            .replace('/video/upload/', `/video/upload/${params}/`);
}

export function srcset(url: string, widths: number[], opts: Omit<CldOpts, 'w'> = {}) {
  return widths.map((w) => `${cld(url, { ...opts, w })} ${w}w`).join(', ');
}
```

That's it. No SDK, no `astro-cloudinary` integration — a five-page site doesn't need the dependency. Every `<img>` on the site uses `cld()` and `srcset()`.

## 3. Don't allowlist Cloudinary in `astro.config.mjs`

Resist the urge to add `image.remotePatterns: [{ hostname: 'res.cloudinary.com' }]` and use Astro's `<Image>` on remote URLs. That would double-process: Cloudinary returns an optimized image, then Astro/Sharp pulls it down at build, resizes it again, and serves a cached copy from Netlify. You get worse cache hit rates, slower builds, and you lose Cloudinary's per-request DPR/format negotiation.

Use plain `<img>` with `srcset`/`sizes`. Cloudinary is doing the optimization; let it.

## 4. Per-page changes

### `index.astro` — hero is the LCP

The two GIFs at lines 22–29 are the LCP candidate and the biggest CLS offender on the site.

**Replace GIFs with video.** Cloudinary stores GIFs as video resources too. Re-upload each as a video (or use the existing image with `.mp4` extension if it was uploaded as a video — check the dashboard). Then:

```astro
<video
  class="rounded-l-md"
  width="240" height="240"
  autoplay muted loop playsinline preload="metadata"
  poster={cld(homeGif1, { w: 240, ar: '1:1', c: 'fill' })}
>
  <source src={cld(homeGif1Video, { w: 480, format: 'webm' })} type="video/webm" />
  <source src={cld(homeGif1Video, { w: 480, format: 'mp4' })} type="video/mp4" />
</video>
```

Typical savings: 1 MB GIF → 50 KB MP4. Same visual, no CLS (explicit `width`/`height`).

If you want to keep them as GIFs for now, at minimum: explicit `width="240" height="240"`, `loading="eager"`, `fetchpriority="high"` on whichever is the visual centerpiece.

**Sprite columns.** The `chuggo`/`shrek`/`lucha` columns become:

```astro
<img
  src={cld(sprites.chuggo, { w: 120 })}
  srcset={srcset(sprites.chuggo, [120, 240, 360])}
  sizes="(min-width: 640px) 10vw, 0px"
  alt="Chuggo" loading="lazy" decoding="async"
  width="120" height="120"
  class="hidden sm:block h-auto w-auto"
/>
```

Plan 02's mobile-first rewrite already deletes the `invisible w-0 sm:visible` antipattern; this finishes by sizing the request to what's actually rendered.

### `gallery.astro`

Each tile:

```astro
<a href={image} target="_blank" rel="noopener noreferrer" class="block aspect-[4/3] overflow-hidden rounded-md">
  <img
    src={cld(image, { w: 600, c: 'fill', ar: '4:3' })}
    srcset={srcset(image, [400, 600, 800, 1200], { c: 'fill', ar: '4:3' })}
    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
    alt="Gallery image" loading="lazy" decoding="async"
    width="600" height="450"
    class="h-full w-full object-cover"
  />
</a>
```

Plan 04 extracts this as `<ImageTile>`.

### `merch.astro`

Same `<ImageTile>` component, larger sizes:

```astro
<img
  src={cld(image, { w: 800 })}
  srcset={srcset(image, [400, 800, 1200])}
  sizes="(min-width: 640px) 50vw, 100vw"
  alt="Merch" loading="lazy" decoding="async"
  width="800" height="800"
  class="rounded-md"
/>
```

### `champions.astro`

Image columns currently use `max-h-[285px] overflow-hidden`. Replace with `aspect-[4/3]` containers and Cloudinary-sized requests as above. Plan 04 wraps each entry in `<ChampionCard>` which encapsulates this.

### `Layout.astro` footer shovels

```astro
<img
  src={cld(sprites.crossShovels, { w: 120 })}
  srcset={srcset(sprites.crossShovels, [120, 240])}
  sizes="120px"
  width="120" height="120"
  alt="" loading="lazy" decoding="async"
  class="h-16 sm:h-20 w-auto"
/>
```

(Empty `alt` because it's decorative — screen readers should skip it.)

## 5. LCP preload

The homepage hero is the LCP. Add an optional `lcpImage` prop to `Layout.astro` and emit a preload conditionally:

```astro
{lcpImage && (
  <link
    rel="preload" as="image"
    href={lcpImage.src}
    imagesrcset={lcpImage.srcset}
    imagesizes={lcpImage.sizes}
    fetchpriority="high"
  />
)}
```

The homepage passes `lcpImage` pointing at the first hero asset. No other page needs to (rules/gallery/merch/champions don't have hero images).

## 6. Named transformations (do this once you have the basics working)

In the Cloudinary dashboard → Settings → Transformations, define named transformations so the recipes live in one place:

- `t_gallery` → `f_auto,q_auto,c_fill,ar_4:3,dpr_auto`
- `t_thumb` → `f_auto,q_auto,c_fill,ar_1:1,w_240,dpr_auto`
- `t_hero` → `f_auto,q_auto,c_fill,ar_1:1,w_480,dpr_auto`

Then `cld(url, { transformation: 't_gallery', w: 600 })`. You can change the recipe in the dashboard without touching code or rebuilding the site. Worth it once a recipe is used in 3+ places; not before.

## 7. Cloudinary tips to internalize

- **`f_auto,q_auto,dpr_auto` is the floor.** Never request a Cloudinary URL without all three. `f_auto` picks AVIF→WebP→JPEG by client support; `q_auto` tunes per-image; `dpr_auto` serves 2× to retina without bloating regular displays.
- **`c_fill,ar_4:3` over `w_600,h_450`.** Aspect-ratio + crop mode is more declarative and survives breakpoint changes.
- **Always pair `srcset` with `sizes`.** Without `sizes`, browsers assume `100vw` and pick the largest variant.
- **`width`/`height` HTML attributes are non-negotiable.** They're how the browser reserves space for CLS prevention; they're independent of CSS sizing.
- **One LCP image per page, eager + preloaded.** Everything else is `loading="lazy" decoding="async"`. Don't lazy-load the LCP — counterproductive.
- **`/public` is for files served verbatim** (favicon, robots, OG, sitemap). Anything an `<img>` references goes through Cloudinary.
- **GIFs are almost always wrong.** Cloudinary will return `f_auto` MP4/WebM from a video resource. Use it.

## Verification

1. `npm run build` passes. `dist/` should be noticeably smaller — no more 200+ KB PNGs being copied through.
2. `grep -r "/public/.*\.\(png\|jpg\|gif\)" src` returns zero hits. All image references are Cloudinary URLs threaded through `cld()`.
3. Lighthouse mobile on `/`: LCP under 2.0 s on a throttled connection, CLS < 0.05.
4. DevTools Network tab on `/gallery`: each tile downloads ~30–80 KB at the rendered size, AVIF if the browser supports it.
5. `public/` listing shows only `favicon.svg` and `images.json` (plus any robots/sitemap you add later).
