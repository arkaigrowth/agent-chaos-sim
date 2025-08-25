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
      { title:"Latency Spike", body:"Introduce 2–10s lag. Confirm timeouts don't nuke the run." },
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