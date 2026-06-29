#!/usr/bin/env node

import inquirer from 'inquirer';
import { buildRunConfig } from './run-config.js';
import { generateAlmanac } from './generator.js';

const OUTPUT_TYPES = new Set(['nautical', 'sun', 'events', 'increments', 'nautical-six-days', 'sun-thirty-days', 'events-six-days']);

async function main() {
  const answers = hasQuickArgs(process.argv.slice(2))
    ? parseQuickArgs(process.argv.slice(2))
    : await promptAnswers();

  const config = buildRunConfig(answers, new Date());
  const result = await generateAlmanac(config);

  console.log(`
Created PDF: ${result.pdfPath}`);
  console.log(result.message);
}

async function promptAnswers() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'outputType',
      message: 'What do you want to create?',
      choices: [
        { name: 'Nautical Almanac (for a day/month/year)', value: 'nautical' },
        { name: 'Sun tables only (for a day/month/year)', value: 'sun' },
        { name: 'Event Time tables (for a day/month/year)', value: 'events' },
        { name: 'Nautical Almanac - 6 days from today', value: 'nautical-six-days' },
        { name: 'Sun tables only - 30 days from today', value: 'sun-thirty-days' },
        { name: 'Event Time tables - 6 days from today', value: 'events-six-days' },
        { name: 'Increments and Corrections tables (static data)', value: 'increments' }
      ]
    },
    {
      type: 'input',
      name: 'dateSpec',
      message: 'Date/range (DDMMYYYY, YYYY, YYYY-YYYY, MM, -MM; leave blank for today):',
      when: ({ outputType }) => ['nautical', 'sun', 'events'].includes(outputType),
      default: ''
    },
    {
      type: 'input',
      name: 'dayCount',
      message: 'Number of days to process from starting date',
      when: ({ outputType, dateSpec }) =>
        ['nautical', 'sun', 'events'].includes(outputType) && /^\d{8}$/.test(dateSpec),
      default: '1',
      validate: value => {
        if (!/^\d+$/.test(value)) return 'Enter a positive integer.';
        const days = Number(value);
        if (days < 1 || days > 300) return 'Enter a value between 1 and 300.';
        return true;
      }
    },
    {
      type: 'list',
      name: 'tableStyle',
      message: 'What table style is required?',
      when: ({ outputType }) =>
        ['nautical', 'sun', 'nautical-six-days', 'sun-thirty-days'].includes(outputType),
      choices: [
        { name: 'Traditional', value: 'traditional' },
        { name: 'Modern', value: 'modern' }
      ],
      default: 'traditional'
    },
    {
      type: 'list',
      name: 'paperSize',
      message: 'Paper size',
      choices: ['A4', 'Letter'],
      default: 'A4'
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory',
      default: 'output'
    },
    {
      type: 'confirm',
      name: 'keepTex',
      message: 'Keep generated TeX files?',
      default: false
    },
    {
      type: 'confirm',
      name: 'keepLog',
      message: 'Keep generated LaTeX log files?',
      default: false
    },
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Show pdflatex output while compiling?',
      default: false
    },
    {
      type: 'confirm',
      name: 'dataPagesOnly',
      message: 'Data pages only, when supported?',
      default: false
    }
  ]);
}

function hasQuickArgs(args) {
  return args.length > 0;
}

function parseQuickArgs(args) {
  const parsed = {
    outputType: null,
    dateSpec: '',
    dayCount: '1',
    tableStyle: 'traditional',
    paperSize: 'A4',
    outputDir: 'output',
    keepTex: false,
    keepLog: false,
    verbose: false,
    dataPagesOnly: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--keep-tex') {
      parsed.keepTex = true;
      continue;
    }
    if (arg === '--keep-log') {
      parsed.keepLog = true;
      continue;
    }
    if (arg === '--verbose') {
      parsed.verbose = true;
      continue;
    }
    if (arg === '--data-pages-only') {
      parsed.dataPagesOnly = true;
      continue;
    }
    if (arg === '--type') {
      parsed.outputType = requireValue(args, ++index, arg);
      continue;
    }
    if (arg === '--date') {
      parsed.dateSpec = requireValue(args, ++index, arg);
      continue;
    }
    if (arg === '--days') {
      parsed.dayCount = requireValue(args, ++index, arg);
      continue;
    }
    if (arg === '--style') {
      parsed.tableStyle = normalizeStyle(requireValue(args, ++index, arg));
      continue;
    }
    if (arg === '--paper') {
      parsed.paperSize = normalizePaper(requireValue(args, ++index, arg));
      continue;
    }
    if (arg === '--output-dir') {
      parsed.outputDir = requireValue(args, ++index, arg);
      continue;
    }
    if (!parsed.outputType && OUTPUT_TYPES.has(arg)) {
      parsed.outputType = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.outputType) throw new Error('Missing output type. Use --type nautical|sun|events|increments.');
  if (!OUTPUT_TYPES.has(parsed.outputType)) throw new Error(`Invalid output type: ${parsed.outputType}`);
  return parsed;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

function normalizeStyle(value) {
  if (value === 't' || value === 'traditional') return 'traditional';
  if (value === 'm' || value === 'modern') return 'modern';
  throw new Error(`Invalid table style: ${value}`);
}

function normalizePaper(value) {
  const normalized = value.toLowerCase();
  if (normalized === 'a4') return 'A4';
  if (normalized === 'letter' || normalized === 'let') return 'Letter';
  throw new Error(`Invalid paper size: ${value}`);
}

function printUsage() {
  console.log(`Usage:
  node src/cli.js --type nautical --date 01012026 --days 1 --style traditional --paper A4 --output-dir output
  node src/cli.js sun --date 01012026 --days 1
  node src/cli.js events --date 01012026 --days 1
  node src/cli.js increments

Options:
  --type <type>       nautical, sun, events, increments, or fixed shortcuts
  --date <spec>       DDMMYYYY, YYYY, YYYY-YYYY, MM, -MM; omit for today
  --days <count>      Number of days for DDMMYYYY date specs
  --style <style>     traditional|modern, or t|m
  --paper <size>      A4|Letter
  --output-dir <dir>  Directory for generated PDFs and optional TeX files
  --keep-tex          Preserve generated .tex file
  --keep-log          Preserve generated .log file
  --verbose           Show pdflatex output while compiling
  --data-pages-only   Skip title/front matter when supported`);
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

