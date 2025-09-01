# Manual Browser Tests for Chaos Monkey System

These tests should be run in the browser console to manually verify the chaos system functionality.

## Prerequisites
1. Open the application in browser (localhost:5173 or deployed URL)
2. Close the onboarding modal if it appears
3. Open browser Developer Tools (F12) and go to Console tab

## Test 1: Verify Global Functions Exist

```javascript
// Check if all key functions are available on window
console.log("=== Test 1: Global Functions Availability ===");
const functions = [
    'runScenario',
    'should', 
    'readToggles',
    'chaosJSON',
    'runFetch',
    'runJSON', 
    'runRAG'
];

functions.forEach(fn => {
    const exists = typeof window[fn] === 'function';
    console.log(`${fn}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
});

// Check should() function specifically
if (typeof window.should === 'function') {
    console.log("Testing should() function:");
    console.log(`should(100, () => 0.5): ${window.should(100, () => 0.5)} (should be true)`);
    console.log(`should(0, () => 0.5): ${window.should(0, () => 0.5)} (should be false)`);
    console.log(`should(50, () => 0.3): ${window.should(50, () => 0.3)} (should be true)`);
    console.log(`should(50, () => 0.7): ${window.should(50, () => 0.7)} (should be false)`);
} else {
    console.error("should() function not available!");
}
```

## Test 2: Test readToggles() Configuration

```javascript
// Test reading current configuration
console.log("=== Test 2: readToggles() Configuration ===");

if (typeof window.readToggles === 'function') {
    const config = window.readToggles();
    console.log("Current configuration:", config);
    
    // Verify configuration has expected properties
    const expectedProps = [
        'latencyMs', 'latencyRate', 'http500Rate', 'rate429', 
        'malformedRate', 'toolUnavailableSteps', 'injSeed', 'ctxBytes'
    ];
    
    expectedProps.forEach(prop => {
        const exists = config.hasOwnProperty(prop);
        console.log(`${prop}: ${exists ? '✅' : '❌'} ${exists ? config[prop] : 'MISSING'}`);
    });
} else {
    console.error("readToggles() function not available!");
}
```

## Test 3: Test Chaos Injection with 100% Malformed Rate

```javascript
// Test chaos injection with guaranteed malformed JSON
console.log("=== Test 3: Chaos Injection Test ===");

// Set 100% malformed rate
document.getElementById('malformedRate').value = '100';
document.querySelector('input[value="json"]').checked = true;

console.log("Configuration set to:");
console.log("- Scenario: JSON");
console.log("- Malformed Rate: 100%");

// Run chaos test
document.getElementById('btnChaos').click();

// Wait for test to complete and check results
setTimeout(() => {
    const scoreBadge = document.getElementById('scoreBadge');
    const scoreText = scoreBadge ? scoreBadge.textContent : 'NOT FOUND';
    console.log(`Score after 100% malformed test: ${scoreText}`);
    
    // Check if we have trace data
    if (window.__LAST__) {
        const faults = window.__LAST__.rows.filter(r => r.fault);
        console.log(`Faults detected: ${faults.length}`);
        console.log(`Total steps: ${window.__LAST__.rows.length}`);
        console.log(`Score from __LAST__: ${window.__LAST__.metrics.score}`);
        
        faults.forEach((fault, i) => {
            console.log(`Fault ${i+1}: ${fault.fault} (step ${fault.i})`);
        });
        
        if (faults.length === 0) {
            console.error("❌ NO FAULTS DETECTED - This indicates the chaos system may not be working!");
        } else {
            console.log("✅ Faults detected successfully");
        }
    } else {
        console.error("❌ No __LAST__ data found - test may have failed");
    }
}, 8000); // Wait 8 seconds for test to complete

console.log("Test started - wait 8 seconds for results...");
```

## Test 4: Direct chaosJSON Function Test

```javascript
// Test chaosJSON function directly
console.log("=== Test 4: Direct chaosJSON Test ===");

if (typeof window.chaosJSON === 'function') {
    // Create test configuration with 100% malformed rate
    const testConfig = {
        malformedRate: 100, // 100% chance
        http500Rate: 0,
        rate429: 0,
        latencyMs: 0,
        latencyRate: 0
    };
    
    console.log("Testing chaosJSON with 100% malformed rate...");
    
    // Test with a known JSON endpoint
    window.chaosJSON('https://jsonplaceholder.typicode.com/posts/1', 'test-seed-123', testConfig)
        .then(response => response.text())
        .then(text => {
            console.log("Raw response text:", text);
            console.log("Response length:", text.length);
            
            // Try to parse as JSON to see if it's malformed
            try {
                const parsed = JSON.parse(text);
                console.log("❌ JSON parsed successfully - malformation may not have worked");
                console.log("Parsed object:", parsed);
            } catch (e) {
                console.log("✅ JSON parsing failed as expected:", e.message);
                console.log("This confirms malformed injection worked!");
            }
        })
        .catch(error => {
            console.error("chaosJSON test failed:", error);
        });
} else {
    console.error("chaosJSON function not available!");
}
```

## Test 5: Manual Score Drop Verification

```javascript
// Test that demonstrates score dropping with faults
console.log("=== Test 5: Score Drop Verification ===");

// First run baseline
console.log("Running baseline test...");
document.getElementById('malformedRate').value = '0';
document.getElementById('http500Rate').value = '0';
document.getElementById('rate429').value = '0';
document.querySelector('input[value="json"]').checked = true;

document.getElementById('btnBaseline').click();

setTimeout(() => {
    const baselineScore = window.__BASELINE__ ? window.__BASELINE__.score : null;
    console.log(`Baseline score: ${baselineScore}`);
    
    if (baselineScore !== null) {
        // Now run with chaos
        console.log("Running chaos test with high fault rates...");
        document.getElementById('malformedRate').value = '100';
        document.getElementById('http500Rate').value = '50';
        
        document.getElementById('btnChaos').click();
        
        setTimeout(() => {
            const chaosScore = window.__LAST__ ? window.__LAST__.metrics.score : null;
            console.log(`Chaos score: ${chaosScore}`);
            
            if (chaosScore !== null && baselineScore !== null) {
                const difference = baselineScore - chaosScore;
                console.log(`Score difference: ${difference}`);
                
                if (difference > 0) {
                    console.log("✅ SUCCESS: Score dropped with chaos as expected!");
                } else {
                    console.log("❌ FAILURE: Score did not drop with chaos");
                }
            } else {
                console.error("❌ Could not compare scores - missing data");
            }
        }, 8000);
    } else {
        console.error("❌ Baseline test failed - could not get baseline score");
    }
}, 8000);

console.log("Running baseline + chaos comparison - wait 16 seconds for full results...");
```

## Test 6: Example Cards Configuration Test

```javascript
// Test that example cards apply configurations correctly
console.log("=== Test 6: Example Cards Test ===");

// Wait for examples to load
setTimeout(() => {
    const exampleCards = document.querySelectorAll('#examplesGrid .ex');
    console.log(`Found ${exampleCards.length} example cards`);
    
    if (exampleCards.length > 0) {
        // Test clicking the first card
        const firstCard = exampleCards[0];
        const cardTitle = firstCard.querySelector('h3')?.textContent || 'Unknown';
        console.log(`Clicking on: ${cardTitle}`);
        
        // Record values before click
        const beforeValues = {
            malformed: document.getElementById('malformedRate').value,
            http500: document.getElementById('http500Rate').value,
            rate429: document.getElementById('rate429').value,
            latency: document.getElementById('latencyMs').value
        };
        console.log("Values before click:", beforeValues);
        
        // Click the card
        firstCard.click();
        
        // Check values after click
        setTimeout(() => {
            const afterValues = {
                malformed: document.getElementById('malformedRate').value,
                http500: document.getElementById('http500Rate').value,
                rate429: document.getElementById('rate429').value,
                latency: document.getElementById('latencyMs').value
            };
            console.log("Values after click:", afterValues);
            
            // Check if any values changed
            const changed = Object.keys(beforeValues).some(key => 
                beforeValues[key] !== afterValues[key]
            );
            
            if (changed) {
                console.log("✅ SUCCESS: Example card applied configuration changes");
            } else {
                console.log("❌ FAILURE: No configuration changes detected");
            }
        }, 1000);
    } else {
        console.error("❌ No example cards found!");
    }
}, 2000);
```

## Test 7: End-to-End Chaos Verification

```javascript
// Complete end-to-end test that verifies the entire chaos pipeline
console.log("=== Test 7: End-to-End Chaos Verification ===");

// Setup known configuration
console.log("Setting up test configuration...");
document.getElementById('malformedRate').value = '100';
document.getElementById('http500Rate').value = '30';
document.getElementById('rate429').value = '20';
document.getElementById('latencyMs').value = '1000';
document.getElementById('latencyRate').value = '50';
document.querySelector('input[value="json"]').checked = true;

// Record configuration
const testConfig = window.readToggles();
console.log("Test configuration:", testConfig);

// Run the test
console.log("Running chaos test...");
document.getElementById('btnChaos').click();

// Wait for completion and analyze results
setTimeout(() => {
    console.log("=== RESULTS ANALYSIS ===");
    
    if (window.__LAST__) {
        const { rows, metrics } = window.__LAST__;
        
        console.log(`Final Score: ${metrics.score}`);
        console.log(`Total Steps: ${rows.length}`);
        console.log(`Steps with Faults: ${rows.filter(r => r.fault).length}`);
        console.log(`Success Rate: ${metrics.success_after_fault * 100}%`);
        console.log(`MTTR: ${metrics.mttr_s}s`);
        
        // Analyze fault types
        const faultTypes = {};
        rows.filter(r => r.fault).forEach(row => {
            faultTypes[row.fault] = (faultTypes[row.fault] || 0) + 1;
        });
        
        console.log("Fault Type Distribution:");
        Object.entries(faultTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} occurrences`);
        });
        
        // Verification checks
        const checks = {
            "Score < 100": metrics.score < 100,
            "Faults injected": rows.some(r => r.fault),
            "Malformed faults present": rows.some(r => r.fault === 'malformed_json'),
            "Score > 0": metrics.score > 0
        };
        
        console.log("\n=== VERIFICATION CHECKS ===");
        Object.entries(checks).forEach(([check, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${check}`);
        });
        
        const allPassed = Object.values(checks).every(v => v);
        console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
        
    } else {
        console.error("❌ No test results found - chaos system may be broken");
    }
}, 10000);

console.log("End-to-end test started - wait 10 seconds for complete analysis...");
```

## How to Run These Tests

1. **Copy each test block** from above
2. **Paste into browser console** while on the chaos lab page
3. **Press Enter** to execute
4. **Wait for results** as indicated in each test
5. **Look for ✅ SUCCESS or ❌ FAILURE** messages

## Expected Results Summary

- **Test 1**: All functions should exist (✅)
- **Test 2**: Configuration should load with all expected properties (✅) 
- **Test 3**: Score should be < 100% with 100% malformed rate (✅)
- **Test 4**: chaosJSON should produce unparseable JSON (✅)
- **Test 5**: Chaos score should be lower than baseline score (✅)
- **Test 6**: Example cards should change input values (✅)
- **Test 7**: Complete pipeline should inject faults and reduce score (✅)

If any test fails, it indicates an issue with the chaos system that needs investigation.