# Data Waster 4.0 — Final release candidate RC.19

## RC.19 final audit fixes

- Corrected transfer byte accounting so stream chunks and concurrent workers cannot push progress beyond the configured target.
- Made the default same-origin payload URL safe when inspected outside the Vite runtime.
- Made `npm run typecheck` explicitly check both the app and Vite configuration projects; the production build runs typecheck first.
- Full dependency-backed validation remains a required GitHub Actions gate.


- Hardened test-only request-header inspection to handle cross-realm `Headers` objects and plain header records without weakening assertions.
- Synchronized the app version label, package version, README and release notes at RC.19.

## What's included

- Dashboard and user-controlled streaming download engine.
- Network Intelligence Laboratory and browser diagnostics.
- Analytics, local session history, exports and personal records.
- Arcade mini-games, local XP, missions and achievements.
- Visual Lab themes, accents, backgrounds and optional synthesized sounds.
- Browser-based Data Waster OS workspace and window manager.
- Local-first Community workspace and personal drafts.
- Advanced utilities, reminder scheduler, API Playground and developer diagnostics.
- Error recovery, lazy route loading, keyboard skip/focus support, download/API response limits and release security guidance.
- About, Help Center and Privacy pages.
- GitHub Actions workflow for building and deploying to GitHub Pages.

## Important scope notes

- This is a web application, not a native operating system.
- Downloading depends on the same-origin GitHub Pages payload and HTTP byte-range support. It does not guarantee unattended/background transfers.
- Browser-based diagnostics are approximate and cannot perform raw ICMP tests.
- Community accounts, synchronized friends and global multiplayer are not active; the current workspace stores drafts locally.
- Local browser storage is not a secure vault and is not automatically synced between devices.

## Release status

This archive is a release-candidate source package. The GitHub Actions workflow is included, but it has not been run against the user's repository. Before public release, install dependencies and pass `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`, and the manual browser checks in `SECURITY-RELEASE-CHECKLIST.md`.


## RC.16 — final GitHub Pages upload candidate

This candidate removes the external Cloudflare speed-test endpoint from the default download path. The app and its 5 MiB binary payload are both deployed as static files on the same GitHub Pages site. The downloader and 1 MiB throughput benchmark request byte ranges from that payload. No separate hosting provider, worker or backend is part of the deployment architecture.

The GitHub Actions workflow now runs `npm run typecheck`, `npm test`, `npm run build` and `npm run check:bundle` before it uploads the Pages artifact. The deployment job runs only if all checks pass.

**Remaining release gate:** complete the first real GitHub Actions run and verify that the Pages host returns valid `206 Partial Content` responses for byte-range requests. Local npm installation timed out in the packaging environment, so a complete local project typecheck/test/build result is not available.
