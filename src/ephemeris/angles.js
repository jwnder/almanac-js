export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

export function roundHalfEven(value, digits = 0) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const sign = Math.sign(scaled) || 1;
  const absolute = Math.abs(scaled);
  const floor = Math.floor(absolute);
  const diff = absolute - floor;
  const epsilon = 1e-10;

  let rounded;
  if (Math.abs(diff - 0.5) < epsilon) {
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(absolute);
  }
  return sign * rounded / factor;
}

export function formatNauticalDegrees(degrees, fixedWidth = 1) {
  const sign = degrees < 0 ? '-' : '';
  const absolute = Math.abs(degrees);
  let wholeDegrees = Math.trunc(absolute);
  let minutes = roundHalfEven((absolute - wholeDegrees) * 60, 1);

  if (Math.trunc(minutes) === 60) {
    minutes -= 60;
    wholeDegrees += 1;
    if (wholeDegrees === 360) wholeDegrees = 0;
  }

  const degreeText = fixedWidth === 3
    ? String(wholeDegrees).padStart(3, '0')
    : fixedWidth === 2
      ? String(wholeDegrees).padStart(2, '0')
      : String(wholeDegrees);

  return `${sign}${degreeText}$^\\circ$${minutes.toFixed(1).padStart(4, '0')}`;
}

export function formatMinutes(value, suffix = '') {
  return `${roundHalfEven(value, 1).toFixed(1)}${suffix}`;
}
