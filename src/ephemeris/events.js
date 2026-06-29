import * as Astronomy from 'astronomy-engine';
import { hhmmss } from './time-format.js';
import { formatNauticalDegrees } from './angles.js';
import { bodyGhaDec } from './bodies.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const EVENT_MARKERS = Object.freeze({
  alwaysUp: String.raw`\AlwaysUp`,
  alwaysDown: String.raw`\AlwaysDown`,
  nextDay: String.raw`\NextDay`
});

export const STANDARD_LATITUDES = [72, 70, 68, 66, 64, 62, 60, 58, 56, 54, 52, 50, 45, 40, 35, 30, 20, 10, 0, -10, -20, -30, -35, -40, -45, -50, -52, -54, -56, -58, -60];

export function dailyEvents(date, latitude, longitude = 0) {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const moonrise = searchRiseSetEventsOnDate(Astronomy.Body.Moon, observer, 1, date);
  const moonset = searchRiseSetEventsOnDate(Astronomy.Body.Moon, observer, -1, date);

  return {
    latitude,
    nauticalDawn: searchAltitudeOnDate(Astronomy.Body.Sun, observer, 1, date, -12),
    civilDawn: searchAltitudeOnDate(Astronomy.Body.Sun, observer, 1, date, -6),
    sunrise: searchRiseSetOnDate(Astronomy.Body.Sun, observer, 1, date),
    sunset: searchRiseSetOnDate(Astronomy.Body.Sun, observer, -1, date),
    civilDusk: searchAltitudeOnDate(Astronomy.Body.Sun, observer, -1, date, -6),
    nauticalDusk: searchAltitudeOnDate(Astronomy.Body.Sun, observer, -1, date, -12),
    moonrise: moonrise.first,
    moonset: moonset.first,
    secondMoonrise: moonrise.second,
    secondMoonset: moonset.second
  };
}

export function meridianEvents(date, longitude = 0) {
  const observer = new Astronomy.Observer(0, longitude, 0);
  const sun = searchHourAngle(Astronomy.Body.Sun, observer, 0, date);
  const moonUpper = searchHourAngle(Astronomy.Body.Moon, observer, 0, date);
  const moonLower = searchHourAngle(Astronomy.Body.Moon, observer, 12, date);
  const planetRows = [Astronomy.Body.Venus, Astronomy.Body.Mars, Astronomy.Body.Jupiter, Astronomy.Body.Saturn]
    .map(body => {
      const eq = bodyGhaDec(body, date);
      const transit = searchHourAngle(body, observer, 0, date);
      return {
        body,
        sha: formatNauticalDegrees(360 - eq.raHours * 15),
        meridianPassage: transit
      };
    });

  return { sun, moonUpper, moonLower, planetRows };
}

export function equationOfTime(date, longitude = 0) {
  const start = startOfUtcDay(date);
  const observer = new Astronomy.Observer(0, longitude, 0);
  const antiTransit = searchHourAngleDate(Astronomy.Body.Sun, observer, 12, new Date(start.getTime() - 0.1 * DAY_MS));
  const transit = searchHourAngleDate(Astronomy.Body.Sun, observer, 0, new Date(start.getTime() + 0.4 * DAY_MS));
  const noon = new Date(start.getTime() + DAY_MS / 2);
  const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, start);
  const previousNewMoon = Astronomy.SearchMoonPhase(0, new Date(start.getTime() + DAY_MS / 2), -40);

  return {
    atMidnight: formatEquationOffset(antiTransit.date.getTime() - start.getTime()),
    atNoon: formatEquationOffset(transit.date.getTime() - noon.getTime()),
    sunTransit: hhmmss(transit.date),
    moonAge: Math.round((start.getTime() + DAY_MS / 2 - previousNewMoon.date.getTime()) / DAY_MS),
    moonIllumination: Math.round(moonIllumination.phase_fraction * 100)
  };
}

function searchRiseSetOnDate(body, observer, direction, date) {
  const result = Astronomy.SearchRiseSet(body, observer, direction, startOfUtcDay(date), 1, 0);
  return formatEventTime(result, date, body, observer);
}

function searchRiseSetEventsOnDate(body, observer, direction, date) {
  const firstResult = Astronomy.SearchRiseSet(body, observer, direction, startOfUtcDay(date), 1, 0);
  const first = formatEventTime(firstResult, date, body, observer);
  let second = '--:--';

  if (firstResult?.date && sameUtcDay(firstResult.date, date)) {
    const nextSearchStart = new Date(firstResult.date.getTime() + 1000);
    const dayEnd = new Date(startOfUtcDay(date).getTime() + DAY_MS);
    const remainingDays = Math.max(0, (dayEnd.getTime() - nextSearchStart.getTime()) / DAY_MS);
    if (remainingDays > 0) {
      const secondResult = Astronomy.SearchRiseSet(body, observer, direction, nextSearchStart, remainingDays, 0);
      if (secondResult?.date && sameUtcDay(secondResult.date, date)) second = hhmmss(secondResult.date);
    }
  }

  return { first, second };
}

function searchAltitudeOnDate(body, observer, direction, date, altitude) {
  const result = Astronomy.SearchAltitude(body, observer, direction, startOfUtcDay(date), 1, altitude);
  return formatEventTime(result, date, body, observer, altitude);
}

function searchHourAngle(body, observer, hourAngle, date) {
  const result = searchHourAngleDate(body, observer, hourAngle, startOfUtcDay(date));
  return result ? formatEventTime(result, date, body, observer) : '--:--:--';
}

function searchHourAngleDate(body, observer, hourAngle, date) {
  const result = Astronomy.SearchHourAngle(body, observer, hourAngle, date, 1);
  return result?.time ?? null;
}

function formatEventTime(astroTime, date, body, observer, targetAltitude = 0) {
  if (!astroTime?.date) return continuousMarker(body, observer, date, targetAltitude);
  if (!sameUtcDay(astroTime.date, date)) return EVENT_MARKERS.nextDay;
  return hhmmss(astroTime.date);
}

function continuousMarker(body, observer, date, targetAltitude = 0) {
  const noon = new Date(startOfUtcDay(date).getTime() + DAY_MS / 2);
  const eq = Astronomy.Equator(body, noon, observer, true, true);
  const horizon = Astronomy.Horizon(noon, observer, eq.ra, eq.dec, 'normal');
  return horizon.altitude >= targetAltitude ? EVENT_MARKERS.alwaysUp : EVENT_MARKERS.alwaysDown;
}

function formatEquationOffset(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1000);
  const absolute = Math.abs(totalSeconds);
  const minutes = Math.floor(absolute / 60);
  const seconds = absolute % 60;
  const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return totalSeconds >= 0 ? String.raw`\colorbox{lightgray!60}{${text}}` : text;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function sameUtcDay(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();
}
