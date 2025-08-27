
// Drop this function into your scripts (replace existing window.computeScore if desired)
window.computeScore = function computeScore(rows, { mttrTarget } = { mttrTarget: 30 }){
  let faults=0, recovered=0, retries=0, loops=0, fallbacks=0;
  const durs=[];

  for (const r of rows){
    const isFault = !!r.fault || r.action==='fallback' || r.status==='failed' || (r.action?.startsWith('retry'));
    if (isFault) faults++;
    if (r.status==='recovered' && r.action?.startsWith('retry')) recovered++; // retry-only counts as recovered
    if (r.action?.startsWith('retry')) retries++;
    if (r.action==='loop_arrest') loops++;
    if (r.action==='fallback') fallbacks++;
    if (r.duration_ms) durs.push(r.duration_ms);
  }

  const mttr = durs.length ? durs.reduce((a,b)=>a+b,0)/durs.length/1000 : 0;
  const mttr_norm = Math.min(1, mttr / (mttrTarget || 30));
  const success = faults ? (recovered / faults) : 1;

  const fallbackPenalty = Math.min(0.3, fallbacks * 0.05); // each fallback dents up to 5%, capped 30%
  const base = (50*success + 30*(1-mttr_norm) + 20*1.0) / 100;
  const score = Math.round(100 * Math.max(0, base - fallbackPenalty));

  return {
    success_after_fault: success,
    mttr_s: mttr,
    idempotency: 1.0,
    score,
    retries,
    loop_arrests: loops,
    rollbacks: fallbacks
  };
};
