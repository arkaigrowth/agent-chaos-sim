Chaos Theatre (ASCII) — Visual Fault-Injection Stage

A seeded, lightweight ASCII visualization for Agent Chaos Monkey. It shows packets moving through a pipeline while faults (500, 429, latency, malformed JSON, tool-off, context truncate, benign injection) strike and Tripwire recovers (retry / exponential backoff + jitter, fallback, loop arrest). Ships with micro-sound cues, Unicode→ASCII fallback, a timeline rail, and a Playground for demoing without the full app.

Why this exists
	•	Make chaos visible — judges and users instantly see retries, fallbacks, and loop arrests.
	•	Deterministic — uses the same seed as the run → the same show every time.
	•	Safe & fast — client-only; one <pre> updated per frame; reduced-motion aware.

⸻

File layout

/public/
  theatre.js           # ChaosTheatre class (seeded RNG, renderer, audio, event API, event log)
  theatre.css          # Styles for stage + timeline
  playground.html      # Standalone demo (no build step)
  canvas_preview.html  # Optional: draws ASCII frames onto <canvas> (preview only)
  bridge_example.js    # Example: wire run engine → theatre.event(...)
  copy_tooltips.yml    # Tooltip text for theatre toggles (if copy-loader used)


⸻

Insert anchors (so Claude doesn’t duplicate UI)

In index.html:
	•	Insert the Chaos Theatre card after the “4) Run” card and before the Compare/Results cards:

<!-- ⛳ INSERT Chaos Theatre HERE: after Run, before Compare/Results -->
<section class="card" id="chaosTheatreCard">
  <h2>Chaos ASCII Theatre (beta)</h2>
  <div class="row">
    <label><input id="asciiOnly" type="checkbox"> ASCII-only</label>
    <label><input id="soundOn" type="checkbox"> Sound ON</label>
    <label><input id="mouseSpice" type="checkbox"> Mouse spice</label>
  </div>
  <pre id="stage" class="ascii" aria-live="polite" aria-label="Chaos visualization"></pre>
  <div id="timelineRail" class="timeline">Timeline: </div>
  <div class="hint">
    Legend: ● packet · ☁500 · ⛔429 · ⏳ latency · ▢→◇ malformed · ⊘ tool · 💣 ctx · ✓ recovered
  </div>
</section>

	•	Include assets once, near the bottom before your app script (keep root /public paths, no type="module" unless you change all scripts):

<link rel="stylesheet" href="/public/theatre.css" />
<script src="/public/theatre.js"></script>

Do not rename IDs. Do not move assets to /public/ unless you update these paths.

⸻

Selector / ID map (authoritative)

These IDs must exist in your page and remain stable:

# Seeding / randomness
seed:        "#seed"
surprise:    "#surprise"

# Chaos toggles (UI percent or numeric)
latency_ms:      "#latencyMs"       # number (ms)
latency_rate:    "#latencyRate"     # percent 0–100 in UI
http_500_rate:   "#http500Rate"     # percent
rate_429:        "#rate429"         # percent
malformed_rate:  "#malformedRate"   # percent
inj_seed:        "#injSeed"         # string
ctx_bytes:       "#ctxBytes"        # number (bytes)

# Theatre UI
ascii_only:  "#asciiOnly"
sound_on:    "#soundOn"
mouse_spice: "#mouseSpice"

# Theatre elements
stage:        "#stage"
timeline_rail:"#timelineRail"

If your IDs differ, change them in one place in bridge_example.js or wherever you set toggles.

⸻

Runner API expectations

Chaos Theatre & Evals need a way to run scenarios programmatically and get back metrics (score, mttr, etc.) and optionally events. Support either:

Option A (preferred)

// Called by eval harness; should internally call your scenario function(s)
async function runScenario(scenario /* 'fetch'|'json'|'rag' */, seed, chaosOn) {
  // returns: { metrics: {...}, events?: [...] }
}

Option B (split)

async function runFetch(chaosOn) { return { metrics, events? } }
async function runJSON(chaosOn)  { return { metrics, events? } }
async function runRAG(chaosOn)   { return { metrics, events? } }

If runners don’t return events, Chaos Theatre exposes theatre.getEventLog() which the eval harness will call to fetch a typed timeline.

⸻

Integrate with your app (5 lines + events)
	1.	Include assets:

<link rel="stylesheet" href="/public/theatre.css" />
<script src="/public/theatre.js"></script>

	2.	Create theatre and start with seed + scenario (on each run):

const theatre = new ChaosTheatre();
theatre.start(String(seed), scenarioName /* 'fetch'|'rag'|'json' */);

	3.	Emit events where your trace updates (examples, minimal):

// faults
theatre.event('fault', { type:'latency', delay_ms:2000 });
theatre.event('fault', { type:'500' });              // or '429'
theatre.event('fault', { type:'malformed_json' });
theatre.event('fault', { type:'tool_unavailable' });
theatre.event('fault', { type:'context_truncate' });
theatre.event('fault', { type:'inject' });

// recovery beats
theatre.event('retry', { attempts: 2, backoff_ms: 800 });
theatre.event('fallback', { to: 'cached' });
theatre.event('loop_arrest', {});
theatre.event('recovered', { action: 'retry(2)' });

	4.	After computing score, call:

theatre.finish(metrics.score);

	5.	If you need the event log (eval harness uses this if runners don’t return events):

const events = theatre.getEventLog(); // [{t,type,...}, ...]

The viz is cosmetic only—events never alter logic.

⸻

Event API (stable v1)

theatre.start(seed: string, scenario: 'fetch'|'rag'|'json');

theatre.event('fault',      { type: '500'|'429'|'latency'|'malformed_json'|'tool_unavailable'|'context_truncate'|'inject', delay_ms?: number });
theatre.event('retry',      { attempts: number, backoff_ms?: number });
theatre.event('fallback',   { to?: 'cached'|'alt_tool'|'degraded' });
theatre.event('loop_arrest',{});
theatre.event('recovered',  { action?: string });
theatre.finish(score: number);

theatre.getEventLog(): Array<{t:number,type:string,[k:string]:any}>


⸻

Unicode → ASCII fallback map

Concept	Unicode	ASCII-only
Packet	●	*
Arrow	▶	>
Storm 500	☁500	[500]
Bouncer 429	⛔429	[429]
Latency goo	~~~~~	.....
Hourglass	⏳	[wait]
Malformed peg	▢ JSON	[]JSON
Round port	◯	()
Rotated peg	◇ JSON	<>JSON
Tool off	⊘	X
Context bomb	💣 ctx	[CTX-]
Trap note	🪤 note	[trap]
Recovered	✓	OK
Loop arrest	⤾	LOOP
Parachute	parachute ↓	[fallback]


⸻

Toggles & Accessibility
	•	ASCII-only — deterministic mapping; set via #asciiOnly.
	•	Sound ON — tiny WebAudio cues, initialized on first user interaction (#soundOn).
	•	Mouse spice — small speed jitter while “Surprise me” is ON (#mouseSpice + #surprise).
	•	Reduced Motion — honors prefers-reduced-motion (caps FPS, reduces wobble).
	•	ARIA — <pre id="stage" aria-live="polite">; timeline is visible text.

⸻

Playground (no app required)

Open public/playground.html:
	•	Seed + scenario + Start
	•	Toggle ASCII-only, Sound, Mouse spice
	•	Trigger faults (Latency/500/429/Malformed/Tool/Context/Inject) and recoveries (Retry/Fallback/Loop/Recovered)
	•	Timeline rail stamps events as they occur

Quick host: python -m http.server and visit http://localhost:8000/public/playground.html.

⸻

Acceptance tests (non-negotiable)
	1.	Baseline → progress toast shows; Theatre animates; no fault overlays; score high.
	2.	Chaos (latency=2000@20, 500@10, malformed=15) →
	•	see goo + ⏳, storm 500, malformed ▢JSON bonk → rotate to ◇JSON → recovered or parachute fallback
	•	Theatre score lower; Compare card shows Δ score
	3.	Toggle ASCII-only → glyphs degrade cleanly.
	4.	Toggle Sound ON → hear ticks/woosh/ding on retry/fallback/recovered.
	5.	?copy=creative swaps headings/tooltips; Theatre still works.

⸻

Troubleshooting
	•	Nothing animates → check asset paths (/public/theatre.js, /public/theatre.css), ensure you call theatre.start(seed, scenario) on run start.
	•	Undefined events in evals → add theatre.getEventLog() or return events from your runners.
	•	Wrong selectors → fix IDs in the Selector map once and update the bridge.
	•	Sound doesn’t play → enable Sound toggle after user click (Chrome policy).
	•	Perf → caps to 60 fps (20 fps when reduced-motion). Single RAF; zero extra DOM nodes.

⸻

Suggested Claude Code agents (from index)
	•	frontend-developer (primary)
	•	Insert Theatre card at the anchor
	•	Wire toggles & call theatre.start() + theatre.finish()
	•	Emit events in runners (faults, retries, fallback, loop, recovered)
	•	Ensure theatre.getEventLog() works
	•	✅ Route with: "UI|component|frontend"
	•	ui-designer-superdesign
	•	Tune hazard theme, typography, spacing; ensure readability
	•	✅ Route with: "design|responsive|component"
	•	game-developer (optional)
	•	Micro-optimize RAF & TTL effects; add gentle easing & polish
	•	✅ Route with: "game|animation"
	•	technical-writer
	•	Polish docs, /docs/faq.md, and in-app tooltips (copy_tooltips.yml)
	•	✅ Route with: "documentation|technical content"
	•	product-manager / content-marketer
	•	Tighten hero & 60s “how it works” strip, pick the best CTA lines
	•	✅ Route with: "product strategy|content"
	•	error-coordinator (optional)
	•	Validate event wiring mirrors real fault/retry edges (no missed beats)
	•	✅ Route with: "error handling|resilience"

If you also add Evals, include qa-automation (or let fullstack-developer handle Playwright CI).

Final note for Claude Code implementers
	•	Do: follow the Selector map & insert anchors exactly; keep /public paths; use theatre.start(seed, scenario) and theatre.finish(score).
	•	Don’t: change script types to modules without updating index; add servers; rename IDs; or move asset files.
	•	Pass the Acceptance tests before polish.