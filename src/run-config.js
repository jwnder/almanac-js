import { addDays, formatCompactDate, parseDateSpec } from './time.js';

export function buildRunConfig(answers, now = new Date()) {
  const today = dateOnlyUtc(now);
  const base = {
    outputType: answers.outputType,
    paperSize: answers.paperSize,
    tableStyle: answers.tableStyle ?? 'traditional',
    keepTex: Boolean(answers.keepTex),
    keepLog: Boolean(answers.keepLog),
    verbose: Boolean(answers.verbose),
    dataPagesOnly: Boolean(answers.dataPagesOnly),
    outputDir: answers.outputDir || 'output'
  };

  if (answers.outputType === 'increments') {
    return {
      ...base,
      mode: 'static',
      startDate: today,
      dayCount: 0,
      fileBase: `Inc(${answers.paperSize})`
    };
  }

  if (answers.outputType === 'nautical-six-days') {
    return fixedDays(base, 'nautical', today, 6);
  }

  if (answers.outputType === 'sun-thirty-days') {
    return fixedDays(base, 'sun', today, 30);
  }

  if (answers.outputType === 'events-six-days') {
    return fixedDays(base, 'events', today, 6);
  }

  const parsed = parseDateSpec(answers.dateSpec ?? '', today);
  const dayCount = parsed.mode === 'days' ? Number(answers.dayCount ?? 1) : parsed.dayCount;

  return {
    ...base,
    outputType: answers.outputType,
    mode: parsed.mode,
    startDate: parsed.startDate,
    endYear: parsed.endYear,
    dayCount,
    fileBase: fileBaseFor(answers.outputType, base.tableStyle, answers.paperSize, parsed.startDate, dayCount, parsed)
  };
}

function fixedDays(base, outputType, startDate, dayCount) {
  return {
    ...base,
    outputType,
    mode: 'days',
    startDate,
    dayCount,
    fileBase: fileBaseFor(outputType, base.tableStyle, base.paperSize, startDate, dayCount)
  };
}

function fileBaseFor(outputType, tableStyle, paperSize, startDate, dayCount, parsed = {}) {
  if (outputType === 'events') {
    return eventFileBase(paperSize, startDate, dayCount, parsed);
  }

  const prefix = outputType === 'sun'
    ? tableStyle === 'modern' ? 'STmod' : 'STtrad'
    : tableStyle === 'modern' ? 'NAmod' : 'NAtrad';

  if (parsed.mode === 'year') return `${prefix}(${paperSize})_${startDate.getUTCFullYear()}`;
  if (parsed.mode === 'year-range') return `${prefix}(${paperSize})_${startDate.getUTCFullYear()}-${parsed.endYear}`;
  if (parsed.mode === 'month') return `${prefix}(${paperSize})_${startDate.getUTCFullYear()}-${pad2(startDate.getUTCMonth() + 1)}`;

  const endDate = addDays(startDate, dayCount - 1);
  const suffix = dayCount > 1 ? `-${formatCompactDate(endDate)}` : '';
  return `${prefix}(${paperSize})_${formatCompactDate(startDate)}${suffix}`;
}

function eventFileBase(paperSize, startDate, dayCount, parsed = {}) {
  if (parsed.mode === 'year') return `Event-Times(${paperSize})_${startDate.getUTCFullYear()}`;
  if (parsed.mode === 'year-range') return `Event-Times(${paperSize})_${startDate.getUTCFullYear()}-${parsed.endYear}`;
  if (parsed.mode === 'month') return `Event-Times(${paperSize})_${startDate.getUTCFullYear()}-${pad2(startDate.getUTCMonth() + 1)}`;

  const endDate = addDays(startDate, dayCount - 1);
  const suffix = dayCount > 1 ? `-${formatCompactDate(endDate)}` : '';
  return `Event-Times(${paperSize})_${formatCompactDate(startDate)}${suffix}`;
}

function dateOnlyUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}
