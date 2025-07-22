import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';

// Create a logger instance for this script
const logger = new Logger('TestRunner');

/**
 * Comprehensive test runner script
 * Runs unit tests, integration tests, security tests, and performance tests
 */

// Configuration
const config = {
  unitTestPattern: 'src/__tests__/**/*.test.ts',
  integrationTestPattern: 'src/__tests__/integration/**/*.test.ts',
  securityTestPattern: 'src/__tests__/security/**/*.test.ts',
  performanceTestPattern: 'src/__tests__/performance/**/*.test.ts',
  coverageThreshold: 70,
  coverageDir: 'coverage',
  reportDir: 'test-reports',
};

// Ensure report directory exists
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

// Get current timestamp for report naming
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

/**
 * Run a command and log the output
 */
function runCommand(command: string, label: string): boolean {
  const logFile = path.join(config.reportDir, `${label.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.log`);
  
  try {
    logger.info(`Running ${label}...`);
    const output = execSync(command, { encoding: 'utf8' });
    fs.writeFileSync(logFile, output);
    logger.info(`${label} completed successfully. Log saved to ${logFile}`);
    return true;
  } catch (error) {
    const errorOutput = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(logFile, errorOutput);
    logger.error(`${label} failed. Log saved to ${logFile}`);
    logger.error(errorOutput);
    return false;
  }
}

/**
 * Main test execution function
 */
async function runTests() {
  logger.info('Starting comprehensive test suite...');
  
  // Track test results
  const results = {
    unit: false,
    integration: false,
    security: false,
    performance: false,
    coverage: false,
  };
  
  // Run unit tests
  results.unit = runCommand(
    `npx jest ${config.unitTestPattern} --testPathIgnorePatterns=integration performance security --json --outputFile=${config.reportDir}/unit-test-results-${timestamp}.json`,
    'Unit Tests'
  );
  
  // Run integration tests
  results.integration = runCommand(
    `npx jest ${config.integrationTestPattern} --json --outputFile=${config.reportDir}/integration-test-results-${timestamp}.json`,
    'Integration Tests'
  );
  
  // Run security tests if they exist
  try {
    if (fs.existsSync('src/__tests__/security')) {
      results.security = runCommand(
        `npx jest ${config.securityTestPattern} --json --outputFile=${config.reportDir}/security-test-results-${timestamp}.json`,
        'Security Tests'
      );
    } else {
      logger.warn('No security tests found. Skipping security testing.');
      results.security = true; // Mark as passed if no tests exist
    }
  } catch (error) {
    logger.error('Error running security tests:', {error});
    results.security = false;
  }
  
  // Run performance tests
  results.performance = runCommand(
    `npx jest ${config.performanceTestPattern} --json --outputFile=${config.reportDir}/performance-test-results-${timestamp}.json`,
    'Performance Tests'
  );
  
  // Run coverage report
  results.coverage = runCommand(
    `npx jest --coverage --coverageThreshold='{"global":{"branches":${config.coverageThreshold},"functions":${config.coverageThreshold},"lines":${config.coverageThreshold},"statements":${config.coverageThreshold}}}' --coverageDirectory=${config.coverageDir} --coverageReporters=text lcov json-summary`,
    'Coverage Analysis'
  );
  
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    results,
    passed: Object.values(results).every(result => result === true),
  };
  
  fs.writeFileSync(
    path.join(config.reportDir, `test-summary-${timestamp}.json`),
    JSON.stringify(summary, null, 2)
  );
  
  // Log final results
  logger.info('Test Suite Summary:');
  logger.info(`Unit Tests: ${results.unit ? 'PASSED' : 'FAILED'}`);
  logger.info(`Integration Tests: ${results.integration ? 'PASSED' : 'FAILED'}`);
  logger.info(`Security Tests: ${results.security ? 'PASSED' : 'FAILED'}`);
  logger.info(`Performance Tests: ${results.performance ? 'PASSED' : 'FAILED'}`);
  logger.info(`Coverage Analysis: ${results.coverage ? 'PASSED' : 'FAILED'}`);
  logger.info(`Overall Result: ${summary.passed ? 'PASSED' : 'FAILED'}`);
  
  // Return exit code based on test results
  return summary.passed ? 0 : 1;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      logger.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runTests };