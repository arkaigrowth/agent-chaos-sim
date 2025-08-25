# Chaos Engineering for Agents — Mini RAG Doc

**MTTR** (Mean Time To Recovery) measures how fast a system recovers after a fault.  
**Backoff with jitter** spreads retries to avoid thundering herds.  
**Idempotency** means repeating the same step yields the same effect (safe to retry).

Tripwire defaults: loop arrest after N identical actions, exponential backoff (base 250ms, factor 2, jitter 20%), fallback to a cached summary.

This doc is used by the Mini‑RAG preset so the Space can answer:
- What is MTTR?
- Why backoff with jitter?
