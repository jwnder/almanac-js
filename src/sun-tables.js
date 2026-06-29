import * as Astronomy from 'astronomy-engine';
import { addDays } from './time.js';
import { bodyGhaDec, sunMoonSemiDiameters } from './ephemeris/index.js';

const ROW_END = String.raw`\\`;

export function makeSunTablesTex(config) {
  const layout = layoutFor(config);
  const dates = datesForConfig(config);
  const pages = chunkDays(dates, layout.daysPerPage)
    .map(group => sunPage(group, layout))
    .join('\n\\newpage\n');

  return String.raw`\documentclass[${layout.fontSize}, ${layout.paper}]{article}
\usepackage[margin=${layout.margin}]{geometry}
\usepackage{longtable}
\usepackage{array}
\usepackage{xcolor}
${layout.booktabsPackage}
\usepackage[T1]{fontenc}
${layout.preamble}
\begin{document}
\section*{${layout.title}}
${pages}
\end{document}
`;
}

function sunPage(dates, layout) {
  const rangeTitle = dates.length > 1 ? `${formatDate(dates[0], layout)} - ${formatDate(dates.at(-1), layout)}` : formatDate(dates[0], layout);
  return String.raw`${layout.pageHeading(rangeTitle)}
\noindent
${dates.map(date => sunDayTable(date, layout)).join(layout.tableGap)}
`;
}

function sunDayTable(date, layout) {
  const rows = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const at = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour));
    const sun = bodyGhaDec(Astronomy.Body.Sun, at);
    const rowEnd = hour < 23 && (hour + 1) % 6 === 0 ? `${ROW_END}${layout.sixHourGap}` : ROW_END;
    rows.push(`${hour} & ${sun.gha} & ${formatSunDeclination(sun.dec, layout, hour)} ${rowEnd}`);
  }
  const sd = sunMoonSemiDiameters(date);

  return String.raw`\begin{tabular}[t]{${layout.columns}}
${layout.dayHeader(date)}
${layout.rule}
${rows.join('\n')}
${layout.rule}
\rule{0pt}{2.4ex} & \multicolumn{1}{c}{SD=${sd.sunSd}$'$} & \multicolumn{1}{c}{\textit{d}\,=\,${sd.sunD}$'$} ${ROW_END}
${layout.bottomRule}
\end{tabular}`;
}

function formatSunDeclination(value, layout, hour) {
  if (!layout.modern) return value;
  if (hour % 6 === 0) return String.raw`\textcolor{blue}{${value}}`;
  return value;
}

function layoutFor(config) {
  const modern = config.tableStyle === 'modern';
  const letter = config.paperSize === 'Letter';
  return {
    modern,
    paper: letter ? 'letterpaper' : 'a4paper',
    fontSize: modern ? '9pt' : '10pt',
    margin: letter ? '11mm' : '12mm',
    daysPerPage: modern ? 4 : 3,
    title: modern ? 'Modern Sun Tables' : 'Sun Tables',
    booktabsPackage: modern ? String.raw`\usepackage{booktabs}` : '',
    preamble: modern
      ? String.raw`\renewcommand{\familydefault}{\sfdefault}
\renewcommand{\arraystretch}{1.08}
\setlength{\tabcolsep}{4pt}`
      : String.raw`\renewcommand{\arraystretch}{1.0}`,
    pageHeading: value => modern ? String.raw`\subsection*{${value} \normalfont\small Modern}` : String.raw`\subsection*{${value}}`,
    tableGap: modern ? '\n\\hspace{1.2em}\n' : '\n\\hspace{1.8em}\n',
    columns: modern ? 'c r r' : '|c|r r|',
    rule: modern ? String.raw`\midrule` : String.raw`\hline`,
    bottomRule: modern ? String.raw`\bottomrule` : String.raw`\hline`,
    sixHourGap: modern ? String.raw`[1pt]` : String.raw`[2pt]`,
    dayHeader: date => modern
      ? String.raw`\multicolumn{1}{c}{\footnotesize{\textbf{${String(date.getUTCDate()).padStart(2, '0')}}}} & \multicolumn{1}{c}{\footnotesize{\textbf{GHA}}} & \multicolumn{1}{c}{\footnotesize{\textbf{Dec}}} ${ROW_END}`
      : String.raw`\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.6ex}\textbf{${String(date.getUTCDate()).padStart(2, '0')}}} & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}} ${ROW_END}`
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
  for (let index = 0; index < dates.length; index += size) {
    chunks.push(dates.slice(index, index + size));
  }
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
  return isLeapYear(year) ? 366 : 365;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function formatDate(date, layout) {
  if (layout.paper === 'letterpaper') {
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
  }
  return `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`;
}
