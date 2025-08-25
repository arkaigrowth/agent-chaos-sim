// Chaos Theatre — seeded ASCII visualization
(function(){
  function seededRand(seedStr){
    let t = 2166136261 >>> 0;
    for (const c of seedStr) t ^= c.charCodeAt(0), t = Math.imul(t, 16777619) >>> 0;
    return () => (t = (t*1664525 + 1013904223) >>> 0) / 4294967296;
  }

  class ChaosTheatre {
    constructor(){
      this.pre = document.getElementById('stage');
      this.rail = document.getElementById('timelineRail');
      this.mode = 'unicode';
      this.sound = false;
      this.mouseSpice = false;
      this.rand = Math.random;
      this.audio = null;
      this.gridW = 78; this.gridH = 12;
      this.packet = { x: 4, y: 6, speed: 0.05, active: true };
      this.effects = [];   // {type,x,y,ttl,...}
      this.last = performance.now();
      this.running = false;
      this.raf = null;
      this.seedVal = "0";
      this._mx = 0;
      this.eventLog = [];  // Store events for evaluation

      // reduced motion
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.fpsCap = this.reduced ? 20 : 60;

      // init controls if present
      document.getElementById('asciiOnly')?.addEventListener('change', e=> this.mode = e.target.checked ? 'ascii' : 'unicode');
      document.getElementById('soundOn')?.addEventListener('change', e=>{
        this.sound = !!e.target.checked;
        if (this.sound && !this.audio) this._audioInit();
      });
      document.getElementById('mouseSpice')?.addEventListener('change', e=> this.mouseSpice = !!e.target.checked);
      window.addEventListener('mousemove', e=> this._mx = e.clientX);

      // draw initial layout
      this._layout('fetch');
      this._renderFrame();
    }

    start(seed, scenario){
      this.seedVal = seed || "0";
      this.rand = seededRand(this.seedVal);
      this.packet = { x: 4, y: 6, speed: 0.05, active: true };
      this.effects = []; this._rail('reset');
      this.eventLog = [];  // Clear event log for new run
      this._layout(scenario||'fetch');
      this.running = true; this.last = performance.now();
      if (!this.raf) this._loop();
    }
    stop(){ this.running = false; if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }

    event(type, data={}){
      // Log event for evaluation
      this.eventLog.push({
        t: performance.now(),
        type: type,
        ...data
      });
      
      if (type==='fault'){
        const k = String(data.type||'').toLowerCase();
        const x = Math.max(6, Math.min(this.gridW-6, Math.floor(this.packet.x)));
        if (k.includes('latency')){
          const ms = Math.max(300, data.delay_ms || 1000);
          this.effects.push({type:'latency', x, ttl: ms+800, timer: ms});
          this._rail('latency');
          this._slow(ms);
          if (this.sound) this._tickSequence(3, 300);
        }
        if (k.includes('500')){
          this.effects.push({type:'500', x:x-2, ttl:1800, flash:0});
          this._rail('500'); if (this.sound) this._tone(220,120,'sawtooth',0.12);
        }
        if (k.includes('429')){
          this.effects.push({type:'429', x:x-1, ttl:1600});
          this._rail('429'); if (this.sound) this._tone(120,90,'sine',0.12);
        }
        if (k.includes('malformed')){
          this.effects.push({type:'malformed', x:x-2, y:5, ttl:2400, rotated:false, clunk:true});
          this._rail('malformed'); if (this.sound) this._tone(180,80,'square',0.18);
        }
        if (k.includes('tool')){
          this.effects.push({type:'tool_unavailable', x:x, ttl:2200});
          this._rail('tool'); if (this.sound) this._noise(120,0.08);
        }
        if (k.includes('context')){
          this.effects.push({type:'context_truncate', x:x, ttl:2000, shrink:0});
          this._rail('ctx'); if (this.sound) this._tone(1200,60,'sine',0.08);
        }
        if (k.includes('inject')){
          this.effects.push({type:'inject', x:x, ttl:1600});
          this._rail('trap');
        }
      }
      if (type==='retry'){
        const x = Math.max(6, Math.min(this.gridW-10, Math.floor(this.packet.x)));
        this.effects.push({type:'retry', x, ttl:1200, attempts:data.attempts||1});
        this._rail(`retry(${data.attempts||1})`);
        if (this.sound) this._tone(800 + (data.attempts||1)*100, 60, 'sine', 0.1);
      }
      if (type==='fallback'){
        const x = Math.max(6, Math.min(this.gridW-10, Math.floor(this.packet.x)));
        this.effects.push({type:'fallback', x, ttl:1400, to:data.to||'fallback'});
        this._rail('fallback'); if (this.sound) this._noise(150,0.08);
      }
      if (type==='loop_arrest'){
        this.effects.push({type:'loop', x:42, ttl:1500});
        this._rail('loop'); if (this.sound) this._tone(300,80,'square',0.12);
      }
      if (type==='recovered'){
        this.effects.push({type:'ok', x:58, ttl:1500, label:'RECOVERED ✓'});
        this._rail('ok'); if (this.sound) this._chord([880,1320],120,0.1);
      }
    }

    finish(score){
      this.effects.push({type:'score', x:58, ttl:2200, val:score});
      setTimeout(()=> this.stop(), 900);
    }

    /* ---------- layout ---------- */
    _layout(scenario){
      this.base = this._blank();
      const n = [
        {x:2,y:3,w:10,h:3,label:'CLIENT'},
        {x:18,y:3,w:10,h:3,label:'FETCH'},
        {x:34,y:3,w:13,h:3,label: scenario==='rag' ? 'RETRIEVE' : 'PARSE/QA'},
        {x:53,y:3,w:12,h:3,label:'SUMMARIZE'}
      ];
      n.forEach((b,i)=>{ this._box(this.base,b); if(i<n.length-1) this._pipe(this.base, b.x+b.w, b.y+1, n[i+1].x - (b.x+b.w)); });
    }

    /* ---------- loop ---------- */
    _loop = ()=>{
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(now - this.last, 100); this.last = now;

      // motion
      if (this.packet.active){
        let v = this.packet.speed;
        if (this.mouseSpice && document.getElementById('surprise')?.checked && this._mx){
          const f = 0.9 + (this._mx / (window.innerWidth||1)) * 0.2;
          v *= f;
        }
        this.packet.x += v * dt;
        if (this.packet.x > this.gridW-8) this.packet.x = this.gridW-8;
      }

      // effects
      this.effects = this.effects.map(e=>{
        e.ttl -= dt;
        if (e.type==='latency'){ e.timer = Math.max(0, e.timer - dt); }
        if (e.type==='500' && !e.flash && e.ttl < 1200) e.flash = 1 + Math.floor(this.rand()*3);
        if (e.type==='malformed' && !e.rotated && e.ttl < 1400) { e.rotated = true; e.clunk=false; }
        if (e.type==='context_truncate'){ e.shrink = Math.min(4, (e.shrink||0) + dt*0.002); }
        return e;
      }).filter(e=> e.ttl > 0);

      this._renderFrame();
      this.raf = requestAnimationFrame(this._loop);
    }

    _renderFrame(){
      const g = this._blank();
      // base
      for (let y=0;y<this.gridH;y++)
        for(let x=0;x<this.gridW;x++) g[y][x] = this.base[y][x];
      // packet + trail
      const px = Math.floor(this.packet.x), py = this.packet.y;
      const dot = this.mode==='unicode' ? '●' : '*';
      this._set(g, py, px, dot);
      for (let i=1;i<=3;i++){ const tx=px - i*2; if(tx>1) this._set(g, py, tx, this.mode==='unicode'?'·':'.'); }
      // effects
      for (const e of this.effects) this._effect(g, e);
      // write
      this.pre.textContent = g.map(r=>r.join('')).join('\n');
    }

    /* ---------- effects ---------- */
    _effect(g,e){
      const x = Math.max(1, Math.min(this.gridW-2, Math.floor(e.x||10)));
      if (e.type==='latency'){
        const goo = this.mode==='unicode' ? '~~~~~' : '.....';
        this._text(g, 6, x, goo);
        // hourglass/timer
        const bars = Math.max(1, Math.ceil((e.timer||0)/1000));
        const tStr = this.mode==='unicode' ? ('⏳ '+bars+'s') : `[${'='.repeat(Math.min(3,bars)).padEnd(3)}]`;
        this._text(g, 2, Math.min(x, this.gridW - tStr.length - 1), tStr);
      }
      if (e.type==='500'){
        const cloud = this.mode==='unicode' ? '☁500' : '[500]';
        this._text(g, 1, x, cloud);
        if (e.flash){ this._text(g, 2, x+2, this.mode==='unicode'?'⚡':'!'); }
      }
      if (e.type==='429'){
        const block = this.mode==='unicode' ? '⛔429' : '[429]';
        this._text(g, 4, x, block);
        const rope = this.mode==='unicode' ? '════' : '====';
        this._text(g, 6, x-2, rope);
      }
      if (e.type==='malformed'){
        const peg = e.rotated ? (this.mode==='unicode'?'◇JSON':'<>JSON') : (this.mode==='unicode'?'▢JSON':'[]JSON');
        const port = this.mode==='unicode' ? '◯' : '()';
        this._text(g, 5, x, peg);
        this._text(g, 5, x+8, port);
        if (e.clunk){ this._text(g, 7, x, 'CLUNK!'); }
      }
      if (e.type==='tool_unavailable'){
        this._text(g, 5, x, this.mode==='unicode'?'⊘':'X');
        const door = this.mode==='unicode' ? '╲╲╲' : '\\\\\\';
        this._text(g, 7, x-1, door);
      }
      if (e.type==='context_truncate'){
        const bomb = this.mode==='unicode' ? '💣 ctx' : '[CTX-]';
        this._text(g, 2, x, bomb);
        const boxSize = Math.max(2, 6 - Math.floor(e.shrink||0));
        const box = '+' + '-'.repeat(boxSize) + '+';
        this._text(g, 8, x, box);
      }
      if (e.type==='inject'){
        const trap = this.mode==='unicode' ? '🪤 note' : '[trap]';
        this._text(g, 4, x, trap);
      }
      if (e.type==='retry'){
        this._text(g, 8, x, `retry(${e.attempts||1})`);
      }
      if (e.type==='fallback'){
        this._text(g, 9, x, this.mode==='unicode' ? '🪂 fallback' : '[fallback]');
      }
      if (e.type==='loop'){
        this._text(g, 8, x, this.mode==='unicode' ? 'STOP ⤾' : 'STOP LOOP');
      }
      if (e.type==='ok'){
        this._text(g, 1, x, e.label || (this.mode==='unicode'?'✓':'OK'));
      }
      if (e.type==='score'){
        this._text(g, 1, x, `SCORE ${e.val}`);
      }
    }

    /* ---------- draw prims ---------- */
    _blank(){ return Array.from({length:this.gridH}, _=>Array(this.gridW).fill(' ')); }
    _set(g, y, x, ch){ if (x>=0&&x<this.gridW&&y>=0&&y<this.gridH) g[y][x]=ch; }
    _text(g, y, x, s){ for(let i=0;i<s.length;i++){ const xx=x+i; if(xx>=0&&xx<this.gridW) g[y][xx]=s[i]; } }
    _box(g, {x,y,w,h,label}){
      const c = this.mode==='unicode' ? {tl:'┌',tr:'┐',bl:'└',br:'┘',h:'─',v:'│'} : {tl:'+',tr:'+',bl:'+',br:'+',h:'-',v:'|'};
      g[y][x]=c.tl; g[y][x+w-1]=c.tr; g[y+h-1][x]=c.bl; g[y+h-1][x+w-1]=c.br;
      for (let i=1;i<w-1;i++){ g[y][x+i]=c.h; g[y+h-1][x+i]=c.h; }
      for (let i=1;i<h-1;i++){ g[y+i][x]=c.v; g[y+i][x+w-1]=c.v; }
      if(label){ const lx=x+Math.floor((w-label.length)/2); this._text(g, y+1, lx, label); }
    }
    _pipe(g, x, y, len){
      const arrow = this.mode==='unicode' ? '▶' : '>';
      const pipe  = this.mode==='unicode' ? '─' : '-';
      for(let i=0;i<len-1;i++) this._set(g, y, x+i, pipe);
      this._set(g, y, x+len-1, arrow);
    }

    /* ---------- motion helpers ---------- */
    _slow(ms){
      const orig = this.packet.speed;
      this.packet.speed = Math.max(0.01, orig * 0.3);
      setTimeout(()=> this.packet.speed = orig, ms);
    }

    /* ---------- audio ---------- */
    _audioInit(){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audio = new Ctx();
    }
    _tone(freq, ms, type='sine', gain=0.1){
      if (!this.audio || !this.sound) return;
      const o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type=type; o.frequency.value=freq; g.gain.value=gain;
      o.connect(g); g.connect(this.audio.destination);
      o.start(); o.stop(this.audio.currentTime + ms/1000);
    }
    _noise(ms, gain=0.08){
      if (!this.audio || !this.sound) return;
      const len = this.audio.sampleRate * ms/1000 |0;
      const buf = this.audio.createBuffer(1, len, this.audio.sampleRate);
      const out = buf.getChannelData(0); for(let i=0;i<len;i++) out[i]=this.rand()*2-1;
      const src = this.audio.createBufferSource(), g = this.audio.createGain(), f=this.audio.createBiquadFilter();
      src.buffer=buf; f.type='lowpass'; f.frequency.value=500; g.gain.value=gain;
      src.connect(f); f.connect(g); g.connect(this.audio.destination); src.start();
    }
    _chord(freqs, ms, gain=0.1){ freqs.forEach(f=> this._tone(f,ms,'sine',gain)); }

    /* ---------- event log access ---------- */
    getEventLog(){
      return this.eventLog.slice(); // Return a copy
    }

    /* ---------- timeline rail ---------- */
    _rail(label){
      if (!this.rail) return;
      if (label==='reset'){ this.rail.textContent = 'Timeline: '; return; }
      this.rail.textContent += ` | ${label}`;
      if (this.rail.textContent.length > 140) this.rail.textContent = 'Timeline: ' + this.rail.textContent.slice(-120);
    }
  }

  // Expose globally
  window.ChaosTheatre = ChaosTheatre;
})();