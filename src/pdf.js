import { access, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const FALLBACK_PDFLATEX_PATHS = [
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe') : null,
  'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
  'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe'
].filter(Boolean);

export async function compileTex(texPath, options = {}) {
  const absoluteTexPath = resolve(texPath);
  const cwd = dirname(absoluteTexPath);
  const executable = await findPdfLatex();
  const args = ['-enable-installer', '-interaction=batchmode', '-halt-on-error', absoluteTexPath];

  const result = await run(executable, args, cwd, Boolean(options.verbose));
  if (result.code !== 0) {
    if (!options.verbose && result.output) process.stderr.write(result.output);
    throw new Error(`pdflatex failed for ${texPath}. Check the .log file for details.`);
  }

  if (!options.keepTex) await removeIfExists(absoluteTexPath);
  await removeIfExists(absoluteTexPath.replace(/\.tex$/i, '.aux'));
  if (!options.keepLog) await removeIfExists(absoluteTexPath.replace(/\.tex$/i, '.log'));

  return absoluteTexPath.replace(/\.tex$/i, '.pdf');
}

async function findPdfLatex() {
  try {
    const resolved = await commandExists('pdflatex');
    if (resolved) return 'pdflatex';
  } catch {
    // Fall through to known MiKTeX install paths.
  }

  for (const candidate of FALLBACK_PDFLATEX_PATHS) {
    if (await fileExists(candidate)) return candidate;
  }

  throw new Error('pdflatex was not found. Install MiKTeX/TeX Live or add pdflatex to PATH. On Windows, run: winget install MiKTeX.MiKTeX');
}

function commandExists(command) {
  return new Promise(resolveCommand => {
    const child = spawn(process.platform === 'win32' ? 'where.exe' : 'command', process.platform === 'win32' ? [command] : ['-v', command], {
      windowsHide: true
    });
    child.on('error', () => resolveCommand(false));
    child.on('close', code => resolveCommand(code === 0));
  });
}

function run(command, args, cwd, verbose) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const chunks = [];
    if (!verbose) {
      child.stdout.on('data', chunk => chunks.push(chunk));
      child.stderr.on('data', chunk => chunks.push(chunk));
    }
    child.on('error', reject);
    child.on('close', code => resolveRun({ code, output: Buffer.concat(chunks).toString('utf8') }));
  });
}

async function fileExists(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function removeIfExists(path) {
  try {
    await rm(path, { force: true });
  } catch {
    // Ignore cleanup failures; the generated PDF is the important artifact.
  }
}