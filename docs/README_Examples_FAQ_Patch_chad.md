README_EXAMPLES_FAQ_PATCH.md (for Claude Code)

Goal

Add a What can I test? grid powered by YAML + a FAQ viewer. Each example card shows a real scenario and (optionally) applies preset faults on click.

Where to place

Insert the Examples/FAQ between “How Chaos Lab Works” and “Choose Your Test Scenario”. If that anchor doesn’t exist, place it above Scenario.

⸻

Step 1 — Create /config/copy.examples.yml

No tabs; use spaces. Keep keys exactly.

examples:
  cards:
    - title: "API Meltdown"
      body: "Simulate 500s + 429s. Watch your agent retry, backoff, or crash. Know before prod knows."
      faults: { http_500_rate: 0.10, rate_429: 0.10, latency_ms: 1000, latency_rate: 0.10 }

    - title: "Garbage JSON"
      body: "Corrupt payloads mid-flight. Test if your parser panics or recovers gracefully."
      faults: { malformed_rate: 0.25 }

    - title: "RAG Injection"
      body: "Add a benign prompt injection. See if your agent follows the trap or stays on task."
      faults: { inj_seed: "benign-01" }

    - title: "Latency Spike"
      body: "Inject 2–10s delays randomly. Does your agent timeout or adapt with async fallbacks?"
      faults: { latency_ms: 2000, latency_rate: 0.20 }

    - title: "Tool Vanishes"
      body: "Kill a dependency mid-run. Test if your agent finds alternatives or fails hard."
      faults: { tool_unavailable_steps: 2 }

    - title: "Context Bomb"
      body: "Overflow token limits on purpose. Watch truncation handling or memory management kick in."
      faults: { ctx_bytes: 2000 }


⸻

Step 2 — Insert section in index.html

Add this after the “How it works” block and before Scenario.

<section class="card" id="examplesCard">
  <h2>What can I test? <a class="link" href="/docs/faq.md" target="_blank" rel="noopener">FAQ</a></h2>
  <div class="examples" id="examplesGrid"></div>
  <details id="faqInline" class="hidden">
    <summary>Open FAQ inline</summary>
    <div id="faqContent"></div>
  </details>
</section>

<!-- include loader script (adjust path if your assets live at root) -->
<script src="/public/examples_faq.js"></script>

If you serve assets at the root (not /public/), use <script src="/examples_faq.js">.

⸻

Step 3 — Add styles to styles.css

Append:

/* Examples grid */
.examples{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:12px;
}
.examples .ex{
  background:#0E131A;
  border:1px solid var(--border);
  border-radius:10px;
  padding:14px;
  transition:transform .08s ease, box-shadow .08s ease;
}
.examples .ex h3{ margin:0 0 6px; }
.examples .ex p{ color:var(--muted); font-size:14px; margin:0; }
.examples .ex:hover{ transform:translateY(-1px); box-shadow:0 6px 14px rgba(0,0,0,.25); }
.examples .ex .badge{
  display:inline-block; margin-top:8px; font-size:12px;
  padding:3px 8px; border-radius:999px; border:1px dashed var(--border); color:var(--muted);
}
.hidden{ display:none !important; }
#faqContent{ background:#0A0E14; border:1px solid var(--border); border-radius:8px; padding:10px; white-space:pre-wrap; }


⸻

Step 4 — Create /public/examples_faq.js

This loads examples → renders cards → optional click applies faults → loads /docs/faq.md inline if needed.

// /public/examples_faq.js
(function(){
  const $ = s => document.querySelector(s);

  const IDMAP = {
    seed: '#seed', surprise:'#surprise',
    latency_ms:'#latencyMs', latency_rate:'#latencyRate',
    http_500_rate:'#http500Rate', rate_429:'#rate429',
    malformed_rate:'#malformedRate', inj_seed:'#injSeed', ctx_bytes:'#ctxBytes',
    tool_unavailable_steps:'#toolUnavailableSteps' // if present
  };

  function setVal(sel, v){
    const el = $(sel); if (!el) return;
    el.value = String(v);
    el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change'));
  }

  function applyFaults(faults={}){
    // Map YAML faults (0..1 for rates) to UI (percent 0..100) where needed
    if (faults.latency_ms != null) setVal(IDMAP.latency_ms, faults.latency_ms);
    if (faults.latency_rate != null) setVal(IDMAP.latency_rate, Math.round(faults.latency_rate*100));
    if (faults.http_500_rate != null) setVal(IDMAP.http_500_rate, Math.round(faults.http_500_rate*100));
    if (faults.rate_429 != null) setVal(IDMAP.rate_429, Math.round(faults.rate_429*100));
    if (faults.malformed_rate != null) setVal(IDMAP.malformed_rate, Math.round(faults.malformed_rate*100));
    if (faults.inj_seed != null) setVal(IDMAP.inj_seed, faults.inj_seed);
    if (faults.ctx_bytes != null) setVal(IDMAP.ctx_bytes, faults.ctx_bytes);
    if (faults.tool_unavailable_steps != null && IDMAP.tool_unavailable_steps)
      setVal(IDMAP.tool_unavailable_steps, faults.tool_unavailable_steps);
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

  async function loadExamples(){
    const grid = $('#examplesGrid'); if (!grid) return;
    const fallback = [
      { title:"API Meltdown", body:"Simulate 500s + 429s. Verify jittered retries and safe fallback keep the task alive." },
      { title:"Garbage JSON", body:"Corrupt payloads 15–30%. Confirm parser recovery or fallback table." },
      { title:"RAG Injection", body:"Slip a benign 'untrusted' note. Ensure QA ignores it and answers from the doc." },
      { title:"Latency Spike", body:"Introduce 2–10s lag. Confirm timeouts don’t nuke the run." },
      { title:"Tool Vanishes", body:"Disable a tool for N steps; verify alt tool or degraded mode." },
      { title:"Context Bomb", body:"Trim context; watch graceful degradation." }
    ];

    try {
      const res = await fetch('/config/copy.examples.yml', { cache:'no-store' });
      if (!res.ok) throw new Error('missing examples.yml');
      const text = await res.text();

      // Prefer global parseYAML (if you already included one)
      let data;
      if (typeof window.parseYAML === 'function') data = window.parseYAML(text);
      else {
        // ultra-minimal: parse "cards:" and {title, body, faults}
        data = { examples:{ cards: [] } };
        const lines = text.replace(/\r/g,'').split('\n');
        let inCards = false; let buf = [];
        for (const ln of lines){
          if (ln.match(/^\s*cards\s*:/)) { inCards = true; continue; }
          if (inCards) buf.push(ln);
        }
        const itemRe = /-\s*title:\s*["']?(.+?)["']?\s*[\r\n]+(?:\s*body:\s*["']?(.+?)["']?)?/i;
        const chunks = text.split(/\n-\s*title:/).slice(1);
        chunks.forEach(chunk=>{
          const t = chunk.split('\n')[0]?.trim().replace(/^["']|["']$/g,'') || 'Untitled';
          const bMatch = chunk.match(/\n\s*body:\s*["']?(.+?)["']?\s*(\n|$)/i);
          const b = bMatch ? bMatch[1] : '';
          const fMatch = chunk.match(/\n\s*faults:\s*{([^}]+)}/i);
          let faults = {};
          if (fMatch){
            fMatch[1].split(',').forEach(pair=>{
              const [k,v] = pair.split(':').map(s=>s.trim());
              if (k) faults[k] = (/^\d+(\.\d+)?$/.test(v) ? Number(v) : v?.replace(/^["']|["']$/g,''));
            });
          }
          data.examples.cards.push({ title:t, body:b, faults });
        });
      }

      const cards = data?.examples?.cards?.length ? data.examples.cards : fallback;

      grid.innerHTML = cards.map((c,i)=>`
        <div class="ex" data-idx="${i}">
          <h3>${escapeHtml(c.title||'Untitled')}</h3>
          <p>${escapeHtml(c.body||'')}</p>
          ${c.faults ? '<span class="badge">Click to apply</span>' : ''}
        </div>
      `).join('');

      grid.querySelectorAll('.ex').forEach((el,i)=>{
        el.addEventListener('click', ()=>{
          const card = cards[i];
          if (card?.faults) applyFaults(card.faults);
        });
      });

    } catch {
      grid.innerHTML = fallback.map(c=>`
        <div class="ex">
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.body)}</p>
        </div>
      `).join('');
    }
  }

  async function loadFAQInline(){
    const wrap = $('#faqInline'); if (!wrap) return;
    try {
      const res = await fetch('/docs/faq.md', { cache:'no-store' });
      if (!res.ok) throw new Error();
      const md = await res.text();
      $('#faqContent').innerHTML = markdownToHtml(md);
      wrap.classList.remove('hidden');
    } catch(_){
      // keep only link if md not accessible
    }
  }

  // Tiny markdown to HTML (headings, lists, bold/italic, code fences, paragraphs)
  function markdownToHtml(md){
    const esc = s => s.replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    let html = esc(md);

    // Code fences
    html = html.replace(/```([\s\S]*?)```/g, (_,code)=>`<pre class="code">${esc(code)}</pre>`);
    // Headings
    html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
               .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
               .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
               .replace(/^### (.*)$/gm, '<h3>$1</h3>')
               .replace(/^## (.*)$/gm, '<h2>$1</h2>')
               .replace(/^# (.*)$/gm, '<h1>$1</h1>');
    // Bold/italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Lists
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Paragraphs (simple)
    html = html.replace(/^(?!<h\d|<ul|<pre|<li|<\/ul|<\/pre).+$/gm, '<p>$&</p>');
    return html;
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    await loadExamples();
    await loadFAQInline();
  });
})();


⸻

Step 5 — Acceptance tests
	•	Reload → 6 real cards render; not “Example 1…6”.
	•	Click API Meltdown → your chaos inputs update (500/429/latency reflect YAML).
	•	Click FAQ link → /docs/faq.md opens; click Open FAQ inline → content appears inside the page.
	•	Run Baseline → Chaos; the eval suite scores are not 100 (i.e., faults were applied).

⸻

Step 6 — Troubleshooting
	•	Cards still say Example 1…
	•	/config/copy.examples.yml missing or wrong path → confirm it’s accessible at that URL.
	•	Dev server doesn’t serve /config → move file under your public folder or adjust fetch path to /public/config/copy.examples.yml.
	•	examples_faq.js not included (or path mismatch).
	•	Click doesn’t change inputs
	•	Your input IDs differ. Update the IDMAP at the top of examples_faq.js to the actual IDs in your UI (e.g., styled controls).
	•	If you use a state store (not direct inputs), create a global helper:

window.applyFaultConfig = (cfg)=> { /* set your store */ }

and call it instead of setVal() for a clean integration.

	•	FAQ inline is blank
	•	/docs/faq.md not served or has CORS issues. The link still works; inline viewer is optional.

⸻

Claude Code agent routing (use your index)
	•	frontend-developer (primary)
	•	Create /config/copy.examples.yml
	•	Insert HTML block; add /public/examples_faq.js; include script
	•	Wire ID mapping (update IDMAP if needed)
	•	Verify the loader is called on DOMContentLoaded
	•	ui-designer-superdesign
	•	Polish grid cards (hover, focus, mobile)
	•	Ensure contrast and spacing; refine .badge and headers
	•	technical-writer
	•	Flesh out /docs/faq.md (What is Chaos Lab, When to use, Scoring math, Seeds & reproducibility, Safety)
	•	Keep reading level ~8th grade
	•	qa-automation (optional)
	•	Playwright: assert grid loads 6 cards; clicking one sets inputs; run a quick chaos → score < baseline
