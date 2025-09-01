// Example: wire your run engine to Chaos Theatre
// 1) Create theatre once (after DOM ready):
// const theatre = new ChaosTheatre();
// 2) On run start:
/*
theatre.start(seedString, scenarioName); // e.g., "1337", "fetch"
*/
// 3) Emit events where your trace updates:
/*
theatre.event('fault', { type:'latency', delay_ms:2000 });
theatre.event('fault', { type:'500' });
theatre.event('fault', { type:'malformed_json' });
theatre.event('retry', { attempts:2, backoff_ms:800 });
theatre.event('fallback', { to:'cached' });
theatre.event('loop_arrest', {});
theatre.event('recovered', { action:'retry(2)' });
*/
// 4) On completion:
/*
theatre.finish(score);
*/