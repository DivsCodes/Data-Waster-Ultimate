# Upload Data Waster 4.0 to GitHub

The ZIP is organized with one top-level `data-waster-4/` folder. GitHub repository uploads need the *contents* of that folder at the repository root; do not upload the ZIP as a website asset.

## Recommended: GitHub Codespaces (browser only)

1. Create or open the GitHub repository where the site will live.
2. Open the repository in **Codespaces**.
3. In the Codespaces terminal, upload this ZIP into the workspace using the file upload control, then run:

   ```bash
   unzip -o data-waster-4-final-release-rc19.zip
   cp -a data-waster-4/. .
   rm -rf data-waster-4
   npm install
   npm run typecheck
   npm test
   npm run build
   npm run check:bundle
   ```

   If the ZIP was uploaded under a different name or directory, adjust the `unzip` command accordingly. The `cp` command places the project files (including `.github/`) at the repository root.

4. If every check passes, commit and push:

   ```bash
   git add -A
   git commit -m "Prepare Data Waster 4.0 release"
   git push
   ```

5. In GitHub, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**. The included workflow builds, tests, checks bundle limits, and deploys the site.

## Important

- Do not put the `data-waster-4/` folder inside another nested project folder in the repository. `package.json`, `index.html`, `src/`, `public/`, and `.github/` belong at the repository root.
- Do not upload `node_modules/` or `dist/`; the workflow installs dependencies and builds `dist/` itself.
- This archive does not include a generated `package-lock.json`. The workflow currently uses `npm install`, so dependency versions are governed by the semver ranges in `package.json` until a lockfile is generated and committed.
- Do not announce the stable release until the GitHub Actions workflow passes and the deployed payload responds correctly to a byte-range request with HTTP 206.
