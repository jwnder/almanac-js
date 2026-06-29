import * as Astronomy from 'astronomy-engine';
import { DEG2RAD, RAD2DEG, formatMinutes, formatNauticalDegrees, normalizeDegrees } from './angles.js';

const AU_KM = Astronomy.KM_PER_AU;
const EARTH_RADIUS_KM = 6371.0;
const BODY_RADIUS_KM = {
  [Astronomy.Body.Sun]: 695700,
  [Astronomy.Body.Moon]: 1737.4
};

export const NAV_PLANETS = [
  Astronomy.Body.Venus,
  Astronomy.Body.Mars,
  Astronomy.Body.Jupiter,
  Astronomy.Body.Saturn
];

export function geocentricEquator(body, date) {
  const vector = Astronomy.GeoVector(body, date, true);
  const rotation = Astronomy.Rotation_EQJ_EQD(date);
  return Astronomy.EquatorFromVector(Astronomy.RotateVector(rotation, vector));
}

export function siderealDegrees(date) {
  return Astronomy.SiderealTime(date) * 15;
}

export function ghaDegrees(body, date) {
  const eq = geocentricEquator(body, date);
  return normalizeDegrees(siderealDegrees(date) - eq.ra * 15);
}

export function bodyGhaDec(body, date) {
  const eq = geocentricEquator(body, date);
  return {
    body,
    raHours: eq.ra,
    decDegrees: eq.dec,
    distanceAu: eq.dist,
    ghaDegrees: normalizeDegrees(siderealDegrees(date) - eq.ra * 15),
    gha: formatNauticalDegrees(normalizeDegrees(siderealDegrees(date) - eq.ra * 15)),
    dec: formatNauticalDegrees(eq.dec, 2)
  };
}

export function sunMoon(date) {
  const sun = bodyGhaDec(Astronomy.Body.Sun, date);
  const moon = bodyGhaDec(Astronomy.Body.Moon, date);
  const moonNext = bodyGhaDec(Astronomy.Body.Moon, addHours(date, 1));
  const moonGhaDelta = normalizeDegrees(moonNext.ghaDegrees - moon.ghaDegrees) - (14 + 19 / 60);
  const moonDecDelta = moonNext.decDegrees - moon.decDegrees;

  return {
    sunGha: sun.gha,
    sunDec: sun.dec,
    moonGha: moon.gha,
    moonV: formatMinutes(moonGhaDelta * 60, "'"),
    moonDec: moon.dec,
    moonD: formatMinutes(moonDecDelta * 60, "'"),
    moonHp: formatMinutes(horizontalParallaxMinutes(moon.distanceAu), "'"),
    sunDecDegrees: sun.decDegrees,
    moonDecDegrees: moon.decDegrees
  };
}

export function sunMoonSemiDiameters(date) {
  const sun = bodyGhaDec(Astronomy.Body.Sun, date);
  const sunNext = bodyGhaDec(Astronomy.Body.Sun, addHours(date, 1));
  const moon = bodyGhaDec(Astronomy.Body.Moon, date);

  return {
    sunD: formatMinutes((sunNext.decDegrees - sun.decDegrees) * 60),
    sunSd: formatMinutes(angularRadiusMinutes(Astronomy.Body.Sun, sun.distanceAu)),
    moonSd: formatMinutes(angularRadiusMinutes(Astronomy.Body.Moon, moon.distanceAu))
  };
}

export function planetsGha(date) {
  const aries = formatNauticalDegrees(siderealDegrees(date));
  const rows = NAV_PLANETS.map(body => bodyGhaDec(body, date));
  return { aries, planets: rows };
}

export function planetCorrections(date) {
  return NAV_PLANETS.map(body => {
    const current = bodyGhaDec(body, date);
    const next = bodyGhaDec(body, addHours(date, 1));
    const illumination = Astronomy.Illumination(body, date);
    const ghaDelta = normalizeDegrees(next.ghaDegrees - current.ghaDegrees) - 15;
    const decDelta = next.decDegrees - current.decDegrees;
    return {
      body,
      v: formatMinutes(ghaDelta * 60),
      d: formatMinutes(decDelta * 60),
      magnitude: illumination.mag.toFixed(1)
    };
  });
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function angularRadiusMinutes(body, distanceAu) {
  return Math.asin(BODY_RADIUS_KM[body] / (distanceAu * AU_KM)) * RAD2DEG * 60;
}

function horizontalParallaxMinutes(distanceAu) {
  return Math.asin(EARTH_RADIUS_KM / (distanceAu * AU_KM)) * RAD2DEG * 60;
}
