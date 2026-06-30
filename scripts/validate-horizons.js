#!/usr/bin/env node

import { bodyGhaDec } from '../src/ephemeris/index.js';

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const BODIES = [
  { name: 'Sun', code: '10', body: 'Sun', raToleranceArcmin: 1.0, decToleranceArcmin: 1.0 },
  { name: 'Moon', code: '301', body: 'Moon', raToleranceArcmin: 2.0, decToleranceArcmin: 2.0 },
  { name: 'Venus', code: '299', body: 'Venus', raToleranceArcmin: 1.5, decToleranceArcmin: 1.5 },
  { name: 'Mars', code: '499', body: 'Mars', raToleranceArcmin: 1.5, decToleranceArcmin: 1.5 },
  { name: 'Jupiter', code: '599', body: 'Jupiter', raToleranceArcmin: 1.5, decToleranceArcmin: 1.5 },
  { name: 'Saturn', code: '699', body: 'Saturn', raToleranceArcmin: 1.5, decToleranceArcmin: 1.5 }
];

const options = parseArgs(process.argv.slice(2));
const summary = await validate(options);

if (options.json) console.log(JSON.stringify(summary, null, 2));
else printSummary(summary);

if (summary.errorCount > 0) process.exitCode = 1;

async function validate(options) {
  const summary = {
    year: options.year,
    step: options.step,
    source: 'NASA/JPL Horizons API, observer ephemeris QUANTITIES=2 apparent RA/Dec, geocentric Earth center',
    rows: 0,
    errorCount: 0,
    bodies: [],
    issues: []
  };

  for (const body of BODIES.filter(item => options.bodies.has(item.name.toLowerCase()))) {
    const rows = await fetchHorizonsRows(body, options);
    const bodySummary = {
      body: body.name,
      rows: rows.length,
      maxRaDeltaArcmin: 0,
      maxDecDeltaArcmin: 0,
      maxRaAt: null,
      maxDecAt: null
    };

    for (const row of rows) {
      const date = parseHorizonsDate(row.date);
      const actual = bodyGhaDec(body.body, date);
      const actualRaDeg = normalizeDegrees(actual.raHours * 15);
      const raDelta = angularDeltaArcmin(actualRaDeg, row.raDeg);
      const decDelta = Math.abs(actual.decDegrees - row.decDeg) * 60;
      summary.rows += 1;

      if (raDelta > bodySummary.maxRaDeltaArcmin) {
        bodySummary.maxRaDeltaArcmin = raDelta;
        bodySummary.maxRaAt = row.date;
      }
      if (decDelta > bodySummary.maxDecDeltaArcmin) {
        bodySummary.maxDecDeltaArcmin = decDelta;
        bodySummary.maxDecAt = row.date;
      }

      if (raDelta > body.raToleranceArcmin) addIssue(summary, options, body.name, row.date, 'RA', raDelta, body.raToleranceArcmin);
      if (decDelta > body.decToleranceArcmin) addIssue(summary, options, body.name, row.date, 'Dec', decDelta, body.decToleranceArcmin);
    }

    summary.bodies.push(bodySummary);
  }

  return summary;
}

async function fetchHorizonsRows(body, options) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${body.code}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: '500@399',
    START_TIME: `'${options.year}-Jan-01 00:00'`,
    STOP_TIME: `'${options.year}-Dec-31 23:59'`,
    STEP_SIZE: `'${options.step}'`,
    QUANTITIES: '2',
    ANG_FORMAT: 'DEG',
    CSV_FORMAT: 'YES',
    TIME_DIGITS: 'SECONDS'
  });

  const response = await fetch(`${HORIZONS_URL}?${params}`);
  if (!response.ok) throw new Error(`Horizons request failed for ${body.name}: HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.result) throw new Error(`Horizons response missing result for ${body.name}`);
  return parseHorizonsCsv(payload.result, body.name);
}

function parseHorizonsCsv(result, bodyName) {
  const start = result.indexOf('$$SOE');
  const end = result.indexOf('$$EOE');
  if (start < 0 || end < 0 || end <= start) throw new Error(`Horizons data markers missing for ${bodyName}`);
  const lines = result.slice(start + '$$SOE'.length, end).trim().split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    const cells = line.split(',').map(cell => cell.trim()).filter((cell, index) => index === 0 || cell !== '');
    if (cells.length < 3) throw new Error(`Unexpected Horizons row for ${bodyName}: ${line}`);
    return {
      date: cells[0],
      raDeg: Number(cells.at(-2)),
      decDeg: Number(cells.at(-1))
    };
  });
}

function addIssue(summary, options, body, date, field, delta, tolerance) {
  summary.errorCount += 1;
  if (summary.issues.length < options.maxIssues) {
    summary.issues.push({ body, date, field, deltaArcmin: Number(delta.toFixed(4)), toleranceArcmin: tolerance });
  }
}

function printSummary(summary) {
  console.log(`Compared ${summary.rows} rows against ${summary.source}.`);
  console.log(`Year: ${summary.year}; step: ${summary.step}; errors: ${summary.errorCount}.`);
  for (const body of summary.bodies) {
    console.log(`${body.body}: ${body.rows} rows, max RA delta ${body.maxRaDeltaArcmin.toFixed(3)}' at ${body.maxRaAt}, max Dec delta ${body.maxDecDeltaArcmin.toFixed(3)}' at ${body.maxDecAt}`);
  }
  if (summary.issues.length > 0) {
    console.log(`First ${summary.issues.length} issues:`);
    for (const issue of summary.issues) console.log(`  ${issue.body} ${issue.date} ${issue.field}: ${issue.deltaArcmin}' > ${issue.toleranceArcmin}'`);
  }
}

function parseArgs(args) {
  const parsed = { year: null, step: '24 h', bodies: new Set(BODIES.map(item => item.name.toLowerCase())), maxIssues: 50, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--step') parsed.step = requireValue(args, ++index, arg);
    else if (arg.startsWith('--step=')) parsed.step = arg.slice('--step='.length);
    else if (arg === '--bodies') parsed.bodies = parseBodies(requireValue(args, ++index, arg));
    else if (arg.startsWith('--bodies=')) parsed.bodies = parseBodies(arg.slice('--bodies='.length));
    else if (arg === '--max-issues') parsed.maxIssues = Number(requireValue(args, ++index, arg));
    else if (arg.startsWith('--max-issues=')) parsed.maxIssues = Number(arg.slice('--max-issues='.length));
    else if (arg === '--json') parsed.json = true;
    else if (!parsed.year) parsed.year = Number(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(parsed.year) || parsed.year < 1900 || parsed.year > 2100) throw new Error('Usage: node scripts/validate-horizons.js <year> [--step "24 h"] [--bodies Sun,Moon] [--json]');
  if (!Number.isInteger(parsed.maxIssues) || parsed.maxIssues < 1) throw new Error('--max-issues must be a positive integer.');
  return parsed;
}

function parseBodies(value) {
  const names = new Set(String(value).split(',').map(item => item.trim().toLowerCase()).filter(Boolean));
  const valid = new Set(BODIES.map(item => item.name.toLowerCase()));
  for (const name of names) if (!valid.has(name)) throw new Error(`Invalid body: ${name}`);
  return names;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

function parseHorizonsDate(value) {
  const match = value.match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid Horizons date: ${value}`);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(match[2]);
  if (month < 0) throw new Error(`Invalid Horizons month: ${value}`);
  return new Date(Date.UTC(Number(match[1]), month, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
}

function angularDeltaArcmin(a, b) {
  let delta = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  if (delta > 180) delta = 360 - delta;
  return delta * 60;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}
