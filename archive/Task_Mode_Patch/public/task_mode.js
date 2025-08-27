
(function(global){
  const TaskMode = {};
  let options = {};
  let dataset = [];
  let adapterName = 'local';
  let schemaCache = {};
  let seed = '1337';

  const $ = (id)=>document.getElementById(id);

  function readFileAsText(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>res(String(fr.result||''));
      fr.onerror = rej;
      fr.readAsText(file);
    });
  }

  function parseJSONL(text){
    const out = [];
    for (const line of text.split(/\r?\n/)){
      const s = line.trim();
      if (!s) continue;
      try { out.push(JSON.parse(s)); } catch {}
    }
    return out;
  }

  function parseCSV(text){
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const hdr = lines[0].split(',').map(s=>s.trim());
    return lines.slice(1).map(l=>{
      const cells = l.split(','); const row={};
      hdr.forEach((h,i)=> row[h] = (cells[i]||'').trim());
      return row;
    });
  }

  function parseMD(text){
    // Treat whole doc as a single "context" item
    return [{ id:'md1', task_type:'qa', question:'Summarize:', context:text }];
  }

  function renderTemplate(tpl, data){
    return String(tpl||'').replace(/{{\s*([\w.]+)\s*}}/g, (_,k)=>{
      const v = data[k];
      return v==null ? '' : String(v);
    });
  }

  function getAdapterName(){
    const radios = document.querySelectorAll('input[name="tmAdapter"]');
    for (const r of radios){ if (r.checked) return r.value; }
    return 'local';
  }

  function getFaultToggles(){
    // Read existing chaos controls if they exist; fallback defaults
    const byId = (id, def)=>{
      const el = $(id); if (!el) return def;
      if (el.type==='checkbox') return !!el.checked;
      const num = Number(el.value);
      return isFinite(num) ? num : (el.value || def);
    };
    return {
      latency_ms: Number(byId('latencyMs', 0)),
      latency_rate: Number(byId('latencyRate', 0))/100,
      http_500_rate: Number(byId('http500Rate', 0))/100,
      rate_429: Number(byId('rate429', 0))/100,
      malformed_rate: Number(byId('malformedRate', 0))/100,
      inj_seed: String(byId('injSeed','benign')),
      ctx_bytes: Number(byId('ctxBytes', 0)),
      tripwire_on: !!byId('tripwireOn', true),
      loop_n: Number(byId('loopN', 3)),
      backoff_base: Number(byId('backoffBase', 250)),
      backoff_factor: Number(byId('backoffFactor', 2.0)),
      jitter: Number(byId('jitter', 0.2)),
      max_retries: Number(byId('maxRetries', 3)),
      fallback: String(byId('fallback','use_cached_summary'))
    };
  }

  async function loadSchema(path){
    if (!path) return null;
    if (schemaCache[path]) return schemaCache[path];
    const res = await fetch(path);
    const json = await res.json();
    schemaCache[path] = json;
    return json;
  }

  function validateJsonSchema(obj, schema){
    // ultra-mini validator: required + primitive types
    try{
      if (schema?.required){
        for (const k of schema.required){
          if (!(k in obj)) return { ok:false, reason:`missing "${k}"` };
        }
      }
      const props = schema?.properties || {};
      for (const [k, def] of Object.entries(props)){
        if (!(k in obj)) continue;
        const t = Array.isArray(obj[k]) ? 'array' : (obj[k]===null ? 'null' : typeof obj[k]);
        if (def.type && def.type !== t){
          return { ok:false, reason:`type mismatch ${k}: expected ${def.type}, got ${t}` };
        }
      }
      return { ok:true };
    }catch(e){
      return { ok:false, reason:String(e) };
    }
  }

  function evalOne(metric, expect, schema, output){
    const out = (typeof output === 'string') ? output : JSON.stringify(output);
    if (metric==='exact'){
      return out.trim().toLowerCase() === String(expect||'').trim().toLowerCase();
    } else if (metric==='regex'){
      const rx = new RegExp(String(expect||''), 'i');
      return rx.test(out);
    } else if (metric==='json_schema'){
      try{
        const obj = (typeof output === 'string') ? JSON.parse(output) : output;
        return validateJsonSchema(obj, schema).ok;
      }catch{ return false; }
    }
    return false;
  }

  function sample(arr, n){ return arr.slice(0, Math.min(n, arr.length)); }

  async function runSuite({ useChaos }){
    const outEl = $('tmOut'); outEl.textContent = 'Running...';
    const metric = $('tmMetric').value;
    const expectOverride = $('tmExpect').value || null;
    const schemaPath = $('tmSchemaPath').value || null;
    const schema = metric==='json_schema' ? await loadSchema(schemaPath) : null;
    const tpl = $('tmPrompt').value || 'Q: {{question}}\n{{context}}\nA:';
    const tType = $('tmTaskType').value || 'qa';
    adapterName = getAdapterName();
    seed = (global.document.getElementById('seed')?.value) || seed;
    const rows = sample(dataset, 15);
    if (!rows.length) { outEl.textContent = 'No rows loaded.'; return; }

    // Adapter options
    const toggles = getFaultToggles();
    const baseUrl = $('tmBaseUrl').value || null;
    const apiKey = $('tmOpenAIKey').value || null;
    const adapter = await global.TaskAdapters.getAdapter(adapterName);

    let passed = 0, total = 0;
    let faultRows = 0, recoveredRows = 0, durations = [];
    const traceRows = [];

    const chaosFetcher = (global.chaosFetch && useChaos) ? global.chaosFetch : null;

    for (const row of rows){
      total++;
      const prompt = renderTemplate(tpl, row);
      const started = performance.now();

      // Simple Tripwire if not provided
      const tw = global.withTripwire || (async function withTw(fn){
        const { max_retries=3, backoff_base=250, backoff_factor=2, jitter=0.2 } = toggles;
        let attempt = 0, delay = backoff_base;
        while (true){
          try{
            return await fn();
          }catch(e){
            attempt++;
            if (attempt > max_retries) throw e;
            await new Promise(r=>setTimeout(r, delay * (1 + (Math.random()-0.5)*jitter)));
            delay *= backoff_factor;
          }
        }
      });

      const runOnce = async ()=>{
        return adapter.runTask(row, prompt, {
          baseUrl, apiKey, seed,
          chaosFetch: chaosFetcher || undefined,
          toggles: useChaos ? toggles : undefined,
          taskType: tType
        });
      };

      let result, ok=false, faulted=false, recovered=false, retryCount=0;
      try{
        result = useChaos ? await tw(async()=>{
          try { return await runOnce(); }
          catch(err){ faulted=true; retryCount++; throw err; }
        }) : await runOnce();
        ok = true;
        if (faulted) recovered = true;
      }catch(err){
        ok = false;
      }

      const dur = performance.now() - started;
      durations.push(dur);

      // Evaluate task correctness
      const expected = expectOverride || row.expected || row.expected_regex || '';
      const rowOk = evalOne(metric, expected, schema, result?.output ?? '');
      if (rowOk) passed++;

      // Track resilience
      if (useChaos){
        if (faulted) faultRows++;
        if (recovered) recoveredRows++;
      }

      // Push a synthetic trace row for scoring compatibility
      traceRows.push({
        step: total, tool: adapterName,
        fault: faulted ? (useChaos?'chaos':'none') : null,
        action: (faulted ? (recovered ? `retry(${retryCount||1})` : 'fallback') : 'ok'),
        duration_ms: Math.round(dur),
        status: (faulted ? (recovered ? 'recovered':'failed') : 'ok')
      });

      // Stream to output
      outEl.textContent += `#${total} ${ok?'OK':'ERR'} • task=${rowOk?'✓':'✗'} • dur=${Math.round(dur)}ms\n`;
    }

    // Scores
    const taskScore = Math.round(100 * (passed/total));
    let resilienceScore = 100;
    if (useChaos){
      const mttr = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length/1000 : 0;
      const mttrNorm = Math.min(1, mttr / 30);
      const successAfterFault = faultRows ? (recoveredRows/faultRows) : 1;
      resilienceScore = Math.round(50*successAfterFault + 30*(1-mttrNorm) + 20*1.0);
    }
    const joint = Math.round(0.6*taskScore + 0.4*resilienceScore);

    $('tmTaskScore').textContent = `Task: ${taskScore}`;
    $('tmResScore').textContent = `Resilience: ${resilienceScore}`;
    $('tmJointScore').textContent = `Joint: ${joint}`;

    // Expose a compact run summary in case the host app wants it
    global.TaskMode.lastRun = {
      seed, adapter: adapterName, taskType: tType,
      metric, totals:{ passed, total },
      taskScore, resilienceScore, joint,
      trace: traceRows
    };

    return global.TaskMode.lastRun;
  }

  TaskMode.init = function init(userOptions={}){
    options = userOptions || {};
    if (options.theatre) { /* optional future hook */ }
    const panel = document.getElementById(options.mountId || 'taskMode');
    if (!panel) { console.warn('TaskMode: panel not found'); return; }

    // Adapter toggles
    const radios = document.querySelectorAll('input[name="tmAdapter"]');
    const keyEl = $('tmOpenAIKey'); const baseEl = $('tmBaseUrl');
    function updateAdapterFields(){
      const name = getAdapterName();
      keyEl.style.display = (name==='openai') ? '' : 'none';
      baseEl.style.display = (name==='http') ? '' : 'none';
    }
    radios.forEach(r=> r.addEventListener('change', updateAdapterFields));
    updateAdapterFields();

    // Buttons
    $('btnTaskBaseline').addEventListener('click', ()=> runSuite({ useChaos:false }));
    $('btnTaskChaos').addEventListener('click', ()=> runSuite({ useChaos:true }));
    $('btnTaskSample').addEventListener('click', async ()=>{
      const res = await fetch('/datasets/qa_mttr.jsonl');
      const text = await res.text();
      dataset = parseJSONL(text);
      const tplRes = await fetch('/prompts/qa.mustache'); $('tmPrompt').value = await tplRes.text();
      $('tmOut').textContent = `Loaded ${dataset.length} rows.\nPreview fields: ` + Object.keys(dataset[0]||{}).join(', ');
    });

    // File input
    $('tmDatasetFile').addEventListener('change', async (e)=>{
      const f = e.target.files?.[0]; if (!f) return;
      const text = await readFileAsText(f);
      const name = (f.name||'').toLowerCase();
      if (name.endsWith('.jsonl')) dataset = parseJSONL(text);
      else if (name.endsWith('.csv')) dataset = parseCSV(text);
      else dataset = parseMD(text);
      $('tmOut').textContent = `Loaded ${dataset.length} rows from ${f.name}`;
    });

    // default prompt
    $('tmPrompt').value = 'Q: {{question}}\\n{{context}}\\nA:';
  };

  TaskMode.runBaseline = ()=> runSuite({ useChaos:false });
  TaskMode.runChaos = ()=> runSuite({ useChaos:true });

  global.TaskMode = TaskMode;
})(window);
