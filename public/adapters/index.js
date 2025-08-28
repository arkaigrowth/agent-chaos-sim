
(function(global){
  const cache = {};
  async function getAdapter(name){
    if (cache[name]) return cache[name];
    if (name === 'local') {
      cache[name] = await import('/adapters/local.js');
    } else if (name === 'openai') {
      cache[name] = await import('/adapters/openai.js');
    } else if (name === 'http') {
      cache[name] = await import('/adapters/http-agent.js');
    } else {
      throw new Error('Unknown adapter: ' + name);
    }
    return cache[name];
  }
  global.TaskAdapters = { getAdapter };
})(window);
