# Data Waster 4.0 — Final Release Candidate (RC.19)

This ZIP contains the cumulative project through **Phase 17 (final release audit and bug fixes)**: the foundation, dashboard, streaming downloader, Network Intelligence Laboratory, Analytics and Personal Records, Game Center with local rewards, Visual Lab customization, browser-based Data Waster OS desktop workspace, the local-first Community workspace, the Advanced Tools & Developer Laboratory, Phase 11 release hardening, and Phase 12 launch/deployment preparation, Phase 13 QA/release hardening, and Phase 14 performance QA and bundle guardrails.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Run locally

1. Extract the ZIP.
2. Open a terminal in the `data-waster-4` project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite.

## Available commands

```bash
npm run dev        # local development server
npm run build      # type-check, then create production build in dist/
npm run preview    # preview production build locally
npm run typecheck  # TypeScript project check
npm test           # run unit tests
npm run check:bundle # verify built JavaScript/CSS size budgets
npm run test:watch # run tests in watch mode
```

## Download engine

The download engine uses a **5 MiB static binary payload included in `public/` and served by this same GitHub Pages site**. It requests byte ranges from that file, so the app does not depend on Cloudflare, a separate API host, a worker, or another hosting provider. The benchmark and latency probe also use this same-origin asset.

The current per-session maximum is **10 GB (10 × 1024³ bytes)**, with 1–4 parallel streams and a 5 MiB maximum request chunk. A confirmation checkbox is required before a transfer can start. The engine pauses or stops by aborting active requests, retries transient failures a limited number of times, and saves completed/stopped/error session summaries in localStorage.

The displayed MB/GB/TB units use base-1024 byte sizes. Browser-counted body bytes are not a wire-level ISP meter and exclude HTTP/TCP/IP overhead. The final received stream chunk is bounded by the selected target. Browser tabs may be throttled or suspended in the background; this is not a guaranteed unattended downloader.

**Hosting and bandwidth note:** GitHub Pages serves both the application and its payload. All hosting stays on GitHub Pages; there is no Cloudflare Pages/Workers, Vercel, Netlify, Firebase Hosting, or separate download backend. Repeated downloads consume bandwidth from your GitHub Pages site, so share the site responsibly and review GitHub Pages usage limits.

## Network laboratory limitations

- The response-time test measures an HTTP request round trip, not ICMP ping. Ordinary browser JavaScript cannot open raw sockets or reliably measure packet loss.
- Browser network hints (`navigator.connection`) are optional, approximate and unsupported in some browsers.
- Public IP lookup and DNS-over-HTTPS lookup are opt-in requests to ipify and Google Public DNS respectively. The page does not perform geolocation.
- HTTP header inspection depends on the target accepting `HEAD` and permitting CORS. Only headers exposed to browser JavaScript can be inspected; CDN identification is a best-effort hint.
- The traffic visualizer summarizes Performance Resource Timing entries for the current page. Cached and cross-origin resources can report zero transfer size unless timing access is allowed.
- The 1 MiB benchmark is explicitly user-triggered and reads a byte range from the same-origin GitHub Pages payload.
- The stability monitor is opt-in and performs one small HTTP probe every 10 seconds until stopped or the page is closed.


## Phase 4 validation notes

The new network helper module was compiled with strict TypeScript options and exercised with local mocked HTTP/DNS responses (including latency statistics, DNS/IP parsing, visible-header CDN hints, resource aggregation and the capped 1 MiB benchmark). All project TS/TSX source files passed a syntax-transpilation check, stylesheet parsing passed, and relative imports were checked. A full `npm run build` and the Vitest suite could not be run in the packaging environment because `npm install` timed out while accessing the npm package registry; run the commands above after installing dependencies locally. Live third-party endpoint availability and CORS behavior must also be verified from your own browser/network.

## Phase 5 validation notes

Analytics helper logic was checked with local sample records for totals, date filters, daily aggregation, heatmap construction, personal records and CSV escaping. TS/TSX source files were syntax-transpiled and relative imports were checked. A full `npm run build` and the Vitest suite could not be run in this packaging environment because `npm install` timed out while accessing the npm registry; run the commands above after installing dependencies locally.

## Phase 5 analytics

The analytics page uses the most recent 100 session summaries stored in this browser. It includes 7/30/90-day and all-time filters, totals, a 14-day data activity chart, 12-week heatmap, personal bests, month/year summaries, status and ID filters, two-session comparisons, summary-based session details, and CSV/JSON exports. Clearing history permanently removes these local session summaries. Session detail views are reconstructed from saved summaries; the downloader does not currently retain per-second replay samples.

Reports are local to the current browser profile. They are not synced between devices, and clearing browser storage can remove them. CSV and JSON exports include the currently selected date range.


## Phase 6 game center and rewards

The Arcade page now includes a local player profile with cumulative XP, levels and a level progress bar. Data Clicker is a 20-second click challenge; Signal Sprint is a reaction-time game with a random 1.4–3.6 second signal delay. Completed rounds are recorded locally and award XP based on the score.

Daily missions refresh using the browser's local calendar date: play one arcade game, score at least 25 in Data Clicker, and transfer 25 MiB in a saved download session. Mission rewards can be claimed once per mission per day. Achievement progress is derived from saved download records and game results; each achievement reward can be claimed once. Profile data and game history remain in localStorage on this device. No global leaderboard or account sync is claimed in this phase. The mini-games do not perform network requests or consume download data.

### Phase 6 validation notes

Gamification helper tests cover level thresholds, game result recording, duplicate reward prevention, daily mission progress, achievement unlocks and persisted-profile sanitization. The helper module was strict-TypeScript checked with a local Vite `ImportMeta` type stub. Full project typecheck, Vitest execution and production build remain pending because npm dependency installation timed out in the packaging environment. Run `npm install`, `npm run typecheck`, `npm test` and `npm run build` locally.

## GitHub Pages

The project is configured for repository subpaths:

- Vite uses `base: './'` for relative asset URLs.
- Routing uses URL hashes so static hosting does not need rewrite rules.

Build the site with `npm run build`, then publish the contents of `dist/` using your preferred GitHub Pages workflow.

## What's included

- React + Vite + TypeScript foundation and shared app shell.
- Responsive Data Waster control-center dashboard.
- Dark/light/system theme preference and reduced-motion setting.
- Real streaming download engine with custom target amount and MB/GB/TB entry units.
- 1–10 GiB per-session cap, 1–4 parallel streams and a fixed 5 MiB request chunk.
- Start, pause, resume, stop and automatic completion controls.
- Live transfer progress, recent speed estimate, peak speed, elapsed time and request count.
- Limited retries, timeout handling and clear endpoint errors.
- Local session history summaries for analytics and personal records.
- Network laboratory: browser connection hints, HTTP latency and jitter estimates, optional 10-second stability monitor, public IP lookup, DNS-over-HTTPS lookup, CORS-dependent header/CDN inspection, 1 MiB benchmark and page resource timing snapshot.
- Analytics center: date-range reporting, transfer trend chart, activity heatmap, personal records, monthly/yearly wrapped summaries, searchable session archive, two-session comparisons, saved-summary details, CSV/JSON export and local history clearing.
- Game center with local XP/levels, daily missions, claimable achievements, Data Clicker and Signal Sprint.
- Visual Lab with five style presets, five accent palettes, four ambient effect modes, four background styles, synthesized soundboard previews, optional UI click sounds, volume control and compact navigation.
- Data Waster OS browser workspace with app windows, app launcher, dock, move/resize/minimize/maximize controls, local notifications, quick settings and desktop wallpapers.
- Community workspace with local profile card, contact book, team-space drafts, challenge drafts, personal standings and activity feed; online synchronization is not connected.
- Advanced Tools & Dev Lab with data utilities, local download reminders, a guarded CORS API playground, browser performance/debug metrics and component previews.
- Unit tests for storage, download engine, network diagnostics, analytics, gamification, desktop window-state, community and Phase 10 tool helpers, plus Phase 11 stream-hardening checks.

## Phase 9 community workspace

The Community page is available at `#/community` and from the main sidebar and Data Waster OS launcher. It includes a local profile editor and profile card export, saved contacts, team-space drafts, challenge/competition drafts, personal standings and an activity feed based on local game and download history. Handles are validated and duplicate contacts are rejected.

**Important limitation:** this static-hosted release does not include authentication, server synchronization, sent friend requests, shared team membership, realtime chat or a global leaderboard. Profile visibility is a local preference only. Contacts, teams and challenges are private records in this browser, and the leaderboard section explicitly reports that no community backend is connected. See `docs/COMMUNITY-BACKEND.md` for the recommended secure hosted-backend architecture and setup requirements. Never put a service-role key or other secret in a `VITE_` client environment variable.

### Phase 9 validation notes

Community data helpers passed a strict TypeScript check and 19 focused runtime assertions covering handle validation, legacy/invalid-data sanitization, duplicate/self-contact prevention, profile updates, team creation, challenge validation and challenge-state updates. The Community page passed a strict TSX check using temporary local React/Lucide type shims; all 43 TS/TSX files passed syntax transpilation, relative import checks passed, and the stylesheet parsed successfully. The app still requires dependency installation before full project typecheck, Vitest execution and Vite production build can be verified.

## Phase 11 release hardening

- Added a root React error boundary with a local recovery screen and development-only console diagnostics; no error telemetry is sent.
- Added lazy-loaded route chunks and an accessible route-loading state to reduce the initial JavaScript payload.
- Added keyboard skip controls that focus the main landmark without mutating the HashRouter URL.
- Added visible keyboard focus styling and a desktop-workspace focus target.
- Added a restrictive static Content Security Policy meta policy and documented additional response headers for hosts that support them.
- Hardened download response handling by cancelling non-success responses, checking declared response lengths against reserved chunks, stopping stream reads when reservations are consumed, and refusing non-streaming response buffering.
- Hardened the API playground so browsers without readable response streams do not fall back to unbounded `response.text()` buffering.
- Added release/security guidance in `docs/SECURITY-RELEASE-CHECKLIST.md`.

### Phase 11 validation notes

Focused downloader regression tests were added for oversized response streams and incorrect Content-Length declarations, plus an API playground no-stream fallback test and an error-boundary rendering test. During packaging, 49 TS/TSX files passed TypeScript syntax transpilation, relative imports resolved, the main downloader/tools/storage modules passed strict TypeScript checking with a local Vite environment declaration, CSS parsed successfully, and two downloader runtime regression checks passed. A full `npm install` attempt timed out, so the complete project typecheck, Vitest suite and Vite production build remain unverified. Run the release checklist locally before publishing.

## Phase 12 — launch and deployment preparation

Added About, Help Center and Privacy pages, a GitHub Actions workflow for GitHub Pages, deployment instructions, release notes, a privacy data map and a final launch checklist. The workflow builds and deploys `dist/` when pushed to `main` or `master` (or manually dispatched), after `npm install` and `npm run build` succeed.

This archive is a **release candidate**, not a claim that the app is already deployed or production-verified. The workflow has not been run against your repository. It now runs typecheck, Vitest, production build and bundle-budget checks before deploying. Before public launch, follow `docs/PHASE-12-LAUNCH-CHECKLIST.md`, complete the security checks, and verify the live site under your GitHub Pages project URL.

### Phase 12 validation notes

The three new information pages were added as lazy-loaded routes and linked from the sidebar. The GitHub Pages Actions workflow, deployment guide, privacy data map, release notes and launch checklist are included. A complete dependency install, project typecheck, test suite and production build must still be run in a network-enabled environment before release.

## Release and deployment documents

- `docs/DEPLOYMENT.md` — repository setup, Pages configuration, build and rollback.
- `docs/RELEASE-NOTES.md` — release candidate scope and known boundaries.
- `docs/PRIVACY-DATA-MAP.md` — local data and user-triggered network request map.
- `docs/PHASE-12-LAUNCH-CHECKLIST.md` — required pre-release checks.
- `docs/PHASE-17-FINAL-RELEASE-AUDIT.md` — GitHub Pages-only final upload steps.
- `docs/FINAL-QA-REPORT.md` — completed checks and remaining release gates.
- `docs/SECURITY-RELEASE-CHECKLIST.md` — security, accessibility and browser verification.

## Reference

The original concept is based on Data Waster 3.0: https://divscodes.github.io/DataWaster/

See `docs/ARCHITECTURE.md` and `docs/PHASE-TRACKER.md` for project decisions and the roadmap.


## Phase 7 visual effects and customization

The Visual Lab is available from the main navigation at `#/customize`. Five presets apply coordinated accent, effect and background settings: Mint Matrix, Arctic Pulse, Violet Glitch, Nuclear Core and Rose Neon. Users can also choose five accent palettes, four background treatments (aurora, grid, starlight and plain), and four effect modes (clean, Matrix, Glitch and Nuclear). Effects are decorative and do not affect download behavior or consume network data.

The appearance layer updates document-level design tokens immediately and saves preferences in the existing local settings record. Legacy Phase 1 settings are normalized and receive safe Phase 7 defaults. Reduce Motion suppresses decorative animations regardless of the selected effect. Compact navigation now applies an icon-only sidebar on larger screens.

The soundboard uses Web Audio oscillators to synthesize short preview chimes (Soft UI, Arcade and Sci-fi); no sound files or third-party audio resources are downloaded. Interface click sounds are opt-in and off by default. Browser support and autoplay policies may prevent audio playback; the UI preview reports no false guarantee of sound where the AudioContext API is unavailable.

### Phase 7 validation notes

Added focused tests for legacy settings normalization, invalid option fallback, volume clamping, accent palettes and preset mappings. In this packaging environment, strict TypeScript checking of the pure customization/sound modules passed, seven runtime assertions passed, all 37 TS/TSX files passed syntax transpilation, relative imports resolved, and the full stylesheet parsed. Dependency installation timed out, so the complete Vite build, full project typecheck and Vitest runner were not run; run `npm install`, `npm run typecheck`, `npm test` and `npm run build` locally before publishing.

## Phase 8 — Data Waster OS

Open the browser-based desktop environment from the **Desktop OS** item in the main sidebar or directly at `#/desktop`. It switches to a full-screen workspace with a system bar, app shortcuts, activity widgets, an application dock, a searchable launcher (`Ctrl/⌘ + K`), a notification center, and quick settings.

Eight launchable app windows provide focused summaries or shortcuts for the dashboard, Network Lab, Analytics, Arcade, Visual Lab, Settings, Local Explorer, and Quick Help. Windows can be focused, moved by dragging their title bar, resized from the lower-right handle, minimized to the dock, maximized/restored, and closed. Window geometry is constrained to the desktop stage and adjusted when the viewport changes.

Desktop wallpaper, widget visibility and desktop icon visibility are stored locally under `data-waster:desktop-preferences:v1`. The main app preferences remain in the existing Phase 7 settings record. Session and game widgets read existing local session/profile records; they do not synthesize transfer or gameplay metrics. The browser connectivity badge uses `navigator.onLine` only and is not a speed test.

**Browser boundary:** Data Waster OS is a web-based desktop simulation, not a native operating system. Local Explorer shows Data Waster browser-storage categories only; it cannot browse computer files, manage processes, install apps, or change operating-system settings. Notifications are local interface messages, not push notifications.

### Phase 8 validation notes

The desktop preference/window-state module was compiled with strict TypeScript options and exercised with six local assertions covering preference normalization, window bounds, small-screen geometry, maximize/restore, focus and minimized-window restoration. All TS/TSX files passed syntax transpilation (the Vite environment declaration is intentionally excluded from emit), relative imports were checked, and the desktop stylesheet was parsed. A complete `npm run build` and Vitest suite could not be run because `npm install` timed out at the package registry in the packaging environment; run the documented commands locally after installing dependencies.



## Phase 10 advanced tools and developer laboratory

The Tools & Dev Lab is available from the main sidebar, the Data Waster OS launcher, and `#/tools` on GitHub Pages.

### Utilities
- Data unit converter using binary steps (1 KB = 1,024 bytes).
- Bandwidth calculator using decimal Mbps to estimate transfer time.
- Calculations run locally and do not start network transfers.

### Local download reminder scheduler
- Save up to 30 reminders with a title, target MB and local date/time.
- Reminders transition to “due” while the Tools page is open.
- Optional browser notifications require explicit permission.
- This is intentionally a reminder system, not a background downloader. Browsers may suspend inactive tabs, and reminders never start a download automatically.

### API playground
- Explicitly sends a request only after the user presses **Send request**.
- HTTPS endpoints are allowed; plain HTTP is limited to localhost development addresses.
- Credentials embedded in URLs are rejected. Fetch uses CORS mode, omits cookies/ambient credentials, does not send a referrer, and uses a 15-second timeout.
- Request bodies are capped at 32 KiB and responses are capped at 512 KiB.
- Headers must be entered as a JSON object. Request inputs and credentials are not persisted.
- The target server must permit browser CORS access. This is not a proxy and cannot bypass CORS, authentication or network restrictions.

### Performance profiler and debug panel
- Displays browser-exposed CPU/device-memory hints, connection hints, navigation timing, resource timing and an approximate localStorage footprint.
- Some values are unavailable or intentionally reduced by browsers, especially JS heap and cross-origin resource-transfer sizes.
- The debug panel is a local UI overlay. There is no telemetry collection or upload.
- Diagnostic snapshots can be exported as JSON or copied with browser clipboard permission.

### Component laboratory
- Interactive previews of common buttons, form controls and state labels.
- Notes for accessibility, feedback and honest capability labels.

### Phase 10 validation notes
- Added focused unit tests for conversion math, bandwidth estimates, reminder validation/transitions, safe playground URLs, JSON header validation and body limits.
- The full Vite build and Vitest suite must still be run after installing npm dependencies in a network-enabled environment. Browser API behavior (CORS, notifications, performance fields) must be checked in the actual target browser.


See `docs/SECURITY-RELEASE-CHECKLIST.md` for Phase 11 hardening decisions and the mandatory pre-release validation steps.


## Phase 13 — QA & release hardening

See [`docs/PHASE-13-QA-REPORT.md`](docs/PHASE-13-QA-REPORT.md) for regression coverage, validation status, and the remaining production release gates.


## Phase 14 — performance QA and bundle guardrails

Run `npm run build` followed by `npm run check:bundle` to enforce initial production asset budgets. See `docs/PHASE-14-PERFORMANCE-QA.md` for the browser profiling checklist and remaining release gates. The budgets are guardrails, not measured performance claims.

## Phase 15 — accessibility baseline

Phase 15 improves native skip navigation, names the workspace navigation landmark, hides decorative status indicators from assistive technology, and adds sidebar accessibility regression tests. See `docs/PHASE-15-ACCESSIBILITY-QA.md` for the manual keyboard, screen-reader, contrast, and release checks that remain required.


## Phase 17 — final release audit and GitHub Pages readiness

The final candidate keeps hosting and the download payload on GitHub Pages only. A 5 MiB static binary is served from `public/data-waster-payload.bin`; transfer, latency and benchmark requests use byte ranges against that same-origin file. The deployment workflow now blocks deployment unless TypeScript, Vitest, the production build and bundle-size checks pass. See `docs/DEPLOYMENT.md` and `docs/PHASE-17-FINAL-RELEASE-AUDIT.md`.
