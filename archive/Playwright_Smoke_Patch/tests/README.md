# Tests

## Run locally

```bash
npm run build
npx playwright install --with-deps
npx playwright test
```

The Playwright config starts:
- your app via `npm run preview` on :5173
- a mock HTTP agent on :9009
