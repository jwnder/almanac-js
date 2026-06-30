#!/usr/bin/env node

import {
  ariesTransit,
  dailyEvents,
  equationOfTime,
  meridianEvents,
  navigationalStars,
  planetCorrections,
  planetsGha,
  STANDARD_LATITUDES,
  sunMoon
} from '../src/ephemeris/index.js';

const VALID_MARKERS = new Set([String.raw`\AlwaysUp`, String.raw`\AlwaysDown`, String.raw`\NextDay`, '--:--', '--:--:--']);
const NAV_PLANETS = ['Venus', 'Mars', 'Jupiter', 'Saturn'];

const options = parseArgs(process.argv.slice(2));
const summary = validateYear(options.year, options);

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printSummary(summary, options);
}

if (summary.errorCount > 0 || (options.strict && summary.warningCount > 0)) {
  process.exitCode = 1;
}

function validateYear(year, options) {
  const issueLimit = options.maxIssues;
  const stats = {
    year,
    days: isLeapYear(year) ? 366 : 365,
    hourlyRows: 0,
    eventRows: 0,
    starRows: 0,
    errorCount: 0,
    warningCount: 0,
    maxDeltas: {
      ariesHourlyArcmin: 0,
      sunGhaHourlyArcmin: 0,
      moonGhaHourlyArcmin: 0,
      planetGhaHourlyArcmin: 0
    },
    issues: []
  };

  for (let dayIndex = 0; dayIndex < stats.days; dayIndex += 1) {
    const date = new Date(Date.UTC(year, 0, 1 + dayIndex));
    validateDailyValues(date, stats, issueLimit);
    validateHourlyValues(date, stats, issueLimit);
    validateStandardLatitudeEvents(date, stats, issueLimit);
    validateStars(date, stats, issueLimit);
  }

  return stats;
}

function validateDailyValues(date, stats, limit) {
  const label = isoDate(date);
  const ariesPass = ariesTransit(date);
  if (!isTimeMinute(ariesPass)) addIssue(stats, limit, 'error', label, 'Aries transit is not hh:mm', ariesPass);

  const eq = equationOfTime(date);
  validateEquationOffset(stats, limit, label, 'equation at 00h', eq.atMidnight);
  validateEquationOffset(stats, limit, label, 'equation at 12h', eq.atNoon);
  validateTimeOrMarker(stats, limit, label, 'sun transit', eq.sunTransit, true);
  validateRange(stats, limit, label, 'moon age', eq.moonAge, 0, 30, 'error', { inclusiveMax: true });
  validateRange(stats, limit, label, 'moon illumination', eq.moonIllumination, 0, 100, 'error', { inclusiveMax: true });

  const meridian = meridianEvents(date);
  validateTimeOrMarker(stats, limit, label, 'meridian sun', meridian.sun, true);
  validateTimeOrMarker(stats, limit, label, 'meridian moon upper', meridian.moonUpper, true);
  validateTimeOrMarker(stats, limit, label, 'meridian moon lower', meridian.moonLower, true);
  for (const row of meridian.planetRows) {
    validateAngle(stats, limit, label, `${row.body} SHA`, row.sha, 0, 360, false);
    validateTimeOrMarker(stats, limit, label, `${row.body} transit`, row.meridianPassage, true);
  }
}

function validateHourlyValues(date, stats, limit) {
  const label = isoDate(date);
  let previousAries = null;
  let previousSunGha = null;
  let previousMoonGha = null;
  const previousPlanetGha = new Map();

  for (let hour = 0; hour < 24; hour += 1) {
    const at = addHours(date, hour);
    const hourLabel = `${label} ${String(hour).padStart(2, '0')}h`;
    const sm = sunMoon(at);
    const planets = planetsGha(at);
    const corrections = planetCorrections(at);
    stats.hourlyRows += 1;

    const sunGha = validateAngle(stats, limit, hourLabel, 'Sun GHA', sm.sunGha, 0, 360, false);
    validateAngle(stats, limit, hourLabel, 'Sun Dec', sm.sunDec, -24, 24, true);
    const moonGha = validateAngle(stats, limit, hourLabel, 'Moon GHA', sm.moonGha, 0, 360, false);
    validateAngle(stats, limit, hourLabel, 'Moon Dec', sm.moonDec, -30, 30, true);
    validateRange(stats, limit, hourLabel, 'Moon v', parseSignedNumber(sm.moonV), -20, 20, 'error');
    validateRange(stats, limit, hourLabel, 'Moon d', parseSignedNumber(sm.moonD), -20, 20, 'error');
    validateRange(stats, limit, hourLabel, 'Moon HP', parseSignedNumber(sm.moonHp), 45, 65, 'error');

    const aries = validateAngle(stats, limit, hourLabel, 'Aries', planets.aries, 0, 360, false);
    if (previousAries !== null) {
      const delta = forwardDegrees(previousAries, aries);
      stats.maxDeltas.ariesHourlyArcmin = Math.max(stats.maxDeltas.ariesHourlyArcmin, Math.abs(delta - 15.0411) * 60);
      validateRange(stats, limit, hourLabel, 'Aries hourly motion', delta, 15.03, 15.06, 'error');
    }
    if (previousSunGha !== null) {
      const delta = forwardDegrees(previousSunGha, sunGha);
      stats.maxDeltas.sunGhaHourlyArcmin = Math.max(stats.maxDeltas.sunGhaHourlyArcmin, Math.abs(delta - 15) * 60);
      validateRange(stats, limit, hourLabel, 'Sun GHA hourly motion', delta, 14.9, 15.1, 'error');
    }
    if (previousMoonGha !== null) {
      const delta = forwardDegrees(previousMoonGha, moonGha);
      stats.maxDeltas.moonGhaHourlyArcmin = Math.max(stats.maxDeltas.moonGhaHourlyArcmin, Math.abs(delta - 14.3) * 60);
      validateRange(stats, limit, hourLabel, 'Moon GHA hourly motion', delta, 13.8, 14.9, 'warning');
    }
    previousAries = aries;
    previousSunGha = sunGha;
    previousMoonGha = moonGha;

    for (const planet of planets.planets) {
      const gha = validateAngle(stats, limit, hourLabel, `${planet.body} GHA`, planet.gha, 0, 360, false);
      validateAngle(stats, limit, hourLabel, `${planet.body} Dec`, planet.dec, -30, 30, true);
      const previous = previousPlanetGha.get(planet.body);
      if (previous !== undefined) {
        const delta = forwardDegrees(previous, gha);
        stats.maxDeltas.planetGhaHourlyArcmin = Math.max(stats.maxDeltas.planetGhaHourlyArcmin, Math.abs(delta - 15) * 60);
        validateRange(stats, limit, hourLabel, `${planet.body} GHA hourly motion`, delta, 14.0, 16.0, 'warning');
      }
      previousPlanetGha.set(planet.body, gha);
    }

    for (const body of NAV_PLANETS) {
      const correction = corrections.find(row => row.body === body);
      if (!correction) {
        addIssue(stats, limit, 'error', hourLabel, `missing ${body} correction row`, 'missing');
        continue;
      }
      validateRange(stats, limit, hourLabel, `${body} v`, parseSignedNumber(correction.v), -90, 90, 'error');
      validateRange(stats, limit, hourLabel, `${body} d`, parseSignedNumber(correction.d), -30, 30, 'error');
      validateRange(stats, limit, hourLabel, `${body} magnitude`, parseSignedNumber(correction.magnitude), -6, 6, 'error');
    }
  }
}

function validateStandardLatitudeEvents(date, stats, limit) {
  const label = isoDate(date);
  for (const latitude of STANDARD_LATITUDES) {
    const events = dailyEvents(date, latitude);
    stats.eventRows += 1;
    for (const key of ['nauticalDawn', 'civilDawn', 'sunrise', 'sunset', 'civilDusk', 'nauticalDusk', 'moonrise', 'moonset', 'secondMoonrise', 'secondMoonset']) {
      validateTimeOrMarker(stats, limit, `${label} ${latitude}`, key, events[key], false);
    }
  }
}

function validateStars(date, stats, limit) {
  const label = isoDate(date);
  const stars = navigationalStars(date);
  if (stars.length !== 59) addIssue(stats, limit, 'error', label, 'navigational star count', stars.length);
  for (const star of stars) {
    stats.starRows += 1;
    validateAngle(stats, limit, label, `${star.name} SHA`, star.sha, 0, 360, false);
    validateAngle(stats, limit, label, `${star.name} Dec`, star.dec, -90, 90, true);
  }
}

function validateAngle(stats, limit, date, label, value, min, max, signed) {
  const parsed = parseNauticalDegrees(value);
  if (!Number.isFinite(parsed)) {
    addIssue(stats, limit, 'error', date, `${label} invalid angle`, value);
    return NaN;
  }
  validateRange(stats, limit, date, label, parsed, min, max, 'error', { inclusiveMax: signed });
  return parsed;
}

function validateRange(stats, limit, date, label, value, min, max, severity, options = {}) {
  if (!Number.isFinite(value)) {
    addIssue(stats, limit, 'error', date, `${label} is not finite`, value);
    return;
  }
  const maxOk = options.inclusiveMax ? value <= max : value < max;
  if (value < min || !maxOk) addIssue(stats, limit, severity, date, `${label} outside ${min}..${max}`, value);
}

function validateTimeOrMarker(stats, limit, date, label, value, requireSeconds) {
  if (requireSeconds ? isTimeSecond(value) : isTimeSecond(value) || isTimeMinute(value)) return;
  if (VALID_MARKERS.has(value)) return;
  addIssue(stats, limit, 'error', date, `${label} invalid time/marker`, value);
}

function validateEquationOffset(stats, limit, date, label, value) {
  const unboxed = String(value).replace(/^\\colorbox\{lightgray!60\}\{(.+)\}$/, '$1');
  if (!/^\d{2}:\d{2}$/.test(unboxed)) addIssue(stats, limit, 'error', date, `${label} invalid mm:ss`, value);
}

function addIssue(stats, limit, severity, date, check, value) {
  if (severity === 'error') stats.errorCount += 1;
  else stats.warningCount += 1;
  if (stats.issues.length < limit) stats.issues.push({ severity, date, check, value });
}

function printSummary(summary, options) {
  console.log(`Validated ${summary.year}: ${summary.days} days, ${summary.hourlyRows} hourly rows, ${summary.eventRows} latitude-event rows, ${summary.starRows} star rows.`);
  console.log(`Errors: ${summary.errorCount}; warnings: ${summary.warningCount}${options.strict ? ' (strict mode)' : ''}.`);
  console.log('Max continuity deltas:');
  for (const [key, value] of Object.entries(summary.maxDeltas)) console.log(`  ${key}: ${value.toFixed(3)} arcmin`);
  if (summary.issues.length > 0) {
    console.log(`First ${summary.issues.length} issues:`);
    for (const issue of summary.issues) console.log(`  [${issue.severity}] ${issue.date}: ${issue.check} -> ${issue.value}`);
  }
}

function parseArgs(args) {
  const parsed = { year: null, maxIssues: 50, strict: false, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--max-issues') parsed.maxIssues = Number(requireValue(args, ++index, arg));
    else if (arg.startsWith('--max-issues=')) parsed.maxIssues = Number(arg.slice('--max-issues='.length));
    else if (arg === '--strict') parsed.strict = true;
    else if (arg === '--json') parsed.json = true;
    else if (!parsed.year) parsed.year = Number(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(parsed.year) || parsed.year < 1900 || parsed.year > 2100) throw new Error('Usage: node scripts/validate-year.js <year> [--strict] [--json] [--max-issues N]');
  if (!Number.isInteger(parsed.maxIssues) || parsed.maxIssues < 1) throw new Error('--max-issues must be a positive integer.');
  return parsed;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

function parseNauticalDegrees(value) {
  const match = String(value).match(/^(-?)(\d+)\$\^\\circ\$(\d+(?:\.\d+)?)/);
  if (!match) return NaN;
  const degrees = Number(match[2]) + Number(match[3]) / 60;
  return match[1] === '-' ? -degrees : degrees;
}

function parseSignedNumber(value) {
  return Number(String(value).replace(/'/g, ''));
}

function forwardDegrees(previous, current) {
  return ((current - previous) % 360 + 360) % 360;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function isTimeSecond(value) {
  return /^\d{2}:\d{2}:\d{2}$/.test(String(value));
}

function isTimeMinute(value) {
  return /^\d{2}:\d{2}$/.test(String(value));
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}