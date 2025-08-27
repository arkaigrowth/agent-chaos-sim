
export async function runTask(row, prompt, opts){
  const { baseUrl, chaosFetch, toggles, seed, taskType='qa' } = opts || {};
  if (!baseUrl) throw new Error('HTTP Agent baseUrl required');
  const url = baseUrl.replace(/\/$/,'') + '/run';
  const init = {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ prompt, inputs: row, meta:{ task: taskType } })
  };
  const fetcher = chaosFetch || fetch;
  let res;
  if (fetcher === fetch) res = await fetch(url, init);
  else res = await fetcher(url, seed, toggles, init);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  return { output: json.output, trace: json.trace || [] };
}
