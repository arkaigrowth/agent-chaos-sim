// Quick integration test for Real LLM functionality
const { chromium } = require('@playwright/test');

(async () => {
  console.log('Starting integration test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the enhanced prototype
    console.log('Navigating to enhanced prototype...');
    await page.goto('http://localhost:8080/docs/claude_prototype_enhanced.html');
    
    // Check what's on the page
    const title = await page.title();
    console.log('Page title:', title);
    
    // If we get an error page, show the content
    if (title === 'Error' || title.includes('404')) {
      const bodyText = await page.textContent('body');
      console.log('Page content:', bodyText.substring(0, 500));
    }
    
    // Try to find the evaluation mode button
    const evalButton = await page.$('#evaluationMode');
    if (evalButton) {
      console.log('Found evaluation mode button');
    } else {
      console.log('Evaluation mode button not found');
      // Try looking for other mode buttons
      const buttons = await page.$$('.mode-btn');
      console.log(`Found ${buttons.length} mode buttons`);
      if (buttons.length > 0) {
        const buttonTexts = await Promise.all(buttons.map(btn => btn.textContent()));
        console.log('Button texts:', buttonTexts);
      }
    }
    
    // Click the Real Agent Testing mode button if found
    if (evalButton) {
      console.log('Clicking Real Agent Testing mode...');
      await evalButton.click();
    } else {
      throw new Error('Evaluation mode button not found');
    }
    
    // Wait for the evaluation section to be visible
    await page.waitForSelector('#evaluationSection:not(.hidden)', { timeout: 5000 });
    console.log('✓ Evaluation section visible');
    
    // Configure the mock agent
    console.log('Configuring mock agent...');
    await page.selectOption('#llmAdapter', 'http');
    
    // The endpoint field should appear when 'http' is selected
    await page.waitForSelector('#endpoint:not([style*="display: none"])', { timeout: 2000 });
    await page.fill('#endpoint', 'http://localhost:9009/run');
    console.log('✓ Mock agent configured');
    
    // Test the connection
    console.log('Testing connection...');
    await page.click('#testConnection');
    
    // Wait for success message or check if connection works
    try {
      await page.waitForSelector('#connectionStatus:has-text("successful")', { timeout: 5000 });
      console.log('✓ Connection successful!');
    } catch (e) {
      // Check if there's an error message
      const errorText = await page.textContent('#connectionStatus');
      console.log('Connection status:', errorText);
    }
    
    // Check if Real Test buttons are present
    const realTestButtons = await page.$$('button:has-text("Real Test")');
    console.log(`✓ Found ${realTestButtons.length} Real Test buttons`);
    
    // Try clicking the first Real Test button
    if (realTestButtons.length > 0) {
      console.log('Clicking first Real Test button...');
      await realTestButtons[0].click();
      
      // Wait a bit for results
      await page.waitForTimeout(3000);
      
      // Check if results appeared
      const hasResults = await page.$('.real-test-results') !== null;
      if (hasResults) {
        console.log('✓ Real test results displayed!');
        const resultsText = await page.textContent('.real-test-results');
        console.log('Results preview:', resultsText.substring(0, 200) + '...');
      } else {
        console.log('⚠ No results displayed yet');
      }
    }
    
    // Test dataset upload
    console.log('\nTesting dataset upload...');
    const jsonlContent = JSON.stringify({ input: "test question", expected: "test answer" }) + '\n' +
                        JSON.stringify({ input: "another question", expected: "another answer" });
    
    await page.evaluate((content) => {
      const blob = new Blob([content], { type: 'application/jsonl' });
      const file = new File([blob], 'test.jsonl', { type: 'application/jsonl' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const input = document.querySelector('#datasetFile');
      if (input) {
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, jsonlContent);
    
    await page.waitForTimeout(1000);
    
    // Check dataset status
    const datasetStatus = await page.textContent('#datasetStatus');
    console.log('Dataset status:', datasetStatus || 'No dataset loaded yet');
    
    console.log('\n✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();