# Data Waster 4.0 — GitHub Pages deployment

The project is configured for a repository/project GitHub Pages site and uses `HashRouter`, so application routes stay after `#` and do not require server-side rewrite rules. The app and its static download payload are both hosted by GitHub Pages; this is the only supported hosting target.

## One-time repository setup

1. Create or open the GitHub repository that will contain this project.
2. Upload the **contents** of the `data-waster-4` folder to the repository root (keep `.github/`, `public/`, `src/`, `index.html`, `package.json` and the config files).
3. Push the files to the `main` or `master` branch.
4. In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
5. Open the repository's **Actions** tab. The `Build and deploy Data Waster 4.0` workflow should install dependencies, type-check/build, and deploy `dist/`.
6. When the deployment job succeeds, open the Pages URL shown by the workflow environment.

The included workflow runs on pushes to `main` or `master` and can also be started manually from Actions. It requires GitHub Actions to be enabled and the repository's Pages settings to allow Actions deployments.

## Local release verification

Use Node.js 22 (or a supported current LTS) and npm:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run preview
```

Open the preview URL and manually complete the checklist in `SECURITY-RELEASE-CHECKLIST.md`. The workflow runs TypeScript, Vitest, the production build and bundle-budget checks before deployment. A successful workflow is the deployment gate; do not publish a manually copied development folder.

## Hosting scope

GitHub Pages is the only hosting target. The app and its 5 MiB download payload are both served from the same Pages site. No external hosting provider, Cloudflare Worker, or separate download backend is required.

## Custom domain

A custom domain is optional. Configure it in GitHub Pages settings and follow GitHub's current DNS and HTTPS instructions. Do not add a `CNAME` file unless you have selected and configured a domain you control.

## Rollback

If a deployment introduces a regression, revert the offending commit and push again. The workflow will rebuild and redeploy the reverted source. Keep a copy of the last known-good release ZIP and do not delete exported user data during a rollback.
