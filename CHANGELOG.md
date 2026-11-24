# Changelog
## 4.0.0-rc.19 — final pre-release audit

- Fixed cross-realm request-header inspection in downloader and network tests while preserving the `Range` header assertions.
- Synchronized the visible app version and release documentation.
- Re-audited the single-root ZIP structure, static payload and GitHub Pages deployment gates.
- Full npm-based checks remain pending because dependency installation timed out in the packaging environment.

## 4.0.0-rc.18 — Packaging and test reliability

- Repacked the project with exactly one top-level `data-waster-4` folder in the ZIP.
- Kept the source subdirectories required by Vite, TypeScript, and GitHub Pages; flattening those would break imports and deployment.
- Made test header inspection independent of the runtime `Headers` implementation.
- Removed temporary downloader debug logging.


## 4.0.0-rc.17 — final release audit
- Fixed download progress over-counting when stream chunks exceed the remaining target or reservation.
- Hardened default base URL resolution outside the Vite runtime.
- Re-ran source syntax, import, and strict network/downloader core checks. Full dependency-backed checks remain a GitHub Actions release gate because npm installation timed out in the packaging environment.


## 4.0.0-rc.16 — final GitHub Pages upload preparation

- Removed the external Cloudflare speed-test dependency from the default download and benchmark paths.
- Added a 5 MiB same-origin static payload under `public/`; download, latency and benchmark requests use HTTP byte ranges against the GitHub Pages site.
- Made GitHub Pages the only documented hosting target and removed the optional external endpoint environment override.
- Added TypeScript, Vitest and bundle-budget gates to the GitHub Pages deployment workflow.
- Updated final upload instructions, release status and runtime requirements.


## 4.0.0-alpha.1 — Phase 1 foundation

- Created the React, Vite and TypeScript application foundation.
- Added static-host-compatible hash routing and relative asset paths.
- Added the shared app shell and initial navigation routes.
- Added theme preferences, reduced-motion preference and guarded local storage helpers.
- Added shared design tokens, responsive baseline styles, architecture notes and initial tests.
- Left the real downloader, full dashboard, analytics, games, community and OS features for their assigned phases.


## 4.0.0-alpha.2 — Phase 2 dashboard

- Replaced the foundation landing view with the Data Waster control-center dashboard.
- Added a responsive hero area with an animated idle reactor visual.
- Added current-session metric cards, an idle activity chart preview and a recent-sessions empty state.
- Added an interactive data-target selector; it is explicitly a preview until Phase 3 and does not start any transfer.
- Updated navigation, workspace status labels and phase documentation.
- Fixed the missing `Zap` icon import in the previous overview page.
- Kept the real download engine out of this release because its external transfer endpoint and CORS behavior need dedicated integration and testing.

## 4.0.0-alpha.3 — Phase 3 download engine

- Added a streaming download engine with byte accounting from response-body chunks.
- Added configurable target amounts (MB/GB/TB input), preset targets and a 10 GiB per-session limit.
- Added 1–4 bounded parallel streams, 5 MiB requests, limited retries and request timeouts.
- Added pause, resume, stop, automatic completion and cancellation on dashboard unmount.
- Added explicit real-data-use confirmation and endpoint/CORS guidance.
- Added live transfer metrics, progress, recent speed visualization and terminal session summaries in localStorage.
- Added configurable `VITE_DOWNLOAD_ENDPOINT` with the Cloudflare speed-test download endpoint as the default.
- Added download-engine tests and updated phase documentation.


## Phase 4 — Network Intelligence Laboratory

- Replaced the Phase 4 placeholder with a working network diagnostics workspace.
- Added browser network information using the Network Information API where available, plus online/offline event detection.
- Added 5-sample HTTP response-time testing, estimated jitter, min/max/average latency and a user-controlled 10-second stability monitor.
- Added opt-in public IP lookup through ipify, IPv4 DNS-over-HTTPS lookup through Google Public DNS, and CORS-dependent HTTP response-header inspection with best-effort CDN signature detection.
- Added a user-triggered 1 MiB download benchmark using the existing Cloudflare speed-test endpoint.
- Added a Performance Resource Timing snapshot grouped by host and a locally stored connection event log.
- Documented browser restrictions: HTTP RTT is not ICMP ping, browser code cannot inspect raw packets or reliably measure packet loss, and cross-origin headers/resource sizes may be hidden.
- Added helper tests for latency statistics, URL/domain validation, CDN signatures and resource-size aggregation.


## Phase 5 — Analytics and Personal Records

- Replaced the analytics placeholder with real reports based on saved local download session summaries.
- Added date-range filters (7, 30, 90 days and all time), total bytes/time, weighted average speed, peak speed, completed-session count and completion rate.
- Added a 14-day transfer activity chart and 12-week activity heatmap.
- Added personal bests for largest session, fastest average, longest session and highest peak speed.
- Added current-month and current-year wrapped summaries.
- Added searchable/status-filtered session archive, two-session comparison and summary-based session detail view.
- Added CSV and JSON exports and a clear-local-history action with confirmation.
- Added analytics helper tests and a session-history clearing test.


## 4.0.0-alpha.6 — Phase 6 Game Center & Rewards

- Replaced the Arcade placeholder with a working Game Center.
- Added a local player profile with XP, level progression, best scores and recent round history.
- Added Data Clicker, a timed 20-second click challenge with score-based XP.
- Added Signal Sprint, a reaction-time game with randomized signal timing and score-based XP.
- Added daily missions for playing a game, reaching a Data Clicker score and transferring real data through saved download sessions.
- Added milestone achievements based on actual arcade results and local download records, with one-time XP reward claims.
- Added profile and reward persistence through guarded localStorage helpers. No global leaderboard or account sync is implied.
- Added focused gamification tests and updated the phase tracker and documentation.


## 4.0.0-alpha.7 — Phase 7 Visual Effects & Customization

- Added a Visual Lab page with five one-click style presets and live component previews.
- Added five accent palettes with separate dark/light contrast values, applied through document-level design tokens.
- Added aurora, grid, starlight and plain background treatments.
- Added Clean, Matrix, Glitch and Nuclear ambient visual effect modes.
- Added a synthesized Web Audio soundboard with Soft UI, Arcade and Sci-fi preview tones, volume control and optional interface click sounds (off by default).
- Made Reduce Motion suppress decorative effects and made Compact Navigation apply an icon-only sidebar layout.
- Normalized legacy local settings so earlier Phase 1 preferences migrate with safe Phase 7 defaults.
- Added customization settings tests and updated the main navigation, workspace phase labels and documentation.

## 4.0.0-alpha.8 — Phase 8 Data Waster OS

- Added a dedicated full-screen desktop workspace route at `#/desktop`.
- Added a searchable application launcher and eight launchable app windows.
- Added draggable, resizable, minimizable, maximizable/restorable, focusable and closable windows.
- Added a bottom dock with app activity indicators and a return-to-dashboard action.
- Added local notification center with mark-read and clear actions.
- Added quick settings for theme, reduced motion, wallpaper, widgets and desktop icons.
- Added four desktop wallpapers and persisted desktop preferences.
- Added activity widgets based on existing saved download sessions and game profile data.
- Added keyboard shortcuts: Ctrl/Command + K for launcher and Escape to dismiss overlays.
- Added responsive desktop/mobile layout and viewport-aware window geometry.
- Documented browser sandbox limitations: this is a web desktop simulation, not a native OS.



## 4.0.0-alpha.9 — Phase 9 Community Workspace

- Added a Community workspace route with overview, profile, contacts, teams, challenges and leaderboard sections.
- Added local profile editing with handle validation, profile visibility preference, profile-card preview, JSON export and copy-summary action.
- Added a local contacts book with duplicate/self-contact protection and remove controls; no friend request is claimed or sent.
- Added local team-space creation and deletion, plus challenge/competition drafts with editable local status.
- Added personal standings derived from existing local XP, arcade and download-session records.
- Added an honest global leaderboard state that explains the missing shared backend instead of presenting fabricated live rankings.
- Added local activity feed and storage sanitization for all community records.
- Added a Community app shortcut to the Data Waster OS launcher and dock.
- Added community helper tests and backend integration/security setup notes.


## 4.0.0-alpha.10 — Phase 10 Advanced Tools & Developer Laboratory

- Added a Tools & Dev Lab route and navigation entries in the main sidebar and Data Waster OS launcher.
- Added data unit conversion and bandwidth-to-time estimates.
- Added locally persisted download reminders with due-state transitions and opt-in browser notifications. Reminders only run while the page is active; they never auto-start a download.
- Added a guarded browser-side HTTP API playground with HTTPS/localhost URL restrictions, CORS-only execution, omitted credentials, no referrer, timeout, request/response size caps, and no persistence of request inputs.
- Added browser performance/resource diagnostics, a local debug overlay, and JSON snapshot export/copy.
- Added a component preview area and design-system guidance.
- Added focused tests for calculations, scheduler validation and transitions, URL/header validation, and request body limits.
- Full Vite build and Vitest execution remain pending npm dependency installation in a network-enabled environment.


## 4.0.0-alpha.11 — Phase 11 Release Hardening

- Added a root React error boundary and accessible recovery screen with development-only local diagnostics.
- Split route pages into lazy-loaded chunks and added a screen-reader-friendly route fallback.
- Added keyboard skip controls for the main content and desktop workspace without changing HashRouter navigation.
- Added explicit focus visibility and route loading/recovery styles.
- Added a static Content Security Policy meta policy and a security/deployment release checklist.
- Hardened the download engine against oversized declared responses and endpoints that ignore the requested byte count; stream reads are cancelled after the reserved chunk is consumed, and unstreamable responses are not buffered.
- Removed the API playground's unbounded non-streaming response fallback.
- Added focused downloader regression tests for oversized streams and incorrect Content-Length declarations.
- Full dependency installation, project typecheck, Vitest and production build remain required before public launch.

## Phase 12 — Launch & Deployment Preparation

- Added About, Help Center and Privacy pages, linked from the workspace navigation.
- Added a GitHub Actions workflow to type-check/build and deploy the `dist/` artifact to GitHub Pages on pushes to `main`/`master` or manual dispatch.
- Added GitHub Pages setup, release notes, a privacy data map, and a final launch checklist.
- Updated application labels and package version to `4.0.0-rc.12`.
- This phase prepares the repository for deployment; it does not publish to a GitHub account or claim production readiness without the required build, test and browser checks.

## [4.0.0-rc.13] — Phase 13 QA & Release Hardening

- Added regression tests for About, Help Center, and Privacy page content and navigation.
- Added a QA report with explicit release gates and environment limitations.
- Advanced the release-candidate version to 4.0.0-rc.13.
- Full npm-based checks remain pending because dependency installation timed out in the build environment.

## 4.0.0-rc.14 — Phase 14 performance guardrails

- Added a production bundle-budget check for total JavaScript, individual JavaScript chunks and aggregate CSS output.
- Added the `npm run check:bundle` command so bundle regressions can be checked after every production build.
- Updated visible build labels and workspace status to Phase 14 / RC.14.
- Documented repeatable performance checks and release gates; measured build output still requires a successful dependency install and production build.

## 4.0.0-rc.15 — Phase 15

- Improved skip navigation with native in-page links.
- Added explicit workspace navigation landmark naming and hid decorative status indicators from assistive technology.
- Added sidebar accessibility regression tests and a manual accessibility QA checklist.
