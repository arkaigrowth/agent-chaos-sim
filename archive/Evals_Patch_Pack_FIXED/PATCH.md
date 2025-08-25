# PATCH — index.html / styles.css

## index.html additions (after Theatre, before Results)
```html
<section class="card" id="evalsCard">
  <h2>Resilience Evals (beta)</h2>

  <div class="row">
    <label>
      Suite:
      <select id="evalSuiteSelect">
        <option value="reliability_core">Reliability Core</option>
        <option value="rag_injection">RAG Injection (benign)</option>
        <option value="rate_limit_backoff">Rate-limit Backoff Discipline</option>
        <option value="custom">Upload custom YAML/JSON…</option>
      </select>
    </label>
    <label><input type="checkbox" id="evalIncludeBaseline"> Include baseline</label>
  </div>

  <div class="row" id="evalUploadRow" style="display:none">
    <input type="file" id="evalFile" accept=".yml,.yaml,.json" />
    <small class="hint">Schema: suite → cases[] with scenario, seeds[], faults{{…}}, assertions[]</small>
  </div>

  <div class="row">
    <button id="btnRunEval" class="primary">Run Suite</button>
    <button id="btnExportEvalJSON" disabled>Export JSON</button>
    <button id="btnExportEvalMD" disabled>Export MD</button>
    <button id="btnEvalPermalink" disabled>Copy permalink</button>
  </div>

  <pre id="evalOutput" class="ascii" style="height:260px; white-space:pre-wrap;"></pre>
</section>
```

Add this script tag near the bottom (after Theatre, before app.js):
```html
<script src="/evals.js"></script>
```

## styles.css additions
```css
/* --- Evals card --- */
#evalsCard .row { align-items: center; gap: var(--space-md); }
#evalsCard select {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
}
#evalsCard button[disabled]{ opacity: 0.5; cursor: not-allowed; }
#evalOutput {
  background: #0b0f13;
  color: #9fe870;
  border: 1px dashed var(--border);
  padding: 12px;
  border-radius: 6px;
  overflow: auto;
}
```
