// Live test script to verify scoring system
// Run this directly in the browser console at http://localhost:5173

console.log('🧪 Testing Chaos Scoring System Live...\n');

// Test 1: Check if functions are exposed
console.log('1️⃣ Checking global functions...');
console.log('window.computeScore exists:', typeof window.computeScore === 'function');
console.log('window.applyFaultConfiguration exists:', typeof window.applyFaultConfiguration === 'function');

// Test 2: Apply high fault rate
console.log('\n2️⃣ Setting 100% malformed JSON rate...');
document.getElementById('malformedRate').value = 100;
console.log('Malformed rate set to:', document.getElementById('malformedRate').value);

// Test 3: Select JSON scenario
console.log('\n3️⃣ Selecting JSON scenario...');
const jsonRadio = document.querySelector('input[type="radio"][value="json"]');
if (jsonRadio) {
    jsonRadio.checked = true;
    console.log('JSON scenario selected');
} else {
    console.log('Looking for JSON radio by label...');
    const labels = Array.from(document.querySelectorAll('label'));
    const jsonLabel = labels.find(l => l.textContent.includes('JSON'));
    if (jsonLabel) {
        const radio = jsonLabel.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
            console.log('JSON scenario selected via label');
        }
    }
}

// Test 4: Run with chaos
console.log('\n4️⃣ Running chaos test...');
console.log('Click the "Run with Chaos" button to test');
console.log('After running, check:');
console.log('  - window.__LAST__ for trace data');
console.log('  - Score badge should show < 100%');
console.log('  - Look for faults in the trace');

// Helper to check results after run
window.checkResults = function() {
    console.log('\n📊 Checking results...');
    
    // Check trace
    if (window.__LAST__) {
        const trace = window.__LAST__;
        const faults = trace.rows.filter(r => r.fault);
        console.log(`Found ${faults.length} faults in trace:`, faults);
        
        // Check score
        if (trace.score !== undefined) {
            console.log('Score:', trace.score);
            if (trace.score < 100) {
                console.log('✅ SUCCESS! Score is less than 100%');
            } else {
                console.log('⚠️ Score is still 100% despite faults');
            }
        }
    } else {
        console.log('No trace data found in window.__LAST__');
    }
    
    // Check score badge
    const scoreBadge = document.getElementById('scoreBadge');
    if (scoreBadge) {
        console.log('Score badge shows:', scoreBadge.textContent);
    }
};

console.log('\n✨ Test script loaded!');
console.log('Run window.checkResults() after clicking "Run with Chaos"');