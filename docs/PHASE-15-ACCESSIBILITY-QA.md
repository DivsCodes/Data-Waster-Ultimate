# Phase 15 — Accessibility baseline and navigation QA

## Implemented

- Converted the skip controls into native in-page links so keyboard and assistive-technology users get standard anchor behavior.
- Added an explicit accessible name to the workspace navigation landmark; resource navigation retains its own name.
- Marked decorative status dots as hidden from the accessibility tree.
- Added sidebar tests for landmark names and the accessible names of primary navigation links.
- Advanced the release candidate and visible build labels to RC.15.

## Manual verification still required

Automated DOM tests are a baseline, not a WCAG conformance claim. Before release:

1. Complete keyboard-only navigation through every route and interactive control.
2. Check visible focus, skip-link behavior, dialogs, desktop workspace focus handling, and focus restoration.
3. Run axe or an equivalent accessibility scanner against every route at desktop and mobile widths.
4. Verify text and control contrast in both themes.
5. Test representative flows with NVDA or VoiceOver and confirm reduced-motion behavior.

## Release status

The repository's dependency installation previously timed out. Run `npm install`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check:bundle` in a network-enabled environment. No automated test or production build result is claimed by this phase package unless those commands have been run successfully.
