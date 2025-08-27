// Minimal mock HTTP Agent used by Task Mode's HTTP adapter.
// Provides POST /run and GET /healthz.
// Run by Playwright via webServer in playwright.config.ts

const http = require('http');
const port = process.env.MOCK_AGENT_PORT ? Number(process.env.MOCK_AGENT_PORT) : 9009;

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // Simple /run that echoes prompt and inputs
  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const output = `Echo> ${payload.prompt?.slice(0, 140) || ''}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output, trace: [{ tool: 'mock', status: 'ok' }] }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad request' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(port, () => {
  console.log(`[mock-agent] listening on http://localhost:${port}`);
});