#!/usr/bin/env node

/**
 * Setup script for git hooks
 * Creates the pre-commit hook that encrypts files before commit
 * Run this once after cloning: npm run prepare
 */

import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const hooksDir = join(projectRoot, '.git', 'hooks');

// Content of the pre-commit hook
const preCommitHookContent = `#!/bin/bash

# Pre-commit hook to encrypt sensitive files before committing
# This hook automatically encrypts files in public/poems, public/music, etc.
# before they are committed to the repository

set -e

echo "🔐 Encrypting files before commit..."

# Run the encryption script
node scripts/encrypt-files.js

# Stage the encrypted files
echo "📋 Staging encrypted files..."
git add public/**/*.enc 2>/dev/null || true

echo "✅ All done! Encrypted files are ready to commit."
`;

try {
  // Create hooks directory if it doesn't exist
  mkdirSync(hooksDir, { recursive: true });

  // Write pre-commit hook
  const preCommitPath = join(hooksDir, 'pre-commit');
  writeFileSync(preCommitPath, preCommitHookContent, 'utf-8');

  // Make it executable (Unix/Linux/macOS)
  try {
    chmodSync(preCommitPath, 0o755);
  } catch {
    // On Windows, chmod doesn't work, but that's okay
    console.log('Note: On Windows, the hook may need to be made executable manually');
  }

  console.log('✅ Git hooks setup complete!');
  console.log('📝 Pre-commit hook installed at:', preCommitPath);
  console.log(
    '💡 Files will be automatically encrypted before commit using the password from .env'
  );
} catch (err) {
  console.error('❌ Failed to setup git hooks:', err instanceof Error ? err.message : err);
  process.exit(1);
}
