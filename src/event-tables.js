import { addDays } from './time.js';
import { dailyEvents, equationOfTime, meridianEvents, STANDARD_LATITUDES } from './ephemeris/index.js';

const ROW_END = String.raw`\\`;
const DOUBLE_EVENT_COLOR = 'khaki!45';

export function makeEventTablesTex(config) {
  const layout = layoutFor(config);
  const dates = datesForConfig(config);
  const pages = chunkDays(dates, 2)
    .map(group => eventPage(group, layout))
    .join('\n\\newpage\n');

  return String.raw`\documentclass[${layout.fontSize}, ${layout.paper}]{article}
\usepackage[margin=${layout.margin},landscape]{geometry}
\usepackage{array}
\usepackage{xcolor}
\definecolor{khaki}{RGB}{240,230,140}
\usepackage[T1]{fontenc}
\newcommand{\AlwaysUp}{\rule{12pt}{4pt}}
\newcommand{\AlwaysDown}{\raisebox{0.24ex}{\boldmath$\cdot\cdot$~\boldmath$\cdot\cdot$}}
\newcommand{\NextDay}{\textit{next}}
${layout.preamble}
\begin{document}
\section*{Event Time Tables}
${pages}
\end{document}
`;
}

function eventPage(dates, layout) {
  const title = dates.length > 1 ? `${formatLongDate(dates[0])} to ${formatShortDate(dates.at(-1))}` : formatLongDate(dates[0]);
  return String.raw`${layout.pageHeading(title)}
${dates.map(date => String.raw`${twilightTable(date, layout)}
\medskip
${meridianTable(date, layout)}`).join('\n\\bigskip\n')}
\medskip
${equationTable(dates, layout)}
`;
}

function twilightTable(date, layout) {
  const rows = STANDARD_LATITUDES.flatMap(latitude => twilightRows(date, latitude));

  return String.raw`\begin{tabular}[t]{${layout.twilightColumns}}
\hline
\multicolumn{9}{|c|}{\rule{0pt}{2.4ex}\textbf{${formatLongDate(date)}}} ${ROW_END}
\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.4ex}\textbf{Lat.}} & \multicolumn{2}{c}{\textbf{Twilight}} & \multicolumn{1}{|c|}{\textbf{Sunrise}} & \multicolumn{1}{c|}{\textbf{Sunset}} & \multicolumn{2}{c|}{\textbf{Twilight}} & \multicolumn{1}{c|}{\textbf{Moonrise}} & \multicolumn{1}{c|}{\textbf{Moonset}} ${ROW_END}
\multicolumn{1}{|c|}{} & Naut. & Civil & \multicolumn{1}{|c|}{} & \multicolumn{1}{c|}{} & Civil & \multicolumn{1}{c|}{Naut.} & \multicolumn{1}{c|}{} & \multicolumn{1}{c|}{} ${ROW_END}
\hline
${rows.join('\n')}
\hline
\end{tabular}`;
}

function twilightRows(date, latitude) {
  const events = dailyEvents(date, latitude);
  const label = formatLatitude(latitude);
  const hasSecondRise = events.secondMoonrise !== '--:--';
  const hasSecondSet = events.secondMoonset !== '--:--';

  if (!hasSecondRise && !hasSecondSet) {
    return [`${label} & ${events.nauticalDawn} & ${events.civilDawn} & ${events.sunrise} & ${events.sunset} & ${events.civilDusk} & ${events.nauticalDusk} & ${events.moonrise} & ${events.moonset} ${ROW_END}`];
  }

  const topRise = hasSecondRise ? colorbox(events.moonrise) : events.moonrise;
  const topSet = hasSecondSet ? colorbox(events.moonset) : events.moonset;
  const bottomRise = hasSecondRise ? colorbox(events.secondMoonrise) : '';
  const bottomSet = hasSecondSet ? colorbox(events.secondMoonset) : '';

  return [
    `${label} & ${events.nauticalDawn} & ${events.civilDawn} & ${events.sunrise} & ${events.sunset} & ${events.civilDusk} & ${events.nauticalDusk} & ${topRise} & ${topSet} ${ROW_END}`,
    ` &  &  &  &  &  &  & ${bottomRise} & ${bottomSet} ${ROW_END}`
  ];
}

function meridianTable(date, layout) {
  const events = meridianEvents(date);
  const rows = events.planetRows.map(row => `${row.body} & ${row.sha} & ${row.meridianPassage} ${ROW_END}`);

  return String.raw`\begin{tabular}[t]{${layout.meridianColumns}}
\hline
\textbf{${formatMonthDay(date)}} & \textbf{SHA} & \textbf{Mer.pass} ${ROW_END}
\hline
${rows.join('\n')}
\hline
\end{tabular}`;
}

function equationTable(dates, layout) {
  const rows = dates.map(date => {
    const eq = equationOfTime(date);
    return `${String(date.getUTCDate()).padStart(2, '0')} & ${eq.atMidnight} & ${eq.atNoon} & ${eq.sunTransit} & ${meridianEvents(date).moonUpper} & ${meridianEvents(date).moonLower} & ${eq.moonAge}(${eq.moonIllumination}\\%) ${ROW_END}`;
  });

  return String.raw`\begin{tabular}[t]{${layout.equationColumns}}
\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.4ex}\textbf{Day}} & \multicolumn{3}{c|}{\textbf{Sun}} & \multicolumn{3}{c|}{\textbf{Moon}} ${ROW_END}
\multicolumn{1}{|c|}{} & \multicolumn{2}{c}{Eqn.of Time} & \multicolumn{1}{|c|}{Mer.} & \multicolumn{2}{c}{Mer.Pass.} & \multicolumn{1}{c|}{Age} ${ROW_END}
\multicolumn{1}{|c|}{} & 00\textsuperscript{h} & 12\textsuperscript{h} & \multicolumn{1}{|c|}{Pass} & Upper & Lower & \multicolumn{1}{c|}{} ${ROW_END}
\hline
${rows.join('\n')}
\hline
\end{tabular}`;
}

function layoutFor(config) {
  const letter = config.paperSize === 'Letter';
  return {
    paper: letter ? 'letterpaper' : 'a4paper',
    fontSize: '9pt',
    margin: letter ? '7mm' : '8mm',
    preamble: String.raw`\renewcommand{\familydefault}{\sfdefault}
\renewcommand{\arraystretch}{1.05}`,
    pageHeading: value => String.raw`\subsection*{${value}}`,
    twilightColumns: '|r|c c|c|c|c c|c|c|',
    meridianColumns: '|l r r|',
    equationColumns: '|r|c c|c|c c|c|'
  };
}

function datesForConfig(config) {
  if (config.mode === 'month') return rangeDays(config.startDate, daysInMonth(config.startDate));
  if (config.mode === 'year') return rangeDays(config.startDate, daysInYear(config.startDate.getUTCFullYear()));
  if (config.mode === 'year-range') {
    const dates = [];
    for (let year = config.startDate.getUTCFullYear(); year <= config.endYear; year += 1) {
      dates.push(...rangeDays(new Date(Date.UTC(year, 0, 1)), daysInYear(year)));
    }
    return dates;
  }
  return rangeDays(config.startDate, Math.max(1, config.dayCount || 1));
}

function chunkDays(dates, size) {
  const chunks = [];
  for (let index = 0; index < dates.length; index += size) chunks.push(dates.slice(index, index + size));
  return chunks;
}

function rangeDays(startDate, count) {
  const dates = [];
  for (let i = 0; i < count; i += 1) dates.push(addDays(startDate, i));
  return dates;
}

function daysInMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function daysInYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

function colorbox(value) {
  return String.raw`\colorbox{${DOUBLE_EVENT_COLOR}}{${value}}`;
}

function formatLatitude(latitude) {
  const hemisphere = latitude < 0 ? 'S' : 'N';
  return String.raw`\textbf{${hemisphere}} ${Math.abs(latitude)}$^\circ$`;
}

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: '2-digit' });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit' });
}

function formatMonthDay(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit' });
}





