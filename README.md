# tor2e-tracker
TOR2E Player Hero Tracker App

A single-file, offline-first PWA character tracker for **The One Ring 2nd Edition**.
Open `character-tracker.html` (or the deployed `index.html` mirror) in a browser — no build step.

## Tests

A headless regression harness lives in `tests/`:

```bash
npm install      # installs the dev-only playwright-core; `npx playwright install chromium` if no browser is cached
npm test         # boots the app headless and runs all specs (smoke / adversaries / ux / spillage)
```

`npm test` exits non-zero on any failure. Set `CHROMIUM_BIN` to a Chrome/Chromium
binary to override browser auto-detection. The harness is dev-only — it is not part
of the shipped PWA (it lives outside the service-worker cache list).
