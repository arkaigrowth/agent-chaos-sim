# Evals — Chaos Lab

Run deterministic, seedable **resilience** and **answer quality** evaluations against the three demo scenarios and chaos toggles.

## Entry points
- `window.runScenario(scenario, seed, chaosOn)` → `{ metrics, events? }`
- `theatre.getEventLog()` → typed timeline if runner didn't return events
- (optional) `window.getAnswer(scenario, prompt)` → string for `answer_match`

## Programmatic
```js
await window.runEvalSuite('reliability_core', true); // include baseline
```
