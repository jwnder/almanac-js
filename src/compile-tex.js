#!/usr/bin/env node

import { compileTex } from './pdf.js';

const texPath = process.argv[2];
if (!texPath) {
  console.error('Usage: node src/compile-tex.js <file.tex>');
  process.exit(1);
}

try {
  const pdfPath = await compileTex(texPath, { keepTex: true, keepLog: false });
  console.log(`Created ${pdfPath}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
