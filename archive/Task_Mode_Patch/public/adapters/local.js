
export async function runTask(row, prompt, opts){
  // Local "agent": deterministic stub for demos, no network
  const delay = (ms)=> new Promise(r=>setTimeout(r, ms));
  const ms = Math.min(800, ((String(row.id||'0').length + (prompt?.length||0)) % 500) + 120);
  await delay(ms);
  let output = '';
  if (row.answer) output = String(row.answer);
  else if (row.expected) output = String(row.expected);
  else output = `DEMO_ANSWER: ${(row.question || '').toString().slice(0,120)}`;
  return { output, trace: [{tool:'local', duration_ms: ms, status:'ok'}] };
}
