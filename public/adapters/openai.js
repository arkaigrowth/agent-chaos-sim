
export async function runTask(row, prompt, opts){
  const { apiKey, model='gpt-4o-mini', chaosFetch, toggles, seed } = opts || {};
  if (!apiKey) throw new Error('OpenAI API key required');
  const body = {
    model, temperature: 0.2,
    messages: [{ role:'user', content: prompt }]
  };
  const url = 'https://api.openai.com/v1/chat/completions';
  const init = {
    method:'POST',
    headers:{
      'Authorization':'Bearer ' + apiKey,
      'Content-Type':'application/json'
    },
    body: JSON.stringify(body)
  };
  const fetcher = chaosFetch || fetch;
  let res;
  if (fetcher === fetch) res = await fetch(url, init);
  else res = await fetcher(url, seed, toggles, init);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const output = json?.choices?.[0]?.message?.content || '';
  return { output, trace:[{tool:'openai', duration_ms:0, status:'ok'}] };
}
