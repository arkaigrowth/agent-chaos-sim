## What exactly is Chaos Lab?

A browser-based fault injector for AI agents. Pick a scenario (web scrape, RAG Q&A, JSON parse), dial up failures (500s, latency, bad JSON), run with/without retries. Get a trace + resilience score. Zero API keys needed.

## When should I use this?

Before shipping any agent that touches external APIs. After adding retry logic but before trusting it. When debugging "works on my machine" issues. When you need to prove your agent won't fold under pressure.

## How's the Resilience Score calculated?

`Score = (Tasks Completed / Total Tasks) × Recovery Factor × Speed Penalty`. Recovery Factor rewards clean error handling. Speed Penalty dings excessive retries. 70%+ means production-ready. Under 50% means brittleness.

## Can I reproduce exact runs?

Yes. Every run gets a permalink with seed + config hash. Same seed = same fault sequence. Share the link, get identical chaos. Export config.yml for version control.

## Is this safe to run?

100% sandboxed. No real APIs hit. Benign prompt injections only (no jailbreaks). Faults stay in-browser. Your agent code never leaves the page. Safe for demos, safe for prod planning.