export function hhmm(date) {
  const rounded = new Date(date.getTime());
  const seconds = rounded.getUTCSeconds() + rounded.getUTCMilliseconds() / 1000;
  if (seconds >= 29.999) rounded.setUTCMinutes(rounded.getUTCMinutes() + 1);
  return `${pad2(rounded.getUTCHours())}:${pad2(rounded.getUTCMinutes())}`;
}

export function hhmmss(date) {
  const rounded = new Date(date.getTime());
  if (rounded.getUTCMilliseconds() >= 500) rounded.setUTCSeconds(rounded.getUTCSeconds() + 1);
  return `${pad2(rounded.getUTCHours())}:${pad2(rounded.getUTCMinutes())}:${pad2(rounded.getUTCSeconds())}`;
}

export function dateToTime(date, withSeconds = false) {
  return withSeconds ? hhmmss(date) : hhmm(date);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}
