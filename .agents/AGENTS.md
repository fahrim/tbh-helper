# TBH Helper — Agent Guide

## Architecture

Tauri v2 app: **React + TypeScript** frontend (`src/`) + **Rust** backend (`src-tauri/`). Single app, no monorepo.

Frontend entry: `src/main.tsx` → `src/App.tsx`. Rust entry: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`.

## Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server on port **1420** (strict, fixed) |
| `npm run build` | `tsc && vite build` |
| `npm run tauri` | Tauri CLI passthrough |
| `npm run tauri dev` | Launch desktop app with hot-reload |
| `npm run tauri build` | Build production installer |

**Order**: For Tauri dev, Vite server (`npm run dev` / handled by Tauri's `beforeDevCommand`) must be running first.

## Key Tauri Backend Commands (Rust, invoked from JS via `@tauri-apps/api/core`)

- `decrypt_save_file` — reads + decrypts game save at `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`
- `start_save_watcher` — background Rust thread polls every 1.5s, emits `save_updated` event
- `fetch_url` — proxied HTTP(S) request with optional Steam cookies
- `get_steam_cookies` — extracts cookies from WebviewWindow (for Steam login)
- `install_update` — downloads GitHub release installer, spawns it, exits app
- `select_custom_save_file` — native file picker for `.es3` files via `rfd`
- Tray icon: left-click shows window; right-click menu has "Show App" / "Quit"

## Save File

Encrypted **EasySave3 (ES3)** format. Decryption:
- PBKDF2-SHA1, 100 iterations, 128-bit key
- AES-128-CBC, IV = first 16 bytes = salt
- Optional Gzip decompression (magic bytes `0x1f 0x8b`)
- Hardcoded password: `emuMqG3bLYJ938ZDCfieWJ` (in `src-tauri/src/lib.rs:69`)

## Frontend Conventions

- **State**: custom `useSaveData` hook (Zustand-like, manual with `useState`/`useEffect`/`useRef`)
- **Routing**: tab-based (`all`, `stash`, `inventory`, `equipped`, `market`, `analytics`, `wishlist`), no React Router
- **i18n**: `react-i18next` with `en`/`tr` locales in `src/locales/`. Language stored in `localStorage` key `tbh_language`
- **Persistence**: all user settings in `localStorage` — wishlist, Telegram config, refresh interval, price cache, portfolio history, close-to-tray, alert threshold
- **Game data**: `src/tbh_data.json` (English item DB), `src/tbh_data_tr.json` (Turkish names), `src/constants/item_gold_values.json`
- **Steam market hash name convention**: gear items use `"{Name} ({Grade}) A"`, materials use `"{Name}"`
- **TypeScript strict**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — all enforced

## Steam Login Flow

1. Opens a `WebviewWindow` to `https://steamcommunity.com/login/home/?goto=`
2. Polls `get_steam_cookies` command every 3s to detect `steamLoginSecure` cookie
3. On success, hides the login window; cookies stored in Rust global static for `fetch_url`

## Price Fetching

- `PriceManager` → `SteamMarketProvider` fetches via `invoke("fetch_url")` (Rust HTTP client `ureq`)
- Pages through Steam Market search results, emits progress via callback
- Prices cached in `localStorage` key `steam_prices_cache`, auto-refreshed on interval (min 10 min)
- Expired after 1 hour (prices with `updatedAt` older than 60 min are treated as null)

## File Watcher (Real-Time Sync)

Rust thread polls save file every 1500ms. On modification, decrypts and emits `save_updated` event to frontend.

## Tests, Lint, Format

**No test framework installed. No ESLint, Prettier, or formatter config.** TypeScript compilation (`tsc`) in build step is the only static check.

## UI Framework

- Plain CSS (no Tailwind, no CSS modules — `src/App.css`, `src/index.css`, `src/styles/`)
- `@tanstack/react-virtual` for virtualized item grids
- `@tauri-apps/plugin-notification` for desktop toasts
- Custom `GameTooltip` component for item hover tooltips

## Data Flow

Game save (ES3) → Rust decrypt → JSON string → Tauri event (`save_updated`) or `decrypt_save_file` return → Zustand-like state → memoized `parsedSave` → filtered/sorted by tab, search, grade, sort → rendered in `ItemsGrid` / `EquippedPanel` / `AnalyticsPanel` / etc.

## Git

- Do not commit or push unless explicitly requested.
