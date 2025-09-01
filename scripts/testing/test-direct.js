// Direct test in browser console
// Run at http://localhost:5173

console.log('Testing malformed JSON injection directly...');

// Check if functions exist
console.log('chaosJSON exists:', typeof window.chaosJSON === 'function');
console.log('should exists:', typeof window.should === 'function');
console.log('readToggles exists:', typeof window.readToggles === 'function');

// Test should function with 100% rate
const rand = window.seeded('test');
console.log('Testing should(1.0, rand):', window.should(1.0, rand()));
console.log('Testing should(0.5, rand):', window.should(0.5, rand()));

// Set malformed rate to 100%
document.getElementById('malformedRate').value = 100;

// Read the configuration
const config = window.readToggles();
console.log('Configuration:', config);
console.log('malformedRate value:', config.malformedRate);

// Test if should triggers with this rate
const testRand = window.seeded('test:cjson:0');
console.log('Will inject fault?', window.should(config.malformedRate, testRand()));

// Now try running the test
console.log('\nNow click "Run with Chaos" and check window.__LAST__ for faults');