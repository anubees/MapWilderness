# MapWilderness

Curated wilderness videos on an interactive map. Fully offline, installable, with favorites stored locally.

Built with TypeScript, esbuild, and zero runtime dependencies.

## Features

- **81 curated videos** across all 50 US states
- **Interactive map** — click states, explore wilderness markers, watch in-app
- **Real YouTube links** to wilderness hiking and backpacking content
- **Offline-first** — app shell cached via service worker
- **Installable** — add to home screen on mobile and desktop
- **Favorites** — saved in `localStorage`
- **Search & filters** — by title, creator, tags, difficulty, category, and state
- **30 themes** — preview via the header theme toggle

## Quick Start

```bash
npm install
npm run build
npm run serve
```

Open [http://localhost:8000](http://localhost:8000)

### Development

```bash
npm run dev      # Watch mode (rebuilds on save)
npm run serve    # Serve dist/ on port 8000
```

## Project Structure

```
src/
├── app.ts              # Entry point + service worker registration
├── ui.ts               # UI renderer
├── map.ts              # Leaflet map + state boundaries
├── data.ts             # Catalog filter/search layer
├── catalog/            # Video catalog loader
├── geo/                # Map regions (US today; extensible)
├── videos.catalog.json # Wilderness video source of truth
├── types.ts            # TypeScript interfaces
├── service-worker.ts   # Cache strategy
├── index.html
├── manifest.json
├── styles.css
└── assets/icons/
dist/                   # Build output (generated)
```

## Testing the PWA

1. Run `npm run build && npm run serve`
2. Open DevTools → Application → Service Workers
3. Toggle **Offline** and reload — the app shell should still load
4. Use Chrome/Edge **Install** prompt to add to home screen

## Deploy

Build with `npm run build`, then deploy the `dist/` folder to any static host (Netlify, GitHub Pages, Cloudflare Pages, etc.).

Serve over HTTPS for full PWA install support.
