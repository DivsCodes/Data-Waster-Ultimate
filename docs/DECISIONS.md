# Architecture decisions

## 001 — React, Vite and TypeScript

**Decision:** Use React 18, Vite and TypeScript.

**Reason:** The planned application has many interactive feature areas. A component-based architecture and static build output are a good fit for the existing GitHub Pages deployment path.

## 002 — Hash-based routing

**Decision:** Use React Router's `HashRouter`.

**Reason:** Static hosting does not guarantee SPA fallback rewrites. Hash routing allows routes to work under the existing GitHub Pages project URL.

## 003 — CSS variables instead of a utility CSS framework

**Decision:** Use plain CSS with shared custom-property tokens.

**Reason:** This gives the project a small styling foundation without locking the visual system to a particular utility framework. A later phase can add a styling system if it provides a clear benefit.

## 004 — No backend in Phase 1

**Decision:** Keep Phase 1 fully static.

**Reason:** Architecture, navigation, preferences and local setup can be completed without accounts or remote services. Backend requirements will be designed when community features are implemented.

## 005 — Streamed browser downloads with bounded targets

**Decision:** Use a browser `fetch()` stream reader against a configurable HTTPS endpoint, with a 10 GB (10 × 1024³ bytes) per-session cap, 1–4 bounded streams, request timeouts and explicit user consent.

**Reason:** This keeps the frontend compatible with GitHub Pages while allowing real response-body byte accounting and immediate abort controls. A 5 MiB static binary payload is served from the same GitHub Pages site and read using HTTP byte ranges. This avoids any separate hosting provider or download backend. The browser-visible response-body counter is not a wire-level ISP meter.
