# Evals Patch — Chaos Lab (ASCII Theatre + Resilience Evals)

Adds **Resilience Evals** UI, a **browser eval harness**, **built-in suites**, and a **Playwright CI gate**.

## Adds
- Evals card in `index.html` (suite select, upload YAML/JSON, run, export JSON/MD, permalink)
- `/evals.js` harness (seeded runs, assertions, export)
- `/evals/*.yml` suites (remixable)
- `/docs/Evals.md` quick doc
- `/tests/evals.spec.ts` Playwright
- `/.github/workflows/evals.yml` CI

## Apply
1) Copy files into repo root (preserve paths).
2) Insert the Evals card and `<script src="/evals.js"></script>` from `PATCH.md`.
3) Append the styles from `PATCH.md` to `styles.css`.
4) Ensure `window.runScenario(scenario, seed, chaosOn)` exists (or adapt).
5) Local test:
   ```bash
   npm i -D @playwright/test http-server
   npx playwright install
   npx http-server -p 5173 .
   npx playwright test
   ```
6) Push to GitHub → CI runs.

## IDs to confirm (update in evals.js if different)
```
#seed #surprise #latencyMs #latencyRate #http500Rate #rate429 #malformedRate #injSeed #ctxBytes
```

Generated 2025-08-24T22:04:49.454661Z
