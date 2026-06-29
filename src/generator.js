import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makePlaceholderTex } from './latex.js';
import { makeIncrementsTex } from './increments.js';
import { makeSunTablesTex } from './sun-tables.js';
import { makeEventTablesTex } from './event-tables.js';
import { makeNauticalAlmanacTex } from './nautical-tables.js';
import { compileTex } from './pdf.js';

export async function generateAlmanac(config) {
  const tex = makeTex(config);
  const outputDir = config.outputDir ?? 'output';
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `${config.fileBase}.tex`);
  await writeFile(outputPath, tex, 'utf8');

  const pdfPath = await compileTex(outputPath, { keepTex: config.keepTex, keepLog: false });

  return {
    fileBase: config.fileBase,
    pdfPath,
    message: messageFor(config)
  };
}

function makeTex(config) {
  if (config.outputType === 'nautical') {
    return makeNauticalAlmanacTex(config);
  }
  if (config.outputType === 'increments') {
    return makeIncrementsTex(config);
  }
  if (config.outputType === 'sun') {
    return makeSunTablesTex(config);
  }
  if (config.outputType === 'events') {
    return makeEventTablesTex(config);
  }
  return makePlaceholderTex(config);
}

function messageFor(config) {
  if (config.outputType === 'nautical') {
    return 'Generated converted Nautical Almanac daily pages with Astronomy Engine ephemeris data and compiled them to PDF.';
  }
  if (config.outputType === 'increments') {
    return 'Generated the converted Increments and Corrections tables and compiled them to PDF.';
  }
  if (config.outputType === 'sun') {
    return 'Generated converted Sun tables with Astronomy Engine ephemeris data and compiled them to PDF.';
  }
  if (config.outputType === 'events') {
    return 'Generated converted Event Time tables with Astronomy Engine rise/set data and compiled them to PDF.';
  }
  return 'Generated scaffold TeX and compiled it to PDF. The remaining table renderer still needs conversion.';
}
