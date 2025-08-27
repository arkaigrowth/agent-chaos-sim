
# Runner fallback patch (trace semantics)

To ensure the Resilience score reflects degraded operation, mark **fallback** outcomes as `status:'failed'`.
Only **successful retry** should be counted as `status:'recovered'`.

Examples to change in your runners:

```diff
- trace.end(i++,'extract_structured', t0, 'recovered', { fault:'malformed_json', action:'fallback' });
+ trace.end(i++,'extract_structured', t0, 'failed',    { fault:'malformed_json', action:'fallback' });
```

```diff
- trace.end(i++, tool, t0, 'recovered', { fault:String(res.status), action:'fallback' });
+ trace.end(i++, tool, t0, 'failed',    { fault:String(res.status), action:'fallback' });
```

Also ensure you **throw on non-OK HTTP** so 500/429 register as faults:

```js
const rr = chaos ? await chaosFetch(url, seed, toggles) : await fetch(url);
if (!rr.ok) throw new Error(`HTTP ${rr.status}`);
```
