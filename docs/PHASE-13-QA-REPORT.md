# Phase 13 — QA & Release Hardening

## Scope

Phase 13 adds focused regression coverage for the About, Help Center, and Privacy pages introduced in Phase 12. The tests assert key page headings, important capability/privacy disclosures, and internal navigation targets.

## Automated checks

| Check | Result | Notes |
|---|---|---|
| TypeScript/TSX syntax transpilation | Passed | 53 source files transpiled with zero syntax diagnostics, including the new regression test file. |
| Relative import resolution | Passed | Phase 12 static check found no unresolved relative imports. |
| npm dependency installation | Blocked | `npm install --no-audit --no-fund` timed out in this environment. |
| `npm run typecheck` | Not run | Dependencies could not be installed. |
| `npm test` | Not run | Dependencies could not be installed. |
| `npm run build` | Not run | Dependencies could not be installed. |
| Browser/manual QA | Pending | Requires a successful local install and running app. |

## Release gate

This release candidate is **not certified for production deployment** until the following commands complete successfully in a network-enabled environment:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run preview
```

Then verify the dashboard, About, Help Center, Privacy, navigation collapse/scroll behavior, and GitHub Pages deployment URL. Confirm that the same-origin GitHub Pages payload returns byte-range responses and that optional user-triggered diagnostics behave as documented.

## Phase 13 changes

- Added `src/pages/InfoPages.test.tsx` with regression tests for the three Phase 12 information pages.
- Advanced the package version to `4.0.0-rc.13`.
- Recorded the environment limitation explicitly rather than reporting unrun checks as passed.
