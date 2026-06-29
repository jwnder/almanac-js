#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const roots = ['src', 'test', 'scripts'];
const files = [];

for (const root of roots) {
  files.push(...await jsFiles(root));
}

let failed = false;
for (const file of files) {
  const code = await checkFile(file);
  if (code !== 0) failed = true;
}

if (failed) process.exitCode = 1;

async function jsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await jsFiles(path));
    if (entry.isFile() && entry.name.endsWith('.js')) found.push(path);
  }
  return found;
}

function checkFile(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('close', resolve);
  });
}