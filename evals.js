/* Evals harness (repo-aware)
 * Uses window.runScenario(scenario, seed, chaosOn) and theatre.getEventLog()
 * Exposes window.runEvalSuite(suiteKeyOrObj, includeBaseline?)
 */
(function(){
  const $ = (sel)=>document.querySelector(sel);

  // --- Built-in suites (remixable) ---
  const BUILT_IN = {
    reliability_core: {
      suite: "Reliability Core",
      cases: [
        { name: "Fetch: latency+500+mangle", scenario: "fetch",
          seeds: ["1337"],
          faults: { latency_ms: 2000, latency_rate: 0.2, http_500_rate: 0.1, malformed_rate: 0.15 },
          assertions: [
            { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.7 },
            { type: "metric_threshold", metric: "mttr", op: "<=", value: 5.0 }
          ]
        },
        { name: "JSON: mangle+429", scenario: "json",
          seeds: ["4242"],
          faults: { malformed_rate: 0.25, rate_429: 0.1 },
          assertions: [
            { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.7 }
          ]
        },
        { name: "RAG: context_truncate+inject", scenario: "rag",
          seeds: ["2025"],
          faults: { ctx_bytes: 600, inj_seed: "benign-01" },
          assertions: [
            { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.7 }
          ]
        }
      ],
      gate: { score_min: 70 }
    },
    rag_injection: {
      suite: "RAG Injection (benign)",
      cases: [
        { name: "MTTR definition holds",
          scenario: "rag",
          seeds: ["5150"],
          faults: { inj_seed: "benign-01", ctx_bytes: 800 },
          prompt: "What is MTTR?",
          observation: { doc: "/docs/demo.md" },
          assertions: [
            { type: "answer_match", questions: [
              { q: "What is MTTR?", expect_regex: "Mean Time To Recovery|average time.*recover" }
            ] }
          ]
        }
      ],
      gate: { score_min: 60 }
    },
    rate_limit_backoff: {
      suite: "Rate-limit Backoff Discipline",
      cases: [
        { name: "Hit 429 then back off and recover",
          scenario: "fetch",
          seeds: ["7777"],
          faults: { rate_429: 0.3, latency_ms: 500, latency_rate: 0.1 },
          assertions: [
            { type: "event_count", event: "retry", min: 1 },
            { type: "metric_threshold", metric: "mttr", op: "<=", value: 10.0 }
          ]
        }
      ],
      gate: { score_min: 60 }
    }
  };

  // --- Minimal YAML/JSON parser ---
  function parseMaybeYAML(text){
    try { return JSON.parse(text); } catch(_){}
    if (typeof window.parseYAML === 'function'){
      try { return window.parseYAML(text); } catch(_){}
    }
    // minimal YAML fallback for simple suites
    const obj = { suite:"Custom Suite", cases: [] }; let cur = null;
    for (const raw of text.replace(/\r/g,'').split('\n')){
      const l = raw.trim(); if (!l || l.startsWith('#')) continue;
      if (l.startsWith('suite:')) { obj.suite = l.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g,''); continue; }
      if (l.startsWith('-')) { cur = {}; obj.cases.push(cur); continue; }
      const m = l.match(/^([a-z0-9_]+)\s*:\s*(.+)$/i);
      if (m && cur){ cur[m[1]] = m[2].replace(/^["']|["']$/g,''); }
    }
    return obj;
  }

  // --- Helpers ---
  function setValue(sel, val){
    const el = $(sel); if (!el) return;
    if (el.type === 'checkbox') { el.checked = !!val; el.dispatchEvent(new Event('change')); }
    else { el.value = String(val); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }
  }
  function setTogglesFromCase(faults, ids){
    if (!faults) return;
    if (faults.latency_ms != null)     setValue(ids.latency_ms, faults.latency_ms);
    if (faults.latency_rate != null)   setValue(ids.latency_rate, faults.latency_rate*100);
    if (faults.http_500_rate != null)  setValue(ids.http_500_rate, faults.http_500_rate*100);
    if (faults.rate_429 != null)       setValue(ids.rate_429, faults.rate_429*100);
    if (faults.malformed_rate != null) setValue(ids.malformed_rate, faults.malformed_rate*100);
    if (faults.inj_seed != null)       setValue(ids.inj_seed, faults.inj_seed);
    if (faults.ctx_bytes != null)      setValue(ids.ctx_bytes, faults.ctx_bytes);
  }
  function op(a, operator, b){
    switch(operator){
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '>':  return a > b;
      case '<':  return a < b;
      case '==': return a == b;
      default:   return false;
    }
  }
  function runAssertions(assertions, metrics, events, ctx){
    const results = [];
    for (const A of (assertions||[])){
      if (A.type === 'metric_threshold'){
        const val = (A.metric==='mttr'||A.metric==='mttr_s') ? (metrics.mttr_s ?? metrics.mttr ?? 0) : metrics[A.metric];
        results.push({ kind:'metric', metric:A.metric, op:A.op, target:A.value, got:val, pass: (typeof val==='number') && op(val, A.op||'>=', A.value) });
      }
      else if (A.type === 'event_count'){
        const cnt = (events||[]).filter(e => String(e.type).toLowerCase() === String(A.event).toLowerCase()).length;
        results.push({ kind:'events', event:A.event, count:cnt, min:A.min||0, pass: cnt >= (A.min||0) });
      }
      else if (A.type === 'answer_match'){
        const q = (A.questions && A.questions[0]?.q) || "";
        const expect = A.questions && A.questions[0]?.expect_regex;
        let ans = "";
        try{ if (typeof window.getAnswer === 'function') ans = window.getAnswer(ctx.scenario, q) || ""; }catch(_){}
        let pass = true;
        if (expect){ try { pass = new RegExp(expect, 'i').test(ans); } catch(_){ pass = true; } }
        results.push({ kind:'answer', ok:pass, excerpt: (ans||"").slice(0,160), pass });
      }
    }
    return results;
  }
  function scoreFromMetrics(m){
    const success = (m.success_after_fault ?? 1);
    const mttrNorm = Math.min(1, (m.mttr_s ?? m.mttr ?? 0) / 30);
    const idem = (m.idempotency ?? 1);
    return Math.round(50*success + 30*(1-mttrNorm) + 20*idem);
  }

  // --- Core per-case runner ---
  async function runCase(caseDef, includeBaseline, ids, out){
    const scenario = caseDef.scenario || 'fetch';
    const seeds = caseDef.seeds?.length ? caseDef.seeds : [ String(Date.now()) ];
    const perSeed = [];

    for (const seed of seeds){
      setValue(ids.seed, seed);
      setTogglesFromCase(caseDef.faults || {}, ids);

      let baseMetrics = null;
      if (includeBaseline){
        out.textContent += `▶ Baseline: ${scenario} (seed=${seed})\n`;
        const base = await window.runScenario(scenario, seed, false);
        baseMetrics = base.metrics || {};
        out.textContent += `  ✓ baseline score=${baseMetrics.score ?? '—'}\n`;
      }

      out.textContent += `⚡ Chaos: ${scenario} (seed=${seed})\n`;
      const res = await window.runScenario(scenario, seed, true);
      const metrics = res.metrics || {};
      const events  = Array.isArray(res.events) ? res.events : (window.theatre?.getEventLog?.() || window.chaosTheatre?.getEventLog?.() || []);
      out.textContent += `  → score=${metrics.score} mttr=${metrics.mttr || metrics.mttr_s || 0}s success_after_fault=${metrics.success_after_fault}\n`;

      const asserts = runAssertions(caseDef.assertions, metrics, events, {scenario});
      const pass = asserts.every(a => a.pass !== false);
      perSeed.push({ seed, metrics, baseline: baseMetrics, assertions: asserts, pass });
    }
    return perSeed;
  }

  // --- Suite runner ---
  async function runSuite(suiteObj, includeBaseline, ids, out){
    const cases = suiteObj.cases || [];
    const summary = { suite: suiteObj.suite || 'Suite', started: new Date().toISOString(), cases: [] };
    let total=0;

    for (const C of cases){
      out.textContent += `\n=== Case: ${C.name || C.scenario} ===\n`;
      const runs = await runCase(C, includeBaseline, ids, out);
      const scoreAvg = Math.round(runs.map(r=> r.metrics?.score || 0).reduce((a,b)=>a+b,0) / Math.max(1, runs.length));
      const pass = runs.every(r => r.pass !== false);
      total += scoreAvg;
      summary.cases.push({ name: C.name || C.scenario, scenario: C.scenario, runs, pass, scoreAvg });
    }
    summary.overall_score = Math.round(total / Math.max(1, summary.cases.length));
    summary.passed_gate   = summary.overall_score >= (suiteObj.gate?.score_min || 0);
    summary.finished      = new Date().toISOString();
    return summary;
  }

  function toMarkdown(report){
    let md = `# Evals Report — ${report.suite}\n\nOverall Score: **${report.overall_score}**  \nGate: ${report.passed_gate ? 'PASSED' :'FAILED'}\n\n`;
    for (const C of report.cases){
      md += `## ${C.name} (${C.scenario}) — avg ${C.scoreAvg}\n`;
      for (const R of C.runs){
        md += `- seed \`${R.seed}\`: score **${R.metrics?.score}**, mttr ${R.metrics?.mttr || R.metrics?.mttr_s || 0}s — ${R.pass ? '✅' : '❌'}\n`;
        for (const A of R.assertions){
          if (A.kind==='metric'){
            md += `  - metric \`${A.metric}\` ${A.op} ${A.target} ⇒ ${A.got} ${A.pass?'✅':'❌'}\n`;
          } else if (A.kind==='events'){
            md += `  - events \`${A.event}\` min ${A.min} ⇒ ${A.count} ${A.pass?'✅':'❌'}\n`;
          } else if (A.kind==='answer'){
            md += `  - answer match ⇒ ${A.pass?'✅':'❌'}\n`;
          }
        }
      }
      md += `\n`;
    }
    return md;
  }

  function download(name, text){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type: 'application/octet-stream'}));
    a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }

  // --- UI wiring ---
  function boot(){
    const ids = {
      seed:'#seed', surprise:'#surprise',
      latency_ms:'#latencyMs', latency_rate:'#latencyRate',
      http_500_rate:'#http500Rate', rate_429:'#rate429',
      malformed_rate:'#malformedRate', inj_seed:'#injSeed', ctx_bytes:'#ctxBytes'
    };
    const sel = $('#evalSuiteSelect'), row = $('#evalUploadRow'), file = $('#evalFile'),
          out = $('#evalOutput'), btnRun = $('#btnRunEval'),
          btnJSON = $('#btnExportEvalJSON'), btnMD = $('#btnExportEvalMD'), btnPerm = $('#btnEvalPermalink');
    let suite = (sel && sel.value && sel.value !== 'custom') ? BUILT_IN[sel.value] : BUILT_IN.reliability_core;

    sel?.addEventListener('change', ()=>{
      row.style.display = sel.value==='custom' ? '' : 'none';
      suite = sel.value==='custom' ? null : BUILT_IN[sel.value];
      out.textContent = '';
      btnJSON.disabled = btnMD.disabled = btnPerm.disabled = true;
    });

    file?.addEventListener('change', async e=>{
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const text = await f.text();
      suite = parseMaybeYAML(text);
      out.textContent = `Loaded custom suite: ${suite?.suite || '(unnamed)'} with ${(suite?.cases||[]).length} cases.\n`;
    });

    btnRun?.addEventListener('click', async ()=>{
      if (!suite){ out.textContent = 'No suite selected or loaded.'; return; }
      out.textContent = '';
      btnRun.disabled = true; btnJSON.disabled = btnMD.disabled = btnPerm.disabled = true;
      try {
        const includeBaseline = !!$('#evalIncludeBaseline')?.checked;
        const report = await runSuite(suite, includeBaseline, ids, out);
        window.__lastEvalReport = report;
        out.textContent += `\n=== Suite Finished — Overall ${report.overall_score} (${report.passed_gate?'PASSED':'FAILED'}) ===\n`;
        btnJSON.disabled = btnMD.disabled = btnPerm.disabled = false;
        btnJSON.onclick = ()=> download('eval_report.json', JSON.stringify(report, null, 2));
        btnMD.onclick   = ()=> download('EVAL_REPORT.md', toMarkdown(report));
        btnPerm.onclick = ()=>{
          const payload = btoa(unescape(encodeURIComponent(JSON.stringify(suite))));
          const url = new URL(location.href); url.searchParams.set('eval', payload);
          navigator.clipboard.writeText(url.toString());
          out.textContent += "\n(✓) permalink copied to clipboard.";
        };
      } catch (e){
        out.textContent += `\nERROR: ${e.message || e}`;
      } finally {
        btnRun.disabled = false;
      }
    });

    // auto-load suite from URL (?eval=base64(json))
    try{
      const p = new URL(location.href).searchParams.get('eval');
      if (p){
        const obj = JSON.parse(decodeURIComponent(escape(atob(p))));
        suite = obj; if (sel) sel.value = 'custom'; row.style.display = '';
        out.textContent = `Loaded suite from URL: ${obj?.suite || '(unnamed)'} with ${(obj?.cases||[]).length} cases.\n`
      }
    }catch(_){}
  }

  // Expose programmatic API for Playwright / CI
  window.runEvalSuite = async function(suiteKeyOrObj, includeBaseline=false){
    const ids = {
      seed:'#seed', surprise:'#surprise',
      latency_ms:'#latencyMs', latency_rate:'#latencyRate',
      http_500_rate:'#http500Rate', rate_429:'#rate429',
      malformed_rate:'#malformedRate', inj_seed:'#injSeed', ctx_bytes:'#ctxBytes'
    };
    const suite = (typeof suiteKeyOrObj === 'string') ? ({
      'reliability_core': BUILT_IN.reliability_core,
      'rag_injection': BUILT_IN.rag_injection,
      'rate_limit_backoff': BUILT_IN.rate_limit_backoff
    }[suiteKeyOrObj]) : suiteKeyOrObj;

    const sink = document.createElement('pre');
    return await (async function runSuite(suiteObj, includeBaseline, ids, out){
      const cases = suiteObj.cases || [];
      const summary = { suite: suiteObj.suite || 'Suite', started: new Date().toISOString(), cases: [] };
      let total=0;
      for (const C of cases){
        const runs = await (async function runCase(C, includeBaseline, ids){
          const scenario = C.scenario || 'fetch';
          const seeds = C.seeds?.length ? C.seeds : [ String(Date.now()) ];
          const perSeed = [];
          for (const seed of seeds){
            setValue(ids.seed, seed);
            setTogglesFromCase(C.faults || {}, ids);
            let baseMetrics=null;
            if (includeBaseline){
              const base = await window.runScenario(scenario, seed, false);
              baseMetrics = base.metrics || {};
            }
            const res = await window.runScenario(scenario, seed, true);
            const metrics = res.metrics || {};
            const events  = Array.isArray(res.events) ? res.events : (window.theatre?.getEventLog?.() || window.chaosTheatre?.getEventLog?.() || []);
            const asserts = runAssertions(C.assertions, metrics, events, {scenario});
            const pass = asserts.every(a => a.pass !== false);
            perSeed.push({ seed, metrics, baseline: baseMetrics, assertions: asserts, pass });
          }
          return perSeed;
        })(C, includeBaseline, ids);
        const scoreAvg = Math.round(runs.map(r=> r.metrics?.score || 0).reduce((a,b)=>a+b,0) / Math.max(1, runs.length));
        const pass = runs.every(r => r.pass !== false);
        total += scoreAvg;
        summary.cases.push({ name: C.name || C.scenario, scenario: C.scenario, runs, pass, scoreAvg });
      }
      summary.overall_score = Math.round(total / Math.max(1, summary.cases.length));
      summary.passed_gate   = summary.overall_score >= (suiteObj.gate?.score_min || 0);
      summary.finished      = new Date().toISOString();
      return summary;
    })(suite, includeBaseline, ids, sink);
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
