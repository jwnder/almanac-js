import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeIncrementsTex } from './increments.js';
import { makeSunTablesTex } from './sun-tables.js';
import { makeEventTablesTex } from './event-tables.js';
import { makeNauticalAlmanacTex } from './nautical-tables.js';
import { compileTex } from './pdf.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(MODULE_DIR);

export async function generateAlmanac(config) {
  const tex = makeTex(withSupportAssets(config));
  const outputDir = config.outputDir ?? 'output';
  await mkdir(outputDir, { recursive: true });
  await removeStaleSidecars(outputDir, config);
  const outputPath = join(outputDir, `${config.fileBase}.tex`);
  await writeFile(outputPath, tex, 'utf8');

  const pdfPath = await compileTex(outputPath, {
    keepTex: config.keepTex,
    keepLog: config.keepLog,
    verbose: config.verbose
  });

  return {
    fileBase: config.fileBase,
    pdfPath,
    message: messageFor(config)
  };
}

async function removeStaleSidecars(outputDir, config) {
  const sidecars = ['.aux', '.out', '.toc'];
  if (!config.keepTex) sidecars.push('.tex');
  if (!config.keepLog) sidecars.push('.log');

  await Promise.all(sidecars.map(extension => removeIfExists(join(outputDir, `${config.fileBase}${extension}`))));
}

async function removeIfExists(path) {
  await rm(path, { force: true });
}

function withSupportAssets(config) {
  if (config.outputType !== 'nautical') return config;
  return {
    ...config,
    chartPath: toTexPath(join(PROJECT_ROOT, 'assets', 'A4chartNorth_P.pdf'))
  };
}

function toTexPath(path) {
  return path.replaceAll('\\', '/');
}

function makeTex(config) {
  if (config.outputType === 'nautical') return makeNauticalAlmanacTex(config);
  if (config.outputType === 'increments') return makeIncrementsTex(config);
  if (config.outputType === 'sun') return makeSunTablesTex(config);
  if (config.outputType === 'events') return makeEventTablesTex(config);
  throw new Error(`Unsupported output type: ${config.outputType}`);
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
  throw new Error(`Unsupported output type: ${config.outputType}`);
}
