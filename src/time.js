export function parseDateSpec(spec, today) {
  const value = spec.trim();

  if (value === '') {
    return { mode: 'days', startDate: today, dayCount: 1 };
  }

  if (/^\d{8}$/.test(value)) {
    const day = Number(value.slice(0, 2));
    const month = Number(value.slice(2, 4));
    const year = Number(value.slice(4));
    return { mode: 'days', startDate: validUtcDate(year, month, day), dayCount: 1 };
  }

  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    validateYear(year);
    return { mode: 'year', startDate: validUtcDate(year, 1, 1), dayCount: 0 };
  }

  if (/^\d{4}-\d{4}$/.test(value)) {
    const [first, last] = value.split('-').map(Number);
    validateYear(first);
    validateYear(last);
    if (last < first) throw new Error('The last year must be later than the first year.');
    return { mode: 'year-range', startDate: validUtcDate(first, 1, 1), endYear: last, dayCount: 0 };
  }

  if (/^\d{2}$/.test(value)) {
    const month = Number(value);
    validateMonth(month);
    const year = month < today.getUTCMonth() + 1 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
    return { mode: 'month', startDate: validUtcDate(year, month, 1), dayCount: -1 };
  }

  if (/^-\d{2}$/.test(value)) {
    const month = Number(value.slice(1));
    validateMonth(month);
    const year = month >= today.getUTCMonth() + 1 ? today.getUTCFullYear() - 1 : today.getUTCFullYear();
    return { mode: 'month', startDate: validUtcDate(year, month, 1), dayCount: -1 };
  }

  throw new Error('Enter numeric digits in a supported date format.');
}

export function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function formatCompactDate(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

function validUtcDate(year, month, day) {
  validateYear(year);
  validateMonth(month);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Enter a valid date.');
  }
  return date;
}

function validateYear(year) {
  if (!Number.isInteger(year) || year < 1000 || year > 3000) {
    throw new Error('Pick a year between 1000 and 3000.');
  }
}

function validateMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Enter month between 01 and 12.');
  }
}

function pad2(value) {
  return String(value).padStart(2, '0');
}
