# Changelog

## [0.1.0] - 2026-06-29

### Added

- **Steam price fetch config**: all tunable parameters (`pageSize`, retries, delays) centralized in `src/services/price/config.ts`
- **Turkish agent guide**: `.agents/AGENTS_TR.md` with full Turkish translation of architecture and development documentation

### Changed

- **Page size 10 → 100**: reduces ~75 Steam Market pages to ~8 per full price fetch (configurable via `PriceFetchConfig.pageSize`)
- **Price fetch DRY refactor**: extracted `buildSearchUrl()`, `calcTotalPages()`, `calcCurrentPage()` helpers, removed duplicated pagination math
- **Price fetch completely hidden**: removed `show_steam_window` call — no more visible "Steam Market Sync" window during price refresh
- **AGENTS.md** rewritten with comprehensive project architecture, commands, and conventions

### Fixed

- **Misleading 429 log**: non-429 errors on Page 1 no longer log "Steam 429" or trigger unnecessary 60s backoff; only real 429 errors wait, others retry immediately
