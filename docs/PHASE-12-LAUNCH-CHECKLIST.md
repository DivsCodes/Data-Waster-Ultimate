# Phase 12 — launch and deployment checklist

## Included in this phase

- [x] About page
- [x] Help Center with practical troubleshooting
- [x] Privacy and data-use explanation
- [x] GitHub Actions Pages build/deploy workflow
- [x] GitHub Pages setup and rollback instructions
- [x] Release notes and local data map
- [x] Version label updated to `4.0.0-rc.12`

## Required before public launch

- [ ] Run `npm install` in a network-enabled environment.
- [ ] Run `npm run typecheck` and fix all errors.
- [ ] Run `npm test` and fix all failing tests.
- [ ] Run `npm run build` and inspect the generated `dist/` output.
- [ ] Run `npm run preview` and test all routes from the preview server.
- [ ] Push to the intended repository and confirm the GitHub Pages workflow succeeds.
- [ ] Test the deployed project URL under its repository subpath.
- [ ] Test that the same-origin GitHub Pages payload returns valid `206 Partial Content` responses for byte-range requests.
- [ ] Complete the keyboard, mobile, storage, privacy and CSP checks in `SECURITY-RELEASE-CHECKLIST.md`.
- [ ] Confirm the privacy text matches the GitHub Pages-only hosting setup and optional user-triggered diagnostics.
- [ ] Decide whether to keep the Community module local-only or deploy and security-review a real backend.

## Release decision

Do not call the project production-ready until every required item above has been checked by a real build and browser session. This ZIP contains the launch preparation and deployment automation; it does not deploy to the user's GitHub account by itself.
