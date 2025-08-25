// Quick Manual Test - Run in browser console
// Copy and paste this entire block into the browser console at http://localhost:5173

console.log('🚀 Starting Quick Manual Test for Phase 3 UI Integration\n');

// Test 1: Verify readToggles() converts percentages correctly
console.log('1️⃣ Testing readToggles() conversion:');
document.getElementById('latencyRate').value = '25';
document.getElementById('http500Rate').value = '15'; 
document.getElementById('malformedRate').value = '30';

const config = window.readToggles();
console.log('UI Values: latency=25%, http500=15%, malformed=30%');
console.log('readToggles() output:', {
  latencyRate: config.latencyRate,
  http500Rate: config.http500Rate, 
  malformedRate: config.malformedRate
});
console.log('✅ Conversion check:', 
  config.latencyRate === 0.25 && 
  config.http500Rate === 0.15 && 
  config.malformedRate === 0.30 ? 'PASSED' : 'FAILED'
);

// Test 2: Verify button handlers call run() correctly
console.log('\n2️⃣ Testing button handlers:');
const originalRun = window.run;
let chaosTest = false, baselineTest = false;

window.run = function(chaos) {
  console.log(`run() called with chaos=${chaos}`);
  if (chaos === true) chaosTest = true;
  if (chaos === false) baselineTest = true;
};

document.getElementById('btnChaos').click();
document.getElementById('btnBaseline').click();

window.run = originalRun;
console.log('✅ Button handlers:', chaosTest && baselineTest ? 'PASSED' : 'FAILED');

// Test 3: Verify setBadge() handles edge cases
console.log('\n3️⃣ Testing setBadge() edge cases:');
window.setBadge(85);
console.log('setBadge(85):', document.getElementById('scoreBadge').textContent);
window.setBadge(null);
console.log('setBadge(null):', document.getElementById('scoreBadge').textContent);
window.setBadge(150);
console.log('setBadge(150):', document.getElementById('scoreBadge').textContent);

// Test 4: Verify scenario selection
console.log('\n4️⃣ Testing scenario selection:');
document.querySelector('input[name="scenario"][value="rag"]').checked = true;
console.log('Selected RAG scenario:', window.scenario());
document.querySelector('input[name="scenario"][value="fetch"]').checked = true;
console.log('Selected FETCH scenario:', window.scenario());

console.log('\n🎉 Manual test complete! Check results above.');
console.log('\n💡 To run full test suite: testUIIntegration()');