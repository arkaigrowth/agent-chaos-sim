
# MiniMax → Claude Code Migration (v0.3)

## Source base
`/mnt/data/minimax_unpack_03/chaos_agent_workspace_minimax_0.3`

## Chosen artifacts
- **index.html** → `index.html` copied to `/index.html`
- **styles.css** → `styles.css` copied to `/styles.css`
- **app.js** → `app.js` copied to `/app.js`

## Copied folders
- `/config` (copy profiles, chaos.default.yml)
- `/docs` (demo.md, FAQ, scripts)
- `/assets` (sample.html)

## Notes
- We prefer **root files** for a client-only deploy. If you later want to use `/src`, wire up a bundler output to `/dist` and adjust the HTML.
- In static hosts, `/index.html` must reference `/styles.css` and `/app.js` (no module type).

## Run locally
```bash
npm i
npm run dev
```
