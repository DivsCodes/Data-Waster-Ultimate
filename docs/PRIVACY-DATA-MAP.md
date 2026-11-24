# Privacy data map

This is a practical map of the current client-side app behavior, not legal advice or a substitute for reviewing external providers' policies.

| Data | Where it is stored | Shared automatically? |
|---|---|---|
| Theme, accessibility and visual settings | Browser localStorage | No |
| Download session summaries | Browser localStorage | No |
| Arcade XP, missions and results | Browser localStorage | No |
| Desktop preferences | Browser localStorage | No |
| Community profile, contacts, team and challenge drafts | Browser localStorage | No |
| Download reminder schedule | Browser localStorage | No |
| API Playground form values | Component memory while the page is open | No; the request is sent only when the user clicks Send |

## User-triggered network destinations

- The GitHub Pages site serves the static payload through byte-range requests during a started session.
- The network laboratory may contact a test target, ipify for public IP lookup, and Google Public DNS for DNS-over-HTTPS lookup when the user runs those actions.
- The API Playground sends the URL, method, headers and body the user submits to the chosen destination, subject to browser CORS and security restrictions.

External providers may process requests under their own policies. Data Waster does not control their logging, availability or retention.

## Clearing data

Use the app's available history/profile clearing controls where provided, or clear site data in the browser to remove local records. Export records first if you need a copy. Clearing site data can also reset preferences and progress.

Never store passwords, payment information, API secrets or other sensitive data in this app's local storage.
