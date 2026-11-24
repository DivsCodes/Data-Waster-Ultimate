# Phase 11 — Security, accessibility and release hardening

## Changes in this phase

- Added a root React error boundary with a local recovery path. Development diagnostics stay in the browser console; there is no telemetry upload.
- Added lazy route loading so large areas (Desktop OS, Arcade, Analytics, Community and Tools) are split into route chunks instead of being required in the initial bundle.
- Added keyboard skip controls that focus the page's main landmark without changing the HashRouter URL.
- Added a visible focus treatment for interactive controls and an accessible route-loading state.
- Added a restrictive Content Security Policy meta policy for the static site. It allows same-origin scripts, same-origin assets, inline styles required by the current React UI, HTTPS API requests, and localhost HTTP/WebSocket traffic for development. It blocks object embeds and frames.
- Hardened the download reader: it rejects a declared Content-Length larger than the reserved request, cancels non-success responses, stops reading after the request reservation is consumed, and refuses an unstreamable response rather than buffering an unbounded ArrayBuffer.
- Hardened the API playground fallback: if a browser does not expose a readable response stream, it reports that the body was not read instead of buffering an unbounded `response.text()` result.

## Browser and deployment security

The CSP in `index.html` is a meta-delivered policy suitable for static GitHub Pages. Meta CSP cannot provide every response-header control: `frame-ancestors`, HSTS and several other policies must be sent as HTTP response headers. GitHub Pages does not provide arbitrary custom response headers for project sites.

If deploying behind a host that supports response-header configuration, use an equivalent policy and add these headers:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*
```

Only enable HSTS at a production HTTPS hostname after confirming the entire hostname scope is HTTPS-only. Do not blindly add `includeSubDomains` or preload.

## Data and privacy boundaries

- Download sessions, settings, game progress, desktop preferences, community drafts and reminders are stored locally in the browser. They are not encrypted at rest and should not be treated as a secure vault.
- Do not store passwords, API secrets, payment data or other sensitive credentials in localStorage.
- The API playground is a user-triggered browser request tool, not a proxy. It omits cookies/ambient credentials, sends no referrer, is subject to CORS and browser private-network protections, and does not persist entered request data.
- Never put backend service-role keys or secrets in `VITE_` environment variables or the static client bundle.
- Public network diagnostic endpoints receive the request details described in the UI when a user explicitly runs a lookup or test.

## Manual release checklist

Run in a network-enabled environment with Node.js 20.19+ or 22.12+:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run preview
```

Then manually verify:

- Keyboard-only navigation, skip controls, focus visibility and dialogs.
- Reduced-motion setting and OS-level reduced-motion preference.
- Narrow mobile viewport, tablet and desktop layouts.
- Browser back/forward behavior with HashRouter and GitHub Pages project subpaths.
- Download start/pause/resume/stop, endpoint failures, slow responses and a server that ignores the requested byte count.
- API playground CORS errors, timeouts, redirects, large responses and forbidden browser headers.
- Storage-disabled/private-browsing behavior and full localStorage quota behavior.
- CSP console reports on both the development server and production preview.

## Known limits

This phase adds defensive client-side controls; it is not a substitute for a server-side security review. Static GitHub Pages cannot host the authenticated multiplayer backend. Browser APIs and cross-origin endpoint behavior vary by browser and hosting configuration. A full dependency install, test run and production build must be completed before a public release.
