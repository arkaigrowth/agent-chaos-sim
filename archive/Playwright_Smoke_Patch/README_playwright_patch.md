# Playwright Smoke Test Patch

This patch adds an **end-to-end smoke test** for Chaos Lab + Task Mode.
It assumes your app is served at `http://localhost:5173` via `vite preview` and
starts a tiny **mock HTTP Agent** on `http://localhost:9009` for Task Mode’s HTTP adapter.

## Files added

```
playwright.config.ts
tests/smoke.taskmode.spec.ts
tests/mock-agent/server.js
tests/README.md
.github/workflows/ci-playwright.yml   # optional CI
```

## 1) Install dev dependencies

```bash
npm i -D @playwright/test playwright
npx playwright install --with-deps
```

> If you use `pnpm` or `yarn`, adapt commands accordingly.

## 2) Package scripts (add to your package.json)

```jsonc
{
  "scripts": {
    "build": "vite build",                            // if not present
    "preview": "vite preview --port 5173 --strictPort",
    "test:e2e": "playwright test",
    "test:ui": "playwright test --ui"
  }
}
```

## 3) Run locally

```bash
# 1) Build your app (if you haven’t already)
npm run build

# 2) Run Playwright (auto-starts preview server and mock agent)
npx playwright test
```

The test opens your homepage, verifies the **Task Mode** panel, loads the sample dataset,
runs **Baseline** and **Chaos**. Then it switches to **HTTP Agent**, points to the mock agent,
and runs Chaos again to validate the end-to-end flow.

## 4) Optional: GitHub Actions CI

The included workflow `ci-playwright.yml` builds your app, installs browsers, runs the tests,
and uploads Playwright traces on failures.

## Notes

- If your app does **not** expose `window.chaosFetch`, network chaos won’t be injected into Task Mode.
  The smoke test still passes as it only asserts that runs complete and produce numeric scores.
- If your served entry is not `/` or port is not `5173`, update `playwright.config.ts` (baseURL/webServer).
