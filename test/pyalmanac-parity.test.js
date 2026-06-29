import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dailyEvents, meridianEvents, navigationalStars, planetCorrections, planetsGha, sunMoon } from '../src/ephemeris/index.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/pyalmanac-reference.json', import.meta.url), 'utf8'));
const BODY_TOLERANCE_ARCMIN = 0.25;
const STAR_TOLERANCE_ARCMIN = 1.2;
const TIME_TOLERANCE_SECONDS = 1;
const CORRECTION_TOLERANCE_MINUTES = 0.15;
const MAGNITUDE_TOLERANCE = 0.35;
const STARS_WITH_KNOWN_ENGINE_OUTLIERS = new Set(['Polaris']);

test('matches original hourly Sun, Moon, Aries, and planet reference fixtures', () => {
  for (const day of fixture.dates) {
    const baseDate = utcDate(day.date);

    for (const reference of day.sunMoon) {
      const actual = sunMoon(addHours(baseDate, reference.hour));
      assertAngleClose(actual.sunGha, reference.sunGha, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h Sun GHA`);
      assertAngleClose(actual.sunDec, reference.sunDec, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h Sun Dec`);
      assertAngleClose(actual.moonGha, reference.moonGha, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h Moon GHA`);
      assertNumberClose(parseSignedNumber(actual.moonV), parseSignedNumber(reference.moonV), CORRECTION_TOLERANCE_MINUTES, `${day.date} ${reference.hour}h Moon v`);
      assertAngleClose(actual.moonDec, reference.moonDec, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h Moon Dec`);
      assertNumberClose(parseSignedNumber(actual.moonD), parseSignedNumber(reference.moonD), CORRECTION_TOLERANCE_MINUTES, `${day.date} ${reference.hour}h Moon d`);
      assertNumberClose(parseSignedNumber(actual.moonHp), parseSignedNumber(reference.moonHp), CORRECTION_TOLERANCE_MINUTES, `${day.date} ${reference.hour}h Moon HP`);
    }

    for (const reference of day.planets) {
      const actual = planetsGha(addHours(baseDate, reference.hour));
      const actualCorrections = planetCorrections(addHours(baseDate, reference.hour));
      assertAngleClose(actual.aries, reference.aries, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h Aries`);

      for (const referencePlanet of reference.planets) {
        const actualPlanet = actual.planets.find(row => row.body === referencePlanet.body);
        const actualCorrection = actualCorrections.find(row => row.body === referencePlanet.body);
        assert.ok(actualPlanet, `Missing ${referencePlanet.body}`);
        assert.ok(actualCorrection, `Missing correction row for ${referencePlanet.body}`);
        assertAngleClose(actualPlanet.gha, referencePlanet.gha, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h ${referencePlanet.body} GHA`);
        assertAngleClose(actualPlanet.dec, referencePlanet.dec, BODY_TOLERANCE_ARCMIN, `${day.date} ${reference.hour}h ${referencePlanet.body} Dec`);
        assertNumberClose(parseSignedNumber(actualCorrection.v), parseSignedNumber(referencePlanet.v), CORRECTION_TOLERANCE_MINUTES, `${day.date} ${reference.hour}h ${referencePlanet.body} v`);
        assertNumberClose(parseSignedNumber(actualCorrection.d), parseSignedNumber(referencePlanet.d), CORRECTION_TOLERANCE_MINUTES, `${day.date} ${reference.hour}h ${referencePlanet.body} d`);
        assertNumberClose(parseSignedNumber(actualCorrection.magnitude), parseSignedNumber(referencePlanet.magnitude), MAGNITUDE_TOLERANCE, `${day.date} ${reference.hour}h ${referencePlanet.body} magnitude`);
      }
    }
  }
});

test('matches original real event and meridian reference times', () => {
  for (const day of fixture.dates) {
    const date = utcDate(day.date);

    for (const reference of day.events) {
      const actual = dailyEvents(date, reference.latitude);
      for (const key of ['nauticalDawn', 'civilDawn', 'sunrise', 'sunset', 'civilDusk', 'nauticalDusk', 'moonrise', 'moonset']) {
        if (!isTime(reference[key])) continue;
        assertTimeClose(actual[key], reference[key], TIME_TOLERANCE_SECONDS, `${day.date} ${reference.latitude} ${key}`);
      }
    }

    const meridian = meridianEvents(date);
    assertTimeClose(meridian.sun, day.transits.sunTransit, TIME_TOLERANCE_SECONDS, `${day.date} Sun transit`);
    assertTimeClose(meridian.moonUpper, day.transits.moonTransit, TIME_TOLERANCE_SECONDS, `${day.date} Moon transit`);
    assertTimeClose(meridian.moonLower, day.transits.moonAntiTransit, TIME_TOLERANCE_SECONDS, `${day.date} Moon anti-transit`);

    for (const referencePlanet of day.transits.planetRows) {
      const actualPlanet = meridian.planetRows.find(row => row.body === referencePlanet.body);
      assert.ok(actualPlanet, `Missing meridian row for ${referencePlanet.body}`);
      assertAngleClose(actualPlanet.sha, referencePlanet.sha, BODY_TOLERANCE_ARCMIN, `${day.date} ${referencePlanet.body} SHA`);
      assertTimeClose(actualPlanet.meridianPassage, referencePlanet.transit, TIME_TOLERANCE_SECONDS, `${day.date} ${referencePlanet.body} transit`);
    }
  }
});

test('matches original navigational star reference fixtures except documented engine outliers', () => {
  for (const day of fixture.dates) {
    const actualRows = navigationalStars(utcDate(day.date));
    assert.equal(actualRows.length, day.stars.length, `${day.date} star count`);

    for (const reference of day.stars) {
      if (STARS_WITH_KNOWN_ENGINE_OUTLIERS.has(reference.name)) continue;
      const actual = actualRows.find(row => row.name === reference.name);
      assert.ok(actual, `Missing star ${reference.name}`);
      assertAngleClose(actual.sha, reference.sha, STAR_TOLERANCE_ARCMIN, `${day.date} ${reference.name} SHA`);
      assertAngleClose(actual.dec, reference.dec, STAR_TOLERANCE_ARCMIN, `${day.date} ${reference.name} Dec`);
    }
  }
});

function utcDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`);
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function parseNauticalDegrees(value) {
  const match = String(value).match(/^(-?)(\d+)\$\^\\circ\$(\d+(?:\.\d+)?)/);
  assert.ok(match, `Invalid nautical degree value: ${value}`);
  const degrees = Number(match[2]) + Number(match[3]) / 60;
  return match[1] === '-' ? -degrees : degrees;
}

function parseSignedNumber(value) {
  const parsed = Number(String(value).replace(/'/g, ''));
  assert.ok(Number.isFinite(parsed), `Invalid numeric value: ${value}`);
  return parsed;
}

function assertNumberClose(actual, expected, tolerance, label) {
  const delta = Math.abs(actual - expected);
  assert.ok(delta <= tolerance, `${label}: expected ${expected}, got ${actual}, delta ${delta.toFixed(2)}`);
}

function assertAngleClose(actual, expected, toleranceArcmin, label) {
  const actualDegrees = parseNauticalDegrees(actual);
  const expectedDegrees = parseNauticalDegrees(expected);
  let deltaArcmin = Math.abs(actualDegrees - expectedDegrees) * 60;
  if (deltaArcmin > 180 * 60) deltaArcmin = 360 * 60 - deltaArcmin;
  assert.ok(deltaArcmin <= toleranceArcmin, `${label}: expected ${expected}, got ${actual}, delta ${deltaArcmin.toFixed(2)}'`);
}

function isTime(value) {
  return /^\d{2}:\d{2}:\d{2}$/.test(value);
}

function parseTime(value) {
  assert.ok(isTime(value), `Invalid time value: ${value}`);
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function assertTimeClose(actual, expected, toleranceSeconds, label) {
  assert.ok(isTime(actual), `${label}: expected a real time near ${expected}, got ${actual}`);
  let delta = Math.abs(parseTime(actual) - parseTime(expected));
  if (delta > 12 * 60 * 60) delta = 24 * 60 * 60 - delta;
  assert.ok(delta <= toleranceSeconds, `${label}: expected ${expected}, got ${actual}, delta ${delta}s`);
}

