#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_DIR = join('output', 'samples');

const samples = [
  ['nautical', '--date', '01012026', '--days', '3', '--style', 'traditional', '--paper', 'A4', '--data-pages-only'],
  ['nautical', '--date', '01012026', '--days', '3', '--style', 'modern', '--paper', 'A4', '--data-pages-only'],
  ['sun', '--date', '01012026', '--days', '2', '--style', 'traditional', '--paper', 'A4'],
  ['events', '--date', '01012026', '--days', '2', '--paper', 'A4'],
  ['increments', '--paper', 'A4']
];

mkdirSync(join(ROOT, OUTPUT_DIR), { recursive: true });

for (const args of samples) {
  const fullArgs = ['src/cli.js', ...args, '--output-dir', OUTPUT_DIR];
  console.log(`\n> node ${fullArgs.join(' ')}`);
  const result = spawnSync(process.execPath, fullArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}