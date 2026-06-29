#!/usr/bin/env node

import { compileTex } from './pdf.js';

const { texPath, keepLog, verbose } = parseArgs(process.argv.slice(2));
if (!texPath) {
  console.error('Usage: node src/compile-tex.js <file.tex> [--keep-log] [--verbose]');
  process.exit(1);
}

try {
  const pdfPath = await compileTex(texPath, { keepTex: true, keepLog, verbose });
  console.log(`Created ${pdfPath}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function parseArgs(args) {
  const parsed = { texPath: null, keepLog: false, verbose: false };
  for (const arg of args) {
    if (arg === '--keep-log') {
      parsed.keepLog = true;
    } else if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (!parsed.texPath) {
      parsed.texPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}