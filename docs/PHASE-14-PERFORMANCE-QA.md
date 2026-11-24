# Phase 14 — Performance QA and bundle guardrails

## What changed

The project now includes `npm run check:bundle`, a dependency-free Node script that inspects the production `dist/assets` output. It fails the release check if:

- Any JavaScript chunk exceeds 700 KiB.
- Aggregate JavaScript exceeds 3 MiB.
- Aggregate CSS exceeds 350 KiB.
- No JavaScript output is present or the build output directory is missing.

These are initial guardrails, not claims about measured production performance. Revisit the limits after collecting a representative production build and real-device measurements.

## Run the checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run preview
```

Then inspect the preview in current Chromium, Firefox and Safari/WebKit where available. Check the dashboard and every lazy route, narrow mobile widths, keyboard-only navigation, reduced-motion mode, offline/online transitions, and a throttled network profile.

## Performance review checklist

- [ ] Record the largest JS chunk, aggregate JS and CSS sizes.
- [ ] Confirm route-level lazy loading remains active.
- [ ] Check for console errors and failed network requests.
- [ ] Verify the first meaningful dashboard render on a throttled connection.
- [ ] Verify navigation and interactive controls remain responsive on a mid-range mobile device.
- [ ] Check layout shift during route loading and image/media loading.
- [ ] Confirm reduced-motion settings suppress decorative animation.
- [ ] Compare results against a recorded baseline before raising budgets.

## Release gate

Phase 14 adds an automated size guard, but it is not a substitute for browser profiling or Core Web Vitals measurement. The npm install timeout observed in prior QA means typecheck, unit tests, production build and bundle measurements must still be run in a network-enabled checkout before release approval.
