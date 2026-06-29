import { addDays } from './time.js';
import { addHours, dailyEvents, equationOfTime, meridianEvents, navigationalStars, planetsGha, planetCorrections, STANDARD_LATITUDES, sunMoon, sunMoonSemiDiameters } from './ephemeris/index.js';

const ROW_END = String.raw`\\`;
const NAV_PLANETS = ['Venus', 'Mars', 'Jupiter', 'Saturn'];
const LATITUDE_HEMISPHERE_ROWS = new Set([72, 70, 58, 40, 10, -10, -50, -60]);

export function makeNauticalAlmanacTex(config) {
  const layout = layoutFor(config);
  const dates = datesForConfig(config);
  const pages = chunkDays(dates, 3)
    .map(group => nauticalThreeDaySpread(group, layout))
    .join('\n\\newpage\n');

  return String.raw`\documentclass[10pt, ${layout.paper}]{article}
\usepackage[margin=${layout.margin},landscape]{geometry}
\usepackage{array}
\usepackage{booktabs}
\usepackage{multirow}
\usepackage[table]{xcolor}
\usepackage[T1]{fontenc}
\definecolor{LightCyan}{rgb}{0.88,1,1}
\definecolor{khaki}{rgb}{0.76,0.69,0.57}
\newcommand{\AlwaysUp}{\rule{12pt}{4pt}}
\newcommand{\AlwaysDown}{\raisebox{0.24ex}{\boldmath$\cdot\cdot$~\boldmath$\cdot\cdot$}}
\newcommand{\NextDay}{\textit{next}}
\setlength\fboxsep{1.5pt}
${layout.preamble}
\begin{document}
\section*{${layout.title}}
${pages}
\end{document}
`;
}

function nauticalThreeDaySpread(dates, layout) {
  const padded = padDates(dates);
  return String.raw`${spreadHeading(padded, layout)}
\begin{scriptsize}
\noindent
\begin{minipage}[t]{0.70\textwidth}
${planetHoursTable(padded, layout)}
\end{minipage}\hfill
\begin{minipage}[t]{0.28\textwidth}
${starAndPlanetDetailTable(padded, layout)}
\end{minipage}

\vspace{0.8em}
\noindent
\begin{minipage}[t]{0.58\textwidth}
${sunMoonHoursTable(padded, layout)}
\end{minipage}\hfill
\begin{minipage}[t]{0.40\textwidth}
${twilightMoonEquationTable(padded, layout)}
\end{minipage}
\end{scriptsize}
`;
}

function planetHoursTable(dates, layout) {
  const sections = dates.map(date => {
    const rows = [];
    const corrections = planetCorrections(startOfUtcDay(date));
    for (let hour = 0; hour < 24; hour += 1) {
      const at = hourDate(date, hour);
      const values = planetsGha(at);
      const cells = [formatHour(hour, layout), values.aries];
      for (const planet of values.planets) cells.push(planet.gha, formatDeclination(planet.dec, hour, layout));
      rows.push(`${rowColor(hour, layout)}${cells.join(' & ')} ${ROW_END}`);
    }

    return String.raw`\multicolumn{14}{c}{\textbf{${weekday(date)}}} ${ROW_END}
\cmidrule{1-2}\cmidrule{4-5}\cmidrule{7-8}\cmidrule{10-11}\cmidrule{13-14}
h & Aries && Venus && Mars && Jupiter && Saturn ${ROW_END}
h & GHA && GHA & Dec && GHA & Dec && GHA & Dec && GHA & Dec ${ROW_END}
${rows.join('\n')}
\cmidrule{1-2}\cmidrule{4-5}\cmidrule{7-8}\cmidrule{10-11}\cmidrule{13-14}
\multicolumn{2}{c}{Mer. pass ${meridianEvents(date).planetRows[0]?.meridianPassage ?? '--:--:--'}} && ${correctionCells(corrections)} ${ROW_END}`;
  });

  return String.raw`\renewcommand{\arraystretch}{1.06}
\setlength{\tabcolsep}{3.2pt}
\begin{tabular}[t]{crcrrcrrcrrcrr}
${sections.join(String.raw`\[0.4ex]` + '\n')}
\end{tabular}`;
}

function correctionCells(corrections) {
  return NAV_PLANETS.map(name => {
    const row = corrections.find(item => item.body === name);
    return String.raw`\multicolumn{2}{c}{\footnotesize{$\nu$${row?.v ?? '--'}$'$ \emph{d}${row?.d ?? '--'}$'$ m${row?.magnitude ?? '--'}}}`;
  }).join(' && ');
}

function starAndPlanetDetailTable(dates, layout) {
  const stars = navigationalStars(addDays(startOfUtcDay(dates[0]), 1));
  const starRows = stars.map(star => `${star.name} & ${star.sha} & ${formatDeclination(star.dec, 0, layout, true)} ${ROW_END}`);
  const planetSections = dates.map(date => {
    const events = meridianEvents(date);
    const rows = events.planetRows.map(row => `${row.body} & ${row.sha} & ${row.meridianPassage} ${ROW_END}`);
    return String.raw`\hline
\multicolumn{3}{|c|}{\textbf{${monthDayWeekday(date)}}} ${ROW_END}
Object & SHA & Mer. pass ${ROW_END}
${rows.join('\n')}`;
  });
  const hpDate = startOfUtcDay(dates[0]);
  const hpRows = horizontalParallaxRows(hpDate);

  return String.raw`\renewcommand{\arraystretch}{1.03}
\setlength{\tabcolsep}{3.3pt}
\begin{tabular}[t]{|r r r|}
\multicolumn{3}{c}{\normalsize{Stars}} ${ROW_END}
\hline
 & \textbf{SHA} & \textbf{Dec} ${ROW_END}
${starRows.join('\n')}
${planetSections.join('\n')}
\hline
\multicolumn{2}{|r}{\textbf{Horizontal parallax}} & ${ROW_END}
${hpRows}
\hline
\end{tabular}`;
}

function sunMoonHoursTable(dates, layout) {
  const sections = dates.map(date => {
    const rows = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const row = sunMoon(hourDate(date, hour));
      rows.push(`${rowColor(hour, layout)}${formatHour(hour, layout)} & ${row.sunGha} & ${formatDeclination(row.sunDec, hour, layout)} && ${row.moonGha} & ${row.moonV} & ${formatDeclination(row.moonDec, hour, layout)} & ${row.moonD} & ${row.moonHp} ${ROW_END}`);
    }
    const sd = sunMoonSemiDiameters(startOfUtcDay(date));
    return String.raw`\multicolumn{9}{c}{\textbf{${weekday(date)}}} ${ROW_END}
\cmidrule{1-3}\cmidrule{5-9}
h & \multicolumn{2}{c}{Sun} && \multicolumn{5}{c}{Moon} ${ROW_END}
h & GHA & Dec && GHA & $\nu$ & Dec & \emph{d} & HP ${ROW_END}
${rows.join('\n')}
\cmidrule{2-3}\cmidrule{5-9}
 & \footnotesize{SD = ${sd.sunSd}$'$} & \footnotesize{\emph{d} = ${sd.sunD}$'$} && \multicolumn{5}{c}{\footnotesize{SD = ${sd.moonSd}$'$}} ${ROW_END}`;
  });

  return String.raw`\renewcommand{\arraystretch}{1.06}
\setlength{\tabcolsep}{3.2pt}
\begin{tabular}[t]{crrcrrrrr}
${sections.join(String.raw`\[0.4ex]` + '\n')}
\end{tabular}`;
}

function twilightMoonEquationTable(dates, layout) {
  const middleDate = dates[1] ?? dates[0];
  const twilightRows = STANDARD_LATITUDES.map(latitude => {
    const events = dailyEvents(middleDate, latitude);
    return `${formatLatitudeLabel(latitude)} & ${events.nauticalDawn} & ${events.civilDawn} & ${events.sunrise} & ${events.sunset} & ${events.civilDusk} & ${events.nauticalDusk} ${ROW_END}`;
  });

  const moonRows = STANDARD_LATITUDES.flatMap(latitude => moonRowsForLatitude(dates, latitude));
  const equationRows = dates.map(date => {
    const equation = equationOfTime(date);
    const meridian = meridianEvents(date);
    return `${String(date.getUTCDate()).padStart(2, '0')} & ${equation.atMidnight} & ${equation.atNoon} & ${meridian.sun} & ${meridian.moonUpper} & ${meridian.moonLower} & ${equation.moonAge}(${equation.moonIllumination}\%) ${ROW_END}`;
  });

  return String.raw`\renewcommand{\arraystretch}{1.03}
\setlength{\tabcolsep}{3.4pt}
\begin{tabular}[t]{|r|ccc|ccc|}
\multicolumn{7}{c}{\normalsize{Twilight for ${weekday(middleDate)}}} ${ROW_END}
\hline
\textbf{Lat.} & \multicolumn{2}{c}{\textbf{Twilight}} & \textbf{Sunrise} & \textbf{Sunset} & \multicolumn{2}{c|}{\textbf{Twilight}} ${ROW_END}
 & Naut. & Civil & & & Civil & Naut. ${ROW_END}
\hline
${twilightRows.join('\n')}
\hline
\multicolumn{7}{c}{} ${ROW_END}
\hline
\textbf{Lat.} & \multicolumn{3}{c|}{\textbf{Moonrise}} & \multicolumn{3}{c|}{\textbf{Moonset}} ${ROW_END}
 & ${dates.map(weekday).join(' & ')} & ${dates.map(weekday).join(' & ')} ${ROW_END}
\hline
${moonRows.join('\n')}
\hline
\multicolumn{7}{c}{} ${ROW_END}
\hline
\textbf{Day} & \multicolumn{3}{c|}{\textbf{Sun}} & \multicolumn{3}{c|}{\textbf{Moon}} ${ROW_END}
 & 00\textsuperscript{h} & 12\textsuperscript{h} & Mer. pass & Upper & Lower & Age ${ROW_END}
\hline
${equationRows.join('\n')}
\hline
\end{tabular}`;
}

function moonRowsForLatitude(dates, latitude) {
  const label = formatLatitudeLabel(latitude);
  const events = dates.map(date => dailyEvents(date, latitude));
  const first = [...events.map(event => event.moonrise), ...events.map(event => event.moonset)];
  const second = [...events.map(event => event.secondMoonrise), ...events.map(event => event.secondMoonset)];
  const hasSecond = second.some(value => value !== '--:--');

  if (!hasSecond) return [`${label} & ${first.join(' & ')} ${ROW_END}`];

  const top = first.map((value, index) => second[index] !== '--:--' ? String.raw`\colorbox{khaki!45}{${value}}` : String.raw`\multirow{2}{*}{${value}}`);
  const bottom = second.map(value => value !== '--:--' ? String.raw`\colorbox{khaki!45}{${value}}` : '');
  return [
    String.raw`\multirow{2}{*}{${label}} & ${top.join(' & ')} ${ROW_END}`,
    ` & ${bottom.join(' & ')} ${ROW_END}`
  ];
}

function horizontalParallaxRows(date) {
  const values = planetCorrections(date);
  const venus = values.find(row => row.body === 'Venus')?.magnitude ?? '--';
  const mars = values.find(row => row.body === 'Mars')?.magnitude ?? '--';
  return String.raw`\multicolumn{2}{|r}{Venus mag.} & ${venus} ${ROW_END}
\multicolumn{2}{|r}{Mars mag.} & ${mars} ${ROW_END}`;
}

function layoutFor(config) {
  const modern = config.tableStyle === 'modern';
  const letter = config.paperSize === 'Letter';

  return {
    modern,
    paper: letter ? 'letterpaper' : 'a4paper',
    margin: letter ? '7mm' : '8mm',
    title: modern ? 'Modern Nautical Almanac' : 'Nautical Almanac',
    preamble: modern
      ? String.raw`\renewcommand{\familydefault}{\sfdefault}
\renewcommand{\arraystretch}{1.06}`
      : String.raw`\renewcommand{\arraystretch}{1.0}`
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

function spreadHeading(dates, layout) {
  const first = dates[0];
  const last = dates.at(-1);
  const value = `${first.getUTCFullYear()} ${monthName(first)} ${String(first.getUTCDate()).padStart(2, '0')} to ${monthName(last).slice(0, 3)}. ${String(last.getUTCDate()).padStart(2, '0')} (${dates.map(weekday).join(', ')})`;
  return layout.modern ? String.raw`\subsection*{${value} \normalfont\small Modern}` : String.raw`\subsection*{${value}}`;
}

function formatHour(hour, layout) {
  return layout.modern ? String.raw`\color{blue}{${hour}}` : String(hour);
}

function rowColor(hour, layout) {
  if (!layout.modern) return '';
  return Math.floor(hour / 6) % 2 === 1 ? String.raw`\rowcolor{LightCyan}` + '\n' : '';
}

function formatDeclination(value, hour, layout, forceHemisphere = false) {
  if (!value || value === '--') return value;
  const south = value.startsWith('-');
  const hemisphere = south ? 'S' : 'N';
  const degrees = south ? value.slice(1) : value;
  const showHemisphere = forceHemisphere || hour % 6 === 0;
  if (!showHemisphere) return degrees;
  return layout.modern ? String.raw`\textcolor{blue}{${hemisphere}}${degrees}` : String.raw`\textbf{${hemisphere}}${degrees}`;
}

function formatLatitudeLabel(latitude) {
  const hemisphere = latitude < 0 ? 'S' : 'N';
  const labelHemisphere = LATITUDE_HEMISPHERE_ROWS.has(latitude) ? String.raw`\textbf{${hemisphere}} ` : '';
  return String.raw`${labelHemisphere}${Math.abs(latitude)}$^\circ$`;
}

function padDates(dates) {
  const padded = [...dates];
  while (padded.length < 3) padded.push(addDays(padded.at(-1), 1));
  return padded;
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

function hourDate(date, hour) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour));
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function weekday(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
}

function monthName(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' });
}

function monthDayWeekday(date) {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', weekday: 'short' });
}