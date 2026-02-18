/**
 * Vitest setup file for configuring test environment
 * Adds browser APIs that might be missing in Node.js test environment
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  // TextEncoder/TextDecoder should be available globally in Vitest environment
  // No additional setup needed - they're provided by the test runner
});
