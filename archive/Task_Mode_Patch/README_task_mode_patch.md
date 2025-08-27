# Task Mode Patch — Bring-Your-Own Task (Prompt + Data + Eval)

This patch adds **Task Mode** to Chaos Lab so anyone can load a dataset, define a prompt template,
run a task against a local/LLM/HTTP agent **baseline vs. chaos**, and see **Task** + **Resilience** + **Joint** scores.

> **Scope:** This patch only *adds* files. You will paste one HTML panel into your served page and include the new JS/CSS.
> Your existing scenarios, ASCII Theatre, Evals, and scoring remain intact.

---

## What’s included

```
README_task_mode_patch.md              # this file
/public/task_mode.css                  # minimal styles for the Task Mode panel
/public/task_mode.js                   # Task Mode engine (dataset load, template, adapters, eval, run)
/public/adapters/index.js              # dynamic adapter loader
/public/adapters/local.js              # local (no-network) demo adapter
/public/adapters/openai.js             # OpenAI adapter using fetch (respects chaosFetch if present)
/public/adapters/http-agent.js         # Generic HTTP agent adapter calling POST /run
/datasets/qa_mttr.jsonl                # tiny example dataset (QA with expected_regex)
/prompts/qa.mustache                   # example prompt template
/schemas/user.json                     # simple JSON Schema example for extraction/classify
/snippets/task_mode_panel.html         # the HTML you paste into your served page
/snippets/computeScore_patch.js        # optional: scoring helper that penalizes fallbacks
/snippets/runners_fallback_patch.md    # optional: notes where to mark fallback as 'failed'
```

---

## 1) Add the Task Mode panel to your served page

Paste the contents of **`/snippets/task_mode_panel.html`** into your *served* HTML (the one you see in DevTools → Network → Document → **Response**).
Place it **after** “Configure Failure Scenarios” and **before** “Run Your Tests” (or anywhere you like inside `<main>`).

Then include the assets (near your other `<script>` tags):

```html
<link rel="stylesheet" href="/task_mode.css" />
<script src="/adapters/index.js"></script>
<script src="/task_mode.js"></script>
```

> If you’re using Vite, you can also import these in your main bundle. The files attach `window.TaskMode` for ease-of-use.

---

## 2) Wire the panel (one-liner)

At the bottom of the page (after the `<script src="/task_mode.js">`), add:

```html
<script>
  window.addEventListener('DOMContentLoaded', () => {
    window.TaskMode?.init({
      mountId: 'taskMode',              // panel root id
      theatre: window.theatre,          // optional: ASCII Theatre to visualize
      chaosFetch: window.chaosFetch,    // optional: existing chaos wrapper
      withTripwire: window.withTripwire // optional: existing retry/backoff helper
    });
  });
</script>
```

No other wiring needed. The panel’s buttons call `TaskMode.runBaseline()` and `TaskMode.runChaos()` internally and print a mini report.  
If your environment changes input IDs, you can provide a custom `getFaultToggles()` via the init options.

---

## 3) Try the included example (no keys)

1. Open your app (localhost).
2. In **Task Mode — Bring Your Own Data**:
   - Click **Choose File** → pick `/datasets/qa_mttr.jsonl`
   - Keep **Adapter = Local JS**.
   - Keep **Metric = regex** (uses `expected_regex` from dataset).
   - Click **Run Task Baseline**, then **Run Task with Chaos**.
3. Observe:
   - **Task Score**: based on regex checks over each row.
   - **Resilience Score**: derived from retries/failures/latency per row.
   - **Joint Score** = 0.6 * Task + 0.4 * Resilience.

> Local adapter is network-free, so you’ll mainly see **Task Score** vary if your prompt/regex do.  
> Switch to **HTTP Agent** or **OpenAI** to experience network chaos via `chaosFetch` (500/429/latency).

---

## 4) Use your own Agent (HTTP)

1. Implement a simple endpoint in your project:
   - **POST** `/run`  
     **Request**: `{ "prompt": string, "inputs": object, "meta": { "task": "qa" | "extract" | "classify" | "freeform" } }`  
     **Response**: `{ "output": string | object, "trace"?: any[] }`
2. In Task Mode:
   - Adapter → **HTTP Agent**
   - Base URL → e.g. `https://my-agent.example.com`
   - Run Baseline / Run with Chaos.

All network calls go through `chaosFetch` (if present), so faults are injected automatically.

---

## 5) Use OpenAI (or Anthropic)

1. Adapter → **OpenAI**
2. Paste API key in the UI prompt (stored in-memory only).
3. Choose model, write your template, and run.

> Only in your local fork; do **not** ship keys in public Spaces.

---

## 6) Evaluation metrics

- **exact**: trims + case-insensitive equality with `row.expected` (or UI override)
- **regex**: tests `row.expected_regex` (or UI regex field) against output
- **json_schema**: tries to parse the output as JSON and checks a minimal subset of JSON Schema:
  - required fields exist
  - primitive types match (`string`, `number`, `boolean`, `object`, `array`)

> Extendable: you can add ROUGE/F1 easily if you want to bring a library; this patch stays dependency‑light.

---

## 7) Resilience scoring (optional patch)

If your current scoring always yields 100, apply **one** of the following:

- Use **`/snippets/computeScore_patch.js`** to replace your `window.computeScore` with a version that **penalizes fallbacks** and requires actual `recovered` (retry-based) for success.
- Or ensure your runners mark fallback rows as `status:'failed', action:'fallback'` (see **`/snippets/runners_fallback_patch.md`**).

Then run the JSON “malformed 100%” or 500/latency recipes to verify the score moves.

---

## 8) Agentic recommendations (Claude Code)

- **frontend-developer (primary)**  
  - Paste panel HTML, include CSS/JS, call `TaskMode.init`.  
  - Verify IDs; if your app uses a state store instead of DOM inputs, pass a custom `getFaultToggles` in `init(...)`.
- **api-designer**  
  - Extend your `openapi.yaml` with `POST /run` (request/response above).  
  - Provide example cURL and JSON schema.
- **backend-developer** (optional)  
  - Spin a tiny Express `/run` for demos; log inputs, return `{output}`.
- **technical-writer**  
  - Add `INTEGRATION_GUIDE.md`: your task types, dataset mapping conventions, and examples.
- **ui-designer-superdesign**  
  - Refine Task Mode layout and accessibility labels; ensure keyboard nav & contrasts.

> Routing hint: tag tickets with “UI|component|frontend” → `frontend-developer`; with “API” → `api-designer`.

---

## 9) FAQ

**Q: Where do I put my dataset?**  
Use the file picker (JSONL/CSV/MD). The first row becomes a mapping preview; fields are available as `{{field}}` in your template.

**Q: How do I wire my agent?**  
Pick **HTTP Agent** and point Base URL at your service implementing `/run`. No changes to your agent needed.

**Q: How do I share runs?**  
Use your app’s existing permalink mechanism. Task Mode emits a compact run summary you can embed into your report export.

**Q: Does chaos apply to adapters?**  
Yes for networked adapters: `chaosFetch` wraps the HTTP request. Local adapter does not use network; use it for no‑key demos.

---

## 10) Safety

- No keys stored server-side. Keys are only read from local input fields and used in-memory during the session.
- Only whitelisted URLs should be used for public demos. Benign prompt injections only.

Have fun making your agent unflinchingly resilient **and** correct. 🚧🧪
