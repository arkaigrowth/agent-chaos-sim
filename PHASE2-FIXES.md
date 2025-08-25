# Phase 2 Architecture Fixes - Chaos Testing System

## Summary
Phase 2 fixes completed the architecture improvements started in Phase 1 by addressing function exposure and chaos parameter flow issues.

## Issues Fixed

### 1. Function Exposure Issue ✅
**Problem**: `window.runScenario` couldn't access `runFetch`, `runJSON`, and `runRAG` functions (showing as `undefined`)

**Root Cause**: Functions were declared in global scope but not explicitly exposed to window object

**Fix**: Added explicit window assignments in `app.js` lines 1794-1796:
```javascript
// Phase 2 Fix: Expose internal functions to window for access by window.runScenario
window.runFetch = runFetch;
window.runJSON = runJSON;
window.runRAG = runRAG;
```

### 2. Chaos Parameter Flow ✅
**Verification**: Confirmed chaos parameter propagates correctly through the call chain:
- `window.runScenario(scenario, seed, chaosOn)` 
- → `runJSON(seed, chaosOn, t, tw, trace, progress)`
- → `res = chaos? await chaosJSON(url,seed,t,0) : await fetch(url)`

**Implementation**: Conditional logic in `runJSON` (line 250) correctly uses `chaos` parameter to decide between `chaosJSON()` and `fetch()`

### 3. Seeded Random Functions ✅
**Verification**: Confirmed `should()` and `seeded()` functions work correctly for deterministic chaos injection:

- `seeded(seed)`: Creates deterministic PRNG from string seed (line 6)
- `should(rate, rand)`: Returns true if rate > 0 and rand() < rate (line 9)  
- Usage in `chaosJSON`: `should(t.malformedRate, seeded(seed+":cjson:"+attempt))` (line 81)

## Architecture Validation

### Function Call Chain
```
window.runScenario('json', seed, true)
  └── runJSON(seed, true, t, tw, trace, progress)
      └── chaosJSON(url, seed, t, 0)  [when chaos=true]
          └── should(t.malformedRate, seeded(seed+":cjson:"+attempt))
              └── Deterministic chaos injection based on seed
```

### Debug Logging
Phase 1 comprehensive logging remains active:
- `[DEBUG] window.runScenario() ENTRY` - Entry point tracking
- `[DEBUG] runJSON() ENTRY` - Function parameter validation  
- `[DEBUG] chaosJSON() - should check result` - Chaos decision logging

### Test Coverage
Created `test-phase2.html` with validation for:
1. Function exposure verification
2. Chaos parameter flow testing (baseline vs chaos runs)
3. Seeded random function determinism testing

## Status
✅ **Phase 2 Complete**: All architectural issues resolved
- Function exposure fixed
- Chaos parameter flow validated  
- Seeded random functions working correctly
- Theatre remains disabled (Phase 1 safety measure)
- Recursion protection in place (Phase 1 runInProgress flag)

## Next Steps
The chaos testing system architecture is now fully functional. The system can:
- Execute programmatic scenarios via `window.runScenario()`
- Inject deterministic chaos based on seed values
- Trace execution with comprehensive debug logging
- Handle both baseline and chaos testing modes