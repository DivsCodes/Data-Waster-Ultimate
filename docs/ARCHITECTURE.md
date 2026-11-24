# Data Waster 4.0 — Architecture (Phases 1–8)

## Stack

- React 18 + TypeScript for the application and type-safe feature modules.
- Vite for local development and production builds.
- React Router with `HashRouter` so direct routes work on static hosting such as GitHub Pages without server rewrite rules.
- CSS custom properties for the design token system. This keeps the visual layer framework-independent and easy to evolve.
- Lucide React for a consistent icon set.
- Vitest + Testing Library for unit and component tests.

## Important project decisions

1. **Feature-first growth:** future work should live under `src/pages` and/or `src/features/<feature-name>` rather than accumulating in `App.tsx`.
2. **Shared UI:** reusable presentation components live in `src/components`.
3. **App-level state:** cross-application preferences belong in `src/app/providers`.
4. **Browser storage:** `src/lib/storage.ts` provides guarded JSON helpers; feature-specific storage keys must be versioned.
5. **Styling:** shared design tokens live in `src/styles/tokens.css`; global resets and responsive rules live in `src/styles/global.css`.
6. **Static-host compatibility:** Vite uses a relative `base` and the router uses hashes. This is intentional for the existing GitHub Pages project site.
7. **Honest transfer metrics:** the engine counts bytes read from response bodies. It does not count HTTP/TCP/IP overhead and the final delivered stream chunk can overshoot a target slightly.
8. **Explicit data-use consent:** a user must confirm real data consumption before starting. The per-session ceiling is 10 GiB; concurrent requests are capped at four.

## Feature modules

| Area | Responsibility | Roadmap phase |
| --- | --- | --- |
| `src/features/downloader` | Transfer lifecycle, endpoint configuration, streaming byte accounting, limits and cancellation | 3 |
| `src/features/sessions` | Local storage for terminal session summaries | 3 |
| `src/pages/LaboratoryPage.tsx` | Network diagnostics and benchmark tools | 4 |
| `src/pages/AnalyticsPage.tsx` | Session trends, exports and reports | 5 |
| `src/features/games` | Mini-games, rewards, XP and missions | 6 |
| `src/features/customization` | Visual modes, effects, avatars and widgets | 7 |
| `src/features/desktop-os` | Desktop preference normalization, window geometry and state helpers | 8 |
| `src/pages/DesktopPage.tsx` and `src/components/desktop` | Desktop workspace, app launcher and window manager UI | 8 |
| `src/features/community` | Accounts, profiles, teams and competitions | 9 |
| `src/features/tools` | Converters, calculators and developer utilities | 10 |

## Download engine behavior

- The default endpoint is the static `public/data-waster-payload.bin` asset served by this same GitHub Pages site. The downloader uses HTTP byte ranges; no external download host or backend is required.
- The static payload is fetched from the same origin using `Range: bytes=start-end`; it does not require a CORS exception or a separate endpoint.
- Requests are read as streams. The engine reserves the requested byte budget before creating parallel requests, and releases unused reservation bytes when a request completes or aborts.
- Pause, stop, target completion, and page unmount abort active fetches.
- Transient failures are retried a limited number of times; repeated failures produce a visible error instead of fake progress.
- The current per-session limit is 10 GiB, concurrency is limited to 1–4 streams, and requests are 5 MiB each.
- GitHub Pages is the only hosting target. Repeated transfers consume bandwidth from the Pages site, so the 10 GiB per-session cap should be treated as a deliberate upper bound rather than a recommendation.
- Browser background suspension and mobile OS lifecycle behavior mean that transfers are not guaranteed to continue when the tab is closed or suspended.

## Backend boundary

The application remains a static frontend and has no backend. Public accounts, synchronized leaderboards, teams and other trusted shared data will require a backend and server-side validation before those features are implemented.


## Network diagnostics (Phase 4)

Network tooling lives in `src/features/network/networkDiagnostics.ts` and is presented by `src/pages/LaboratoryPage.tsx`. The browser inspector uses the Network Information API opportunistically; HTTP latency is measured with tiny CORS-readable requests; DNS and public IP lookups use public HTTPS APIs only after user action; HTTP header inspection uses a HEAD request and can only read headers exposed through CORS. Resource traffic is a Performance Resource Timing snapshot, not a packet capture. The stability monitor is opt-in and probes every 10 seconds while enabled. Local event history is stored under `data-waster.network-events.v1`.


## Analytics and personal records (Phase 5)

Analytics calculations live in `src/features/analytics/analytics.ts` and are derived from the local session summary records. The UI supports date windows, daily and weekly aggregation, personal record selection, CSV/JSON export, two-record comparison and a summary-only session detail view. Session data remains local under the versioned `data-waster:sessions:v1` key; the analytics page does not claim cloud sync or a packet-level replay.


## Game Center and rewards (Phase 6)

The Arcade page is a self-contained game and rewards surface. `src/features/gamification/gamification.ts` owns profile validation, XP/level calculations, daily mission progress, achievement progress and guarded local persistence. Game components call `recordGameResult` only when a round finishes; mission and achievement rewards use unique claim keys to prevent repeat claims. The profile stores a capped recent-round list and best scores for each game.

The first two mini-games are Data Clicker (20-second click round) and Signal Sprint (randomized reaction test). Their gameplay is entirely local and does not request network data. Daily transfer missions and several achievements derive progress from the existing saved download session summaries. The current player profile is device-local; global rankings, accounts and cross-device sync belong to the later community/backend phase.


## Visual effects and customization (Phase 7)

The existing `ThemeProvider` remains the single source of truth for locally persisted application preferences. Its settings normalizer accepts legacy Phase 1 records, validates enum values and clamps sound volume. It applies the resolved theme, accent tokens, selected wallpaper, ambient effect and compact-navigation mode as data attributes on the document root. The visual effect layer is CSS-only, pointer-transparent and suppressed by the Reduce Motion preference.

The `features/customization` module contains pure preset/palette/normalization definitions and a small Web Audio preview utility. Sound previews are synthesized on user interaction. Optional interface click sounds are delegated from the provider only when the user enables them; preview controls opt out of the delegated click sound to prevent double playback. No audio files or network resources are involved.

## Data Waster OS (Phase 8)

`src/pages/DesktopPage.tsx` owns the desktop workspace composition and launcher/notification/control-center interactions. `src/components/desktop/DesktopWindow.tsx` owns pointer-driven window movement and resizing. Pure desktop preferences and geometry helpers live in `src/features/desktop-os/desktopState.ts`; the `data-waster:desktop-preferences:v1` record is separate from global theme settings. The app shell hides the normal sidebar/topbar only for the `#/desktop` route.

The desktop app windows are local workspace panels that summarize existing feature data or navigate to the full feature page. They do not duplicate the downloader or simulate a native operating system. Window geometry is kept in memory for the current desktop visit; wallpaper and desktop visibility preferences persist locally. Local Explorer is intentionally limited to Data Waster's own browser-storage summaries.



## Community workspace (Phase 9)

The `src/features/community` module owns versioned, sanitized local community records: profile, contacts, teams and challenge drafts. `CommunityPage` composes these records with the existing local game profile and download session summaries. This release is intentionally local-first: no public ranking, remote identity, invitation or multiplayer operation is faked.

A future online implementation must use a trusted hosted backend with authenticated users, database constraints, row-level security and server-validated leaderboard scores. The client must never be trusted to submit arbitrary XP totals or team rankings. See `docs/COMMUNITY-BACKEND.md` for the integration boundary and data-security requirements.


## Phase 10 tools module

`src/features/tools/tools.ts` contains framework-independent calculations, local reminder persistence/validation, API playground input validation and browser performance snapshot helpers. `src/pages/ToolsPage.tsx` is the UI entry point, mounted at `/tools` and reachable from the sidebar and desktop launcher.

The API playground is deliberately browser-only. It does not proxy requests or bypass CORS. It rejects non-HTTPS URLs except localhost HTTP, rejects userinfo in URLs, omits ambient credentials, enforces a 15-second timeout and caps request/response sizes. Do not add a server proxy or persist user-provided authorization headers without a separate security review.

Reminder scheduling is a foreground reminder feature. Browser background throttling means it cannot guarantee delivery after tab suspension or page closure, and it must not auto-start data transfers. A reliable background scheduler would require a separately designed service worker/push/backend workflow and explicit user opt-in.

Performance diagnostics only report values the browser exposes. In particular, device memory, connection hints, JS heap measurements and cross-origin resource timing may be absent or approximate.


## Phase 11 reliability and security layer

Page modules are loaded through React lazy route boundaries. A root error boundary prevents a render failure from leaving a blank application and provides a reload/dashboard recovery path. The static document applies a meta Content Security Policy; hosts that support response headers should add the stronger headers listed in `SECURITY-RELEASE-CHECKLIST.md`.

The downloader streams response bodies, checks a declared Content-Length against the worker reservation, cancels failed or overlong responses, and avoids ArrayBuffer fallback when streaming is unavailable. Browser stream chunks are the smallest unit the page can account for; a misbehaving endpoint may still deliver a final chunk larger than the requested remainder before cancellation. Use an endpoint you control that honors its `bytes` parameter.
