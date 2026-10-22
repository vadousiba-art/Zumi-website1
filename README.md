# Zommie — a quiet creature for loud days

Zommie is a small, luminous creature that lives in the browser. It breathes at about 5.5 breaths a minute, follows your cursor with its eyes, gets shy when you rush, and glows brighter the longer you hold still. The site is one long, scroll-driven experience built around it.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the build at http://localhost:4173
```

No environment variables, API keys or backend are needed. `dist/` is plain static files that any static host can serve (Netlify, Vercel, GitHub Pages, S3).

## What's inside

| Section | What it does |
| --- | --- |
| **Intro** | A ~3 s wake-up (glyph blinks, wordmark rises, curtain lifts). Any key or *Skip* ends it. It plays once per browser session and never under reduced motion. |
| **Hero** | A full-bleed WebGL creature. Its eyes track the pointer, fast movement makes it squint and blush, and stillness raises its glow. Click/tap or press Enter on it to boop. The *stillness / glow* readout shows live values. |
| **What it is** | The manifesto. Words light up as you scroll (scrubbed to scroll position). |
| **The ritual** | A sticky, four-phase story (Arrive, Settle, Sink, Return). Background colour, kanji, copy and the creature's shape/hue all blend with scroll, ending on a light "dawn" theme. |
| **Breathe** | A working breathing pacer with three patterns (Resonant 5.5·5.5, Box 4·4·4·4, Long exhale 4·7·8). The creature inflates and deflates with each breath, alongside a progress ring, spoken-style labels (aria-live) and optional tones. |
| **Grow your own** | Type a name and get a deterministic creature, then tune hue, size, wobble, calm, glow, eye spacing and lobes. *Copy link* encodes it in the URL (`#lab/...`) so anyone can open the same creature. *Save portrait* exports a 1080×1350 PNG. |
| **Field guide** | Eight specimens rendered from parameters through one shared offscreen WebGL context. On desktop the rail scrolls horizontally while pinned; on touch it uses native scroll-snap. *Adopt* loads a specimen into the lab. |
| **Promises** | Things it will never do, struck through with a hand-drawn line on reveal. |
| **Stay a while** | Pick 10/25/50 min and start a full-screen focus session: a timer with pause, +5 min, a progress bar and a countdown in the tab title. When it ends it plays a chime (if sound is on) and shows "Welcome back". Esc closes it. |
| **Footer** | Local time with a time-of-day line, section links, back to top. |

Sound is **off by default**. The nav toggle starts a synthesized Web Audio pad, plus boops, breath glides and a chime. Nothing is downloaded and nothing plays without a click.

## Stack

React 19 + TypeScript + Vite, GSAP/ScrollTrigger (reveals, scrubbed text, magnetic buttons, menu), a hand-written WebGL fragment shader (`src/lib/creature.ts`, no Three.js), Lucide icons, and self-hosted variable fonts (Fraunces with SOFT/WONK axes, Inter Tight, JetBrains Mono) via Fontsource. Styling is custom CSS with tokens in `src/styles/global.css`.

```
src/
  lib/        creature shader + renderer, seeding/encoding, audio engine, motion helpers, store
  components/ Creature (WebGL + behaviour), Nav/menu, Intro, Session, buttons & text reveals
  sections/   Hero, Manifesto, Ritual, Breathe, Lab, Specimens, Promises, Closing/Footer
scripts/      Playwright checks (screenshots + interaction tests)
```

## Accessibility and performance

- Respects `prefers-reduced-motion`: no intro, no pinning or scrubbing, a static ritual layout, and a much slower creature.
- Keyboard: skip link, visible focus rings, focus-trapped menu and session dialogs, Esc to close, and a focusable "Boop" button on each creature.
- Canvases render only while on screen and the tab is visible. Pixel count is capped per canvas, and the shader halo fades before the canvas edge.
- If WebGL is unavailable, the creature falls back to a CSS version and portrait export shows an error message.
- No layout-property animation: transforms, opacity, clip-path and shader uniforms only.

## Backend: what's real and what isn't

Everything works client-side and nothing is simulated. There are no accounts, storage servers, analytics or cookies. The only things persisted are a `sessionStorage` flag (intro seen) and whatever a visitor puts in a shared URL. Accounts or synced creatures would need real infrastructure, and none is implied.

## Tests

With the preview server running (`npm run build && npm run preview`):

```bash
CHROMIUM_PATH=/path/to/chromium npm run check:visual        # desktop + mobile screenshots, overflow + console check
CHROMIUM_PATH=/path/to/chromium npm run check:interactions  # drives every control end-to-end
```
