#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Path to the test file
const testFile = path.join(__dirname, 'src', 'scripts', 'test-shared-data.ts');

// Run ts-node with ESM flag
const child = spawn('npx', ['ts-node', '--esm', testFile], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
}); 