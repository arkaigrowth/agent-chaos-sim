import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Agent Chaos Monkey Test Suite');
  console.log('📋 Test Configuration:');
  console.log(`  - Base URL: ${config.use?.baseURL || 'http://localhost:8080'}`);
  console.log(`  - Workers: ${config.workers || 'auto'}`);
  console.log(`  - Retries: ${config.retries || 0}`);
  console.log(`  - Projects: ${config.projects?.map(p => p.name).join(', ')}`);
  
  // Ensure test environment is ready
  console.log('🔧 Preparing test environment...');
  
  // You could add additional setup here such as:
  // - Database initialization
  // - Test data setup
  // - External service mocking
  // - Environment variable validation
  
  console.log('✅ Global setup complete');
}

export default globalSetup;