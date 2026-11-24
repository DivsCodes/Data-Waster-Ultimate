# Phase 17 — final release audit and GitHub Pages readiness

## Hosting decision

GitHub Pages is the only hosting and deployment platform for Data Waster 4.0. The site and the download payload are built and deployed together from the repository. No Cloudflare Pages/Workers, Vercel, Netlify, Firebase Hosting, external download server, or backend is required.

## Same-origin download payload

- `public/data-waster-payload.bin` is a 5 MiB static binary copied into the production `dist/` folder by Vite.
- The downloader requests byte ranges from this file; it does not depend on a third-party speed-test endpoint.
- The network latency probe requests one byte, and the explicit throughput benchmark requests 1 MiB.
- The download engine caps each chunk at 5 MiB and keeps the existing 10 GiB per-session safety ceiling.
- The GitHub Pages host must return valid `206 Partial Content` responses to `Range` requests. Confirm this on the live URL after the first deployment.

See `docs/FINAL-QA-REPORT.md` for the exact checks completed in the packaging environment and the checks still required after upload.

## Automated deployment gates

The GitHub Actions workflow runs these steps before deployment. The bundle check also verifies the JavaScript/CSS budgets and confirms the 5 MiB payload was copied into `dist/`:

1. `npm install --no-audit --no-fund`
2. `npm run typecheck` (checks `tsconfig.app.json` and `tsconfig.node.json`)
3. `npm test`
4. `npm run build`
5. `npm run check:bundle`

If any step fails, the deploy job does not run. GitHub repository Pages settings must use **GitHub Actions** as the deployment source.

## Final upload checklist

- [ ] Upload the contents of the `data-waster-4` folder to the repository root.
- [ ] Keep `.github/workflows/deploy-pages.yml`, `public/data-waster-payload.bin`, `src/`, `package.json`, and the Vite/TypeScript config files.
- [ ] Push to `main` or `master`.
- [ ] In repository Settings → Pages, select **GitHub Actions**.
- [ ] Wait for all automated checks and the deploy job to pass.
- [ ] Open the published URL and verify that `data-waster-payload.bin` responds with `206 Partial Content` to a range request.
- [ ] Test dashboard navigation, downloads, pause/resume/stop, local history, mobile layout, keyboard navigation and reduced-motion mode.

## Important limits

GitHub Pages serves a static site, not a dynamic backend. The payload file is repeated for byte-range reads, and repeated data-wasting sessions consume the site's bandwidth. This design intentionally keeps hosting simple and within the GitHub Pages-only requirement; it does not promise unlimited throughput or uninterrupted background transfers.
