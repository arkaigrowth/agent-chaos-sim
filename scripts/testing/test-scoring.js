// Test script to verify scoring works correctly
// Run this in the browser console at http://localhost:5173

async function testScoring() {
  console.log('🧪 Testing Chaos Scoring System...\n');
  
  // Test 1: Check if computeScore function exists
  console.log('1️⃣ Checking computeScore function...');
  if (typeof computeScore === 'function') {
    console.log('✅ computeScore function found');
    
    // Test with sample data
    const testRows = [
      { i: 1, tool: 'test', duration_ms: 100, status: 'ok', fault: 'http_500', action: 'retry(2)' },
      { i: 2, tool: 'test', duration_ms: 200, status: 'recovered', fault: 'malformed_json' },
      { i: 3, tool: 'test', duration_ms: 150, status: 'ok' }
    ];
    
    const score = computeScore(testRows, { mttrTarget: 30 });
    console.log('Test score calculation:', score);
    console.log('  - Faults detected:', score.success_after_fault !== 1);
    console.log('  - Score:', score.score);
  } else {
    console.error('❌ computeScore function not found');
  }
  
  // Test 2: Run actual scenario with chaos
  console.log('\n2️⃣ Running JSON scenario with 100% malformed rate...');
  
  // Set 100% malformed JSON
  document.getElementById('malformedRate').value = 100;
  
  // Select JSON scenario
  const jsonLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('JSON'));
  if (jsonLabel) {
    const radio = jsonLabel.querySelector('input[type="radio"]');
    if (radio) {
      radio.checked = true;
      console.log('✅ JSON scenario selected');
    }
  }
  
  // Click Run with Chaos button
  const chaosBtn = document.getElementById('btnChaos');
  if (chaosBtn) {
    console.log('✅ Running chaos test...');
    chaosBtn.click();
    
    // Wait for completion
    setTimeout(() => {
      const scoreBadge = document.getElementById('scoreBadge');
      if (scoreBadge) {
        const scoreText = scoreBadge.textContent;
        console.log('✅ Test complete! Score:', scoreText);
        
        const scoreNum = parseInt(scoreText.replace('%', ''));
        if (scoreNum < 100) {
          console.log('🎉 SUCCESS! Score is less than 100% when faults are injected');
        } else {
          console.log('⚠️  WARNING: Score is still 100% despite faults');
          console.log('Check the trace for fault tracking');
        }
      }
    }, 3000);
  }
  
  // Test 3: Check trace for faults
  console.log('\n3️⃣ Checking last trace for faults...');
  if (window.lastTrace) {
    const faults = window.lastTrace.rows.filter(r => r.fault);
    console.log(`Found ${faults.length} faults in trace:`, faults);
  }
}

// Run the test
testScoring();