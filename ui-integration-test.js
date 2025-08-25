/**
 * UI Integration Test for Chaos Testing System
 * Run this in the browser console to verify Phase 3 functionality
 */

// Test Suite for UI Integration
window.testUIIntegration = function() {
  console.log('🧪 Starting UI Integration Tests...\n');
  
  const results = {
    readToggles: false,
    buttonHandlers: false,
    scoreBadge: false,
    scenarios: false,
    overall: false
  };
  
  // Test 1: Verify readToggles() function
  console.log('1️⃣ Testing readToggles() function...');
  try {
    // Set test values in the UI
    const testValues = {
      latencyRate: 25,
      http500Rate: 15,
      rate429: 20,
      malformedRate: 30,
      latencyMs: 1000
    };
    
    Object.entries(testValues).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
      } else {
        console.warn(`⚠️  Element ${id} not found`);
      }
    });
    
    // Test the function
    const config = window.readToggles();
    console.log('readToggles() returned:', config);
    
    // Verify percentage conversion (0-100 → 0-1)
    const percentageTests = [
      ['latencyRate', 25, 0.25],
      ['http500Rate', 15, 0.15], 
      ['rate429', 20, 0.20],
      ['malformedRate', 30, 0.30]
    ];
    
    let percentageTestsPassed = 0;
    percentageTests.forEach(([key, input, expected]) => {
      if (Math.abs(config[key] - expected) < 0.001) {
        console.log(`✅ ${key}: ${input}% → ${config[key]} (expected ${expected})`);
        percentageTestsPassed++;
      } else {
        console.log(`❌ ${key}: ${input}% → ${config[key]} (expected ${expected})`);
      }
    });
    
    // Verify latencyMs (should remain as number, not converted)
    if (config.latencyMs === 1000) {
      console.log(`✅ latencyMs: ${config.latencyMs}ms (no conversion)`);
      percentageTestsPassed++;
    } else {
      console.log(`❌ latencyMs: ${config.latencyMs}ms (expected 1000ms)`);
    }
    
    results.readToggles = percentageTestsPassed === 5;
    console.log(`readToggles test: ${results.readToggles ? '✅ PASSED' : '❌ FAILED'}\n`);
    
  } catch (error) {
    console.error('❌ readToggles test error:', error);
    results.readToggles = false;
  }
  
  // Test 2: Verify button click handlers
  console.log('2️⃣ Testing button click handlers...');
  try {
    const btnChaos = document.getElementById('btnChaos');
    const btnBaseline = document.getElementById('btnBaseline');
    
    if (btnChaos && btnBaseline) {
      // Store original function
      const originalRun = window.run;
      let chaosCallCorrect = false;
      let baselineCallCorrect = false;
      
      // Mock the run function to capture calls
      window.run = function(chaos) {
        console.log(`run() called with chaos=${chaos}`);
        if (chaos === true) chaosCallCorrect = true;
        if (chaos === false) baselineCallCorrect = true;
      };
      
      // Test button clicks
      btnChaos.click();
      btnBaseline.click();
      
      // Restore original function
      window.run = originalRun;
      
      if (chaosCallCorrect && baselineCallCorrect) {
        console.log('✅ Button handlers working correctly');
        console.log('✅ btnChaos calls run(true)');
        console.log('✅ btnBaseline calls run(false)');
        results.buttonHandlers = true;
      } else {
        console.log('❌ Button handlers not working correctly');
        console.log(`   btnChaos → run(true): ${chaosCallCorrect}`);
        console.log(`   btnBaseline → run(false): ${baselineCallCorrect}`);
      }
    } else {
      console.log('❌ Button elements not found');
      console.log(`   btnChaos: ${!!btnChaos}`);
      console.log(`   btnBaseline: ${!!btnBaseline}`);
    }
    
    console.log(`Button handlers test: ${results.buttonHandlers ? '✅ PASSED' : '❌ FAILED'}\n`);
    
  } catch (error) {
    console.error('❌ Button handlers test error:', error);
    results.buttonHandlers = false;
  }
  
  // Test 3: Verify setBadge() function
  console.log('3️⃣ Testing setBadge() function...');
  try {
    const scoreBadge = document.getElementById('scoreBadge');
    
    if (scoreBadge && window.setBadge) {
      const testScores = [95, 75, 55, 25];
      let badgeTestsPassed = 0;
      
      testScores.forEach(score => {
        window.setBadge(score);
        const displayText = scoreBadge.textContent;
        const expectedText = `${score}%`;
        
        if (displayText === expectedText) {
          console.log(`✅ setBadge(${score}) → "${displayText}"`);
          badgeTestsPassed++;
        } else {
          console.log(`❌ setBadge(${score}) → "${displayText}" (expected "${expectedText}")`);
        }
      });
      
      // Test edge cases
      const edgeCases = [
        [0, '0%', 'zero value'],
        [100, '100%', 'max value'],
        [-10, '0%', 'negative value (clamped)'],
        [150, '100%', 'over-max value (clamped)'],
        [null, '—', 'null value'],
        [undefined, '—', 'undefined value'],
        [NaN, '—', 'NaN value'],
        ['50', '50%', 'string number']
      ];
      
      edgeCases.forEach(([input, expected, description]) => {
        window.setBadge(input);
        const actual = scoreBadge.textContent;
        if (actual === expected) {
          console.log(`✅ setBadge(${input}) → "${actual}" (${description})`);
          badgeTestsPassed++;
        } else {
          console.log(`❌ setBadge(${input}) → "${actual}" (expected "${expected}", ${description})`);
        }
      });
      
      results.scoreBadge = badgeTestsPassed === (4 + 8); // 4 normal scores + 8 edge cases
      console.log(`setBadge test: ${results.scoreBadge ? '✅ PASSED' : '❌ FAILED'}\n`);
      
    } else {
      console.log('❌ scoreBadge element or setBadge function not found');
      results.scoreBadge = false;
    }
    
  } catch (error) {
    console.error('❌ setBadge test error:', error);
    results.scoreBadge = false;
  }
  
  // Test 4: Verify scenario selection
  console.log('4️⃣ Testing scenario selection...');
  try {
    const scenarios = ['fetch', 'rag', 'json'];
    let scenarioTestsPassed = 0;
    
    scenarios.forEach(scenarioValue => {
      const radio = document.querySelector(`input[name="scenario"][value="${scenarioValue}"]`);
      if (radio) {
        radio.checked = true;
        const selectedScenario = window.scenario ? window.scenario() : null;
        
        if (selectedScenario === scenarioValue) {
          console.log(`✅ Scenario "${scenarioValue}" selection working`);
          scenarioTestsPassed++;
        } else {
          console.log(`❌ Scenario "${scenarioValue}" selection failed (got: ${selectedScenario})`);
        }
      } else {
        console.log(`❌ Scenario radio button "${scenarioValue}" not found`);
      }
    });
    
    results.scenarios = scenarioTestsPassed === 3;
    console.log(`Scenario selection test: ${results.scenarios ? '✅ PASSED' : '❌ FAILED'}\n`);
    
  } catch (error) {
    console.error('❌ Scenario selection test error:', error);
    results.scenarios = false;
  }
  
  // Overall Results
  const passedTests = Object.values(results).filter(result => result === true).length;
  const totalTests = Object.keys(results).length - 1; // Exclude 'overall'
  results.overall = passedTests === totalTests;
  
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log(`✅ readToggles(): ${results.readToggles ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Button Handlers: ${results.buttonHandlers ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Score Badge: ${results.scoreBadge ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Scenario Selection: ${results.scenarios ? 'PASSED' : 'FAILED'}`);
  console.log('========================');
  console.log(`${results.overall ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'} (${passedTests}/${totalTests})`);
  
  return results;
};

// Quick test function to verify chaos parameter flow
window.testChaosParameterFlow = function() {
  console.log('🔧 Testing Chaos Parameter Flow...\n');
  
  // Set realistic test values
  document.getElementById('latencyRate').value = '30';
  document.getElementById('http500Rate').value = '20';
  document.getElementById('malformedRate').value = '25';
  document.getElementById('latencyMs').value = '2000';
  
  // Read the configuration
  const config = window.readToggles();
  console.log('Current UI Configuration:', config);
  
  // Verify the flow
  console.log('\n🔍 Parameter Flow Verification:');
  console.log(`UI Input (30%) → Config (${config.latencyRate}) → Expected (0.3): ${config.latencyRate === 0.3 ? '✅' : '❌'}`);
  console.log(`UI Input (20%) → Config (${config.http500Rate}) → Expected (0.2): ${config.http500Rate === 0.2 ? '✅' : '❌'}`);
  console.log(`UI Input (25%) → Config (${config.malformedRate}) → Expected (0.25): ${config.malformedRate === 0.25 ? '✅' : '❌'}`);
  console.log(`UI Input (2000ms) → Config (${config.latencyMs}ms) → Expected (2000): ${config.latencyMs === 2000 ? '✅' : '❌'}`);
  
  return config;
};

// Instructions
console.log(`
🧪 UI Integration Test Suite Ready!

To run tests:
1. testUIIntegration() - Complete UI integration test
2. testChaosParameterFlow() - Quick parameter flow test

Example:
testUIIntegration();
`);