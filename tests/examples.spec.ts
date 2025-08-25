import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

test('Examples section loads correctly', async ({ page }) => {
  await page.goto(BASE);
  
  // Wait for examples to load
  await page.waitForSelector('#examplesGrid .ex', { timeout: 5000 });
  
  // Check if examples are loaded
  const examples = await page.$$eval('#examplesGrid .ex', cards => 
    cards.map(card => ({
      title: card.querySelector('h3')?.textContent || '',
      body: card.querySelector('p')?.textContent || ''
    }))
  );
  
  console.log('Found examples:', examples);
  
  // Verify we have 6 examples
  expect(examples).toHaveLength(6);
  
  // Verify they're not placeholder text
  expect(examples[0].title).not.toContain('EXAMPLE');
  expect(examples[0].title).not.toContain('Example 1');
  
  // Verify actual content
  expect(examples[0].title).toBe('API Meltdown');
  expect(examples[1].title).toBe('Garbage JSON');
  expect(examples[2].title).toBe('RAG Injection');
  expect(examples[3].title).toBe('Latency Spike');
  expect(examples[4].title).toBe('Tool Vanishes');
  expect(examples[5].title).toBe('Context Bomb');
});