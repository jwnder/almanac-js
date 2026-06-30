import { addDays } from './time.js';
import { addHours, ariesTransit, bodyGhaDec, dailyEvents, equationOfTime, formatMinutes, meridianEvents, navigationalStars, planetsGha, planetCorrections, STANDARD_LATITUDES, sunMoon, sunMoonSemiDiameters } from './ephemeris/index.js';

const ROW_END = String.raw`\\`;
const NAV_PLANETS = ['Venus', 'Mars', 'Jupiter', 'Saturn'];
const LATITUDE_HEMISPHERE_ROWS = new Set([72, 70, 58, 40, 10, -10, -50, -60]);

export function makeNauticalAlmanacTex(config) {
  const layout = layoutFor(config);
  const dates = datesForConfig(config);
  const pages = chunkDays(dates, 3)
    .map((group, index) => nauticalThreeDaySpread(group, layout, !(config.dataPagesOnly && index === 0)))
    .join('\n');
  const titlePage = config.dataPagesOnly ? '' : nauticalTitlePage(config, dates);
  const initialGeometry = config.dataPagesOnly ? evenGeometryOptions(layout) : titleGeometryOptions(layout);
  const pageSetup = config.dataPagesOnly
    ? String.raw`\pagestyle{datapage}  % the default page style for the document`
    : String.raw`\pagestyle{datapage}  % the default page style for the document
\setcounter{page}{2}`;

  return String.raw`\documentclass[10pt, twoside, ${layout.paper}]{report}
%\usepackage[utf8]{inputenc}
\usepackage[english]{babel}
\usepackage{fontenc}
\usepackage{enumitem}
\usepackage[${initialGeometry}]{geometry}
%------------ page styles ------------
\usepackage{fancyhdr}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\fancypagestyle{frontpage}{
%  \fancyhf{}% clear all header and footer fields
}
\fancypagestyle{datapage}[frontpage]{
  \fancyfootoffset[R]{0pt}% recalculate \headwidth
  \cfoot{\centerline{Page \thepage}}
} %-----------------------------------
${layout.stylePackages}
\definecolor{khaki}{rgb}{0.76, 0.69, 0.57}
\usepackage{multirow}
\newcommand{\HRule}{\rule{\linewidth}{0.5mm}}
\newcommand{\AlwaysUp}{\rule{12pt}{4pt}}
\newcommand{\AlwaysDown}{\raisebox{0.24ex}{\boldmath$\cdot\cdot$~\boldmath$\cdot\cdot$}}
\newcommand{\NextDay}{\textit{next}}
\usepackage[pdftex]{graphicx}
\usepackage{tikz}
\setlength\fboxsep{1.5pt}
\begin{document}
${titlePage}
${pageSetup}
${pages}
\end{document}
`;
}

function titleGeometryOptions(layout) {
  return `nomarginpar, top=${layout.titleTop}, bottom=${layout.titleBottom}, left=${layout.titleLeft}, right=${layout.titleRight}`;
}

function evenGeometryOptions(layout) {
  return `nomarginpar, top=${layout.evenTop}, bottom=${layout.evenBottom}, outer=${layout.evenOuter}, inner=${layout.evenInner}, headsep=${layout.evenHeadSep}, footskip=${layout.footSkip}`;
}
function nauticalTitlePage(config, dates) {
  return String.raw`\pagestyle{frontpage}
    \begin{titlepage}
    \begin{center}
    \textsc{\Large Generated using Astronomy Engine}\\[0.7cm]
    % TRIM values: left bottom right top
    \IfFileExists{${config.chartPath ?? './A4chartNorth_P.pdf'}}{\includegraphics[clip, trim=5mm 8cm 5mm 21mm, width=0.8\textwidth]{${config.chartPath ?? './A4chartNorth_P.pdf'}}\\[2.0cm]}{\vspace*{5.5cm}}
    \textsc{\huge The Nautical Almanac}\\[1.5cm]
    \HRule \\[0.5cm]
    { \Huge \bfseries ${titleDateRange(config, dates)}}\\[0.2cm]
    \HRule \\
    \begin{center}\begin{tabular}[t]{rl}
${titleCreditRows()}
    \end{tabular}\end{center}
    {\large \today}
    \HRule \\[0.2cm]
    \end{center}
    \begin{description}[leftmargin=5.5em,style=nextline]\footnotesize
    \item[Disclaimer:] These are computer generated tables - use them at your own risk.
    The accuracy has been randomly checked, but cannot be guaranteed.
    The author claims no liability for any consequences arising from use of these tables.
    Besides, this publication only contains the 'daily pages' of the Nautical Almanac: an official version of the Nautical Almanac is indispensable.
    \end{description}
\end{titlepage}`;
}

function nauticalThreeDaySpread(dates, layout, pageBreakBefore = true) {
  const padded = padDates(dates);
  return String.raw`% ------------------ N E W   E V E N   P A G E ------------------
${pageBreakBefore ? String.raw`\newgeometry{${evenGeometryOptions(layout)}}` : ''}
${layout.modern ? String.raw`\sffamily
\fancyhead[LE]{\quad\textsf{\textbf{${evenHeader(padded)}}}}` : String.raw`\fancyhead[LE]{\quad\textbf{${evenHeader(padded)}}}`}
\begin{scriptsize}
${layout.modern ? String.raw`\vspace{6Pt}` : String.raw`\vspace{0Pt}`}\noindent
${planetHoursTable(padded, layout)}${layout.modern ? String.raw`\quad` : String.raw`\enskip`}
${starAndPlanetDetailTable(padded, layout)}
\end{scriptsize}
% ------------------ N E W   O D D   P A G E ------------------
\newgeometry{nomarginpar, top=${layout.oddTop}, bottom=${layout.oddBottom}, inner=${layout.oddInner}, outer=${layout.oddOuter}, headsep=${layout.oddHeadSep}, footskip=${layout.footSkip}}
${layout.modern ? String.raw`\fancyhead[RO]{\textsf{\textbf{${oddHeader(padded)}}}}
\fancyheadoffset[RO]{0pt}
\begin{scriptsize}
\quad` : String.raw`\fancyhead[RO]{\textbf{${oddHeader(padded)}}}
\fancyheadoffset[RO]{0pt}
\begin{scriptsize}`}
${sunMoonHoursTable(padded, layout)}${layout.modern ? String.raw`\quad\quad` : String.raw`\enskip`}
${twilightMoonEquationTable(padded, layout)}
\end{scriptsize}
`;
}

function planetHoursTable(dates, layout) {
  if (!layout.modern) return traditionalPlanetHoursTable(dates, layout);
  const sections = dates.map((date, index) => {
    const rows = [];
    const corrections = planetCorrections(startOfUtcDay(date));
    for (let hour = 0; hour < 24; hour += 1) {
      const at = hourDate(date, hour);
      const values = planetsGha(at);
      const planetCells = values.planets.map(planet => `${planet.gha} & ${formatDeclination(planet.dec, hour, layout)}`);
      rows.push(`${rowColor(hour, layout)}${formatHour(hour, layout)} & ${values.aries} && ${planetCells.join(' && ')} ${ROW_END}`);
    }

    const spacer = index === 0 ? '' : String.raw`\multicolumn{10}{c}{}${ROW_END}` + '\n';
    return String.raw`${spacer}\multicolumn{1}{c}{\textbf{${weekday(date)}}} & \multicolumn{1}{c}{\textbf{GHA}} && 
\multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c}{\textbf{Dec}} &&  \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c}{\textbf{Dec}} &&  \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c}{\textbf{Dec}} &&  \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c}{\textbf{Dec}}${ROW_END}
${rows.join('\n')}
\cmidrule{1-2} \cmidrule{4-5} \cmidrule{7-8} \cmidrule{10-11} \cmidrule{13-14}
\multicolumn{2}{c}{\footnotesize{Mer.pass. ${ariesTransit(date)}}} && ${correctionCells(corrections)}${ROW_END}
\cmidrule{1-2} \cmidrule{4-5} \cmidrule{7-8} \cmidrule{10-11} \cmidrule{13-14}`;
  });

  return String.raw`\renewcommand{\arraystretch}{${layout.modern ? '1.1' : '0.93'}}
\setlength{\tabcolsep}{${layout.modern ? '4pt' : '3.4pt'}}  % default 6pt
\begin{tabular}[t]{crcrrcrrcrrcrr}
\multicolumn{1}{c}{\normalsize{h}} & 
\multicolumn{1}{c}{\normalsize{Aries}} & & 
\multicolumn{2}{c}{\normalsize{Venus}}& & 
\multicolumn{2}{c}{\normalsize{Mars}} & & 
\multicolumn{2}{c}{\normalsize{Jupiter}} & & 
\multicolumn{2}{c}{\normalsize{Saturn}}${ROW_END}
\cmidrule{2-2} \cmidrule{4-5} \cmidrule{7-8} \cmidrule{10-11} \cmidrule{13-14}
${sections.join('\n')}
\end{tabular}`;
}

function traditionalPlanetHoursTable(dates, layout) {
  const sections = dates.map((date, index) => {
    const rows = [];
    const corrections = planetCorrections(startOfUtcDay(date));
    for (let hour = 0; hour < 24; hour += 1) {
      const values = planetsGha(hourDate(date, hour));
      const planetCells = values.planets.map(planet => `${planet.gha} & ${formatDeclination(planet.dec, hour, layout)}`);
      rows.push(`${hour} & ${values.aries} & ${planetCells.join(' & ')} ${traditionalRowEnd(hour)}`);
    }

    const spacer = index < 2 ? String.raw`\hline
\multicolumn{10}{c}{}\\` : '';
    return String.raw`\hline
\rule{0pt}{2.4ex}\textbf{${weekday(date)}} & \multicolumn{1}{c|}{\textbf{GHA}} & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}} & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}} & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}} & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}}${ROW_END}
\hline\rule{0pt}{2.6ex}\noindent
${rows.join('\n')}
\hline
\multicolumn{2}{|c|}{\rule{0pt}{2.4ex}Mer.pass. ${ariesTransit(date)}} & 
${traditionalCorrectionCells(corrections)}${ROW_END}
${spacer}`;
  });

  return String.raw`\noindent
\setlength{\tabcolsep}{4.8pt}  % default 6pt
\begin{tabular}[t]{|c|r|rr|rr|rr|rr|}
\multicolumn{1}{c}{\normalsize{}} & \multicolumn{1}{c}{\normalsize{Aries}} & \multicolumn{2}{c}{\normalsize{Venus}}& \multicolumn{2}{c}{\normalsize{Mars}} & \multicolumn{2}{c}{\normalsize{Jupiter}} & \multicolumn{2}{c}{\normalsize{Saturn}}${ROW_END}
${sections.join('\n')}
\hline
\end{tabular}`;
}

function traditionalCorrectionCells(corrections) {
  return NAV_PLANETS.map(name => {
    const row = corrections.find(item => item.body === name);
    return String.raw`\multicolumn{2}{c|}{\(\nu\) ${row?.v ?? '--'}$'$ \emph{d} ${row?.d ?? '--'}$'$ m ${row?.magnitude ?? '--'}\hphantom{0}}`;
  }).join(' & \n');
}

function traditionalRowEnd(hour) {
  return hour < 23 && (hour + 1) % 6 === 0 ? String.raw`\\[2Pt]` : ROW_END;
}
function correctionCells(corrections) {
  return NAV_PLANETS.map(name => {
    const row = corrections.find(item => item.body === name);
    return String.raw`\multicolumn{2}{c}{\footnotesize{\(\nu\)${row?.v ?? '--'}$'$ \emph{d}${row?.d ?? '--'}$'$ m${row?.magnitude ?? '--'}}}`;
  }).join(' && ');
}

function starAndPlanetDetailTable(dates, layout) {
  if (!layout.modern) return traditionalStarAndPlanetDetailTable(dates);
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

  return String.raw`\renewcommand{\arraystretch}{${layout.modern ? '1.1' : '0.96'}}
\setlength{\tabcolsep}{${layout.modern ? '4pt' : '3.4pt'}}  % default 6pt
\begin{tabular}[t]{|rrr|}
\multicolumn{3}{c}{\normalsize{Stars}}${ROW_END}
\hline
& \multicolumn{1}{c}{\multirow{2}{*}{\textbf{SHA}}} 
& \multicolumn{1}{c|}{\multirow{2}{*}{\textbf{Dec}}}${ROW_END}
& & \multicolumn{1}{c|}{} ${ROW_END}
${starRows.join('\n')}
${planetSections.join('\n')}
\hline
\multicolumn{2}{|r}{\textbf{Horizontal parallax}} & ${ROW_END}
${hpRows}
\hline
\end{tabular}`;
}

function traditionalStarAndPlanetDetailTable(dates) {
  const stars = navigationalStars(addDays(startOfUtcDay(dates[0]), 1));
  const starRows = stars.map(star => `${star.name} & ${star.sha} & ${formatTraditionalSignedDeclination(star.dec)} ${ROW_END}`);
  const planetSections = dates.map(date => {
    const rows = meridianEvents(date).planetRows.map(row => `${row.body} & ${row.sha} & ${trimSeconds(row.meridianPassage)} ${ROW_END}`);
    return String.raw`\hline
& & \multicolumn{1}{r|}{}\\[-2.0ex]
\textbf{${monthDayWeekday(date).replace(',', '')}} & \textbf{SHA} & \textbf{Mer.pass}${ROW_END}
${rows.join('\n')}\hline`;
  });
  const hpDate = startOfUtcDay(dates[0]);
  const venus = planetHorizontalParallax('Venus', hpDate);
  const mars = planetHorizontalParallax('Mars', hpDate);

  return String.raw`\setlength{\tabcolsep}{4.4pt}  % default 6pt
\begin{tabular}[t]{|rrr|}
\multicolumn{3}{c}{\normalsize{Stars}}${ROW_END}
\hline
\rule{0pt}{2.4ex} & \multicolumn{1}{c}{\textbf{SHA}} & \multicolumn{1}{c|}{\textbf{Dec}}${ROW_END}
\hline\rule{0pt}{2.6ex}\noindent
${starRows.join('\n')}
\hline
${planetSections.join('\n')}
\hline
& & \multicolumn{1}{r|}{}\\[-2.5ex]
\multicolumn{2}{|r}{\rule{0pt}{2.6ex}\textbf{Horizontal parallax}} & \multicolumn{1}{c|}{}${ROW_END}
\multicolumn{2}{|r}{Venus:} & \multicolumn{1}{c|}{${venus}} ${ROW_END}
\multicolumn{2}{|r}{Mars:} & \multicolumn{1}{c|}{${mars}} ${ROW_END}
\hline
\end{tabular}`;
}
function sunMoonHoursTable(dates, layout) {
  if (!layout.modern) return traditionalSunMoonHoursTable(dates, layout);
  const sections = dates.map((date, index) => {
    const rows = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const row = sunMoon(hourDate(date, hour));
      rows.push(`${rowColor(hour, layout)}${formatHour(hour, layout)} & ${row.sunGha} & ${formatDeclination(row.sunDec, hour, layout)} && ${row.moonGha} & ${row.moonV} & ${formatDeclination(row.moonDec, hour, layout)} & ${row.moonD} & ${row.moonHp} ${ROW_END}`);
    }
    const sd = sunMoonSemiDiameters(startOfUtcDay(date));
    const spacer = index === 0 ? '' : String.raw`\multicolumn{9}{c}{}${ROW_END}` + '\n';
    return String.raw`${spacer}\multicolumn{1}{c}{\textbf{${weekday(date)}}} & \multicolumn{2}{c}{\textbf{Sun}} && \multicolumn{5}{c}{\textbf{Moon}}${ROW_END}
\cmidrule{2-3}\cmidrule{5-9}
h & GHA & Dec && GHA & \(\nu\) & Dec & \emph{d} & HP ${ROW_END}
${rows.join('\n')}
\cmidrule{2-3}\cmidrule{5-9}
 & \footnotesize{SD = ${sd.sunSd}$'$} & \footnotesize{\emph{d} = ${sd.sunD}$'$} && \multicolumn{5}{c}{\footnotesize{SD = ${sd.moonSd}$'$}} ${ROW_END}`;
  });

  return String.raw`\renewcommand{\arraystretch}{0.95}
\setlength{\tabcolsep}{4pt}  % default 6pt
\begin{tabular}[t]{crrcrrrrr}
${sections.join('\n')}
\end{tabular}`;
}

function traditionalSunMoonHoursTable(dates, layout) {
  const sections = dates.map((date, index) => {
    const rows = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const row = sunMoon(hourDate(date, hour));
      rows.push(`${hour} & ${row.sunGha} & ${formatDeclination(row.sunDec, hour, layout)} & ${row.moonGha} & ${row.moonV} & ${formatDeclination(row.moonDec, hour, layout)} & ${row.moonD} & ${row.moonHp} ${traditionalRowEnd(hour)}`);
    }
    const sd = sunMoonSemiDiameters(startOfUtcDay(date));
    const spacer = index < 2 ? String.raw`\hline
\multicolumn{7}{c}{}\\[-1.5ex]` : '';
    return String.raw`\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.6ex}\textbf{${weekday(date)}}} &\multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c|}{\textbf{Dec}}  & \multicolumn{1}{c}{\textbf{GHA}} & \multicolumn{1}{c}{\(\nu\)} & \multicolumn{1}{c}{\textbf{Dec}} & \multicolumn{1}{c}{\textit{d}} & \multicolumn{1}{c|}{\textbf{HP}}${ROW_END}
\hline\rule{0pt}{2.6ex}\noindent
${rows.join('\n')}
\hline
\rule{0pt}{2.4ex} & \multicolumn{1}{c}{SD = ${sd.sunSd}$'$} & \multicolumn{1}{c|}{\textit{d} = ${sd.sunD}$'$} & \multicolumn{5}{c|}{SD = ${sd.moonSd}$'$}${ROW_END}
${spacer}`;
  });

  return String.raw`\noindent
\setlength{\tabcolsep}{4.8pt}  % default 6pt
\begin{tabular}[t]{|c|rr|rrrrr|}
\multicolumn{1}{c}{\normalsize{h}}& \multicolumn{2}{c}{\normalsize{Sun}} & \multicolumn{5}{c}{\normalsize{Moon}}${ROW_END}
${sections.join('\n')}
\hline
\end{tabular}`;
}
function twilightMoonEquationTable(dates, layout) {
  if (!layout.modern) return traditionalTwilightMoonEquationTable(dates);
  const middleDate = dates[1] ?? dates[0];
  const twilightRows = STANDARD_LATITUDES.map(latitude => {
    const events = dailyEvents(middleDate, latitude);
    return `${formatLatitudeLabel(latitude)} & ${formatEventCell(events.nauticalDawn)} & ${formatEventCell(events.civilDawn)} & ${formatEventCell(events.sunrise)} & ${formatEventCell(events.sunset)} & ${formatEventCell(events.civilDusk)} & ${formatEventCell(events.nauticalDusk)} ${ROW_END}`;
  });

  const moonRows = STANDARD_LATITUDES.flatMap(latitude => moonRowsForLatitude(dates, latitude));
  const equationRows = dates.map(date => {
    const equation = equationOfTime(date);
    const meridian = meridianEvents(date);
    return `${String(date.getUTCDate()).padStart(2, '0')} & ${equation.atMidnight} & ${equation.atNoon} & ${trimSeconds(meridian.sun)} & ${trimSeconds(meridian.moonUpper)} & ${trimSeconds(meridian.moonLower)} & ${equation.moonAge}(${equation.moonIllumination}\\%) ${ROW_END}`;
  });

  return String.raw`\renewcommand{\arraystretch}{0.88}
\setlength{\tabcolsep}{3.2pt}
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

function traditionalTwilightMoonEquationTable(dates) {
  const middleDate = dates[1] ?? dates[0];
  const twilightRows = STANDARD_LATITUDES.map(latitude => {
    const events = dailyEvents(middleDate, latitude);
    return `${formatLatitudeLabel(latitude)} & ${formatEventCell(events.nauticalDawn)} & ${formatEventCell(events.civilDawn)} & ${formatEventCell(events.sunrise)} & ${formatEventCell(events.sunset)} & ${formatEventCell(events.civilDusk)} & ${formatEventCell(events.nauticalDusk)} ${ROW_END}`;
  });
  const moonRows = STANDARD_LATITUDES.flatMap(latitude => moonRowsForLatitude(dates, latitude));
  const equationRows = dates.map((date, index) => {
    const equation = equationOfTime(date);
    const meridian = meridianEvents(date);
    const end = index === dates.length - 1 ? String.raw`\\[0.3ex]` : ROW_END;
    return `${String(date.getUTCDate()).padStart(2, '0')} & ${equation.atMidnight} & ${equation.atNoon} & ${trimSeconds(meridian.sun)} & ${trimSeconds(meridian.moonUpper)} & ${trimSeconds(meridian.moonLower)} & ${equation.moonAge}(${equation.moonIllumination}\\%) ${end}`;
  });

  return String.raw`\setlength{\tabcolsep}{4.8pt}  % default 6pt
\begin{tabular}[t]{|r|ccc|ccc|}
\multicolumn{7}{c}{\normalsize{}}${ROW_END}
\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.4ex}\multirow{2}{*}{\textbf{Lat.}}} & 
\multicolumn{2}{c}{\textbf{Twilight}} & 
\multicolumn{1}{|c|}{\multirow{2}{*}{\textbf{Sunrise}}} & 
\multicolumn{1}{c|}{\multirow{2}{*}{\textbf{Sunset}}} & 
\multicolumn{2}{c|}{\textbf{Twilight}}${ROW_END}
\multicolumn{1}{|c|}{} & 
\multicolumn{1}{c}{Naut.} & 
\multicolumn{1}{c}{Civil} & 
\multicolumn{1}{|c|}{} & 
\multicolumn{1}{c|}{} & 
\multicolumn{1}{c}{Civil} & 
\multicolumn{1}{c|}{Naut.}${ROW_END}
\hline\rule{0pt}{2.6ex}\noindent
${twilightRows.join('\n')}
\hline\multicolumn{7}{c}{}\\[-1.5ex]
\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.4ex}\multirow{2}{*}{\textbf{Lat.}}} & 
\multicolumn{3}{c|}{\textbf{Moonrise}} & 
\multicolumn{3}{c|}{\textbf{Moonset}}${ROW_END}
\multicolumn{1}{|c|}{} & 
\multicolumn{1}{c}{${weekday(dates[0])}} & 
\multicolumn{1}{c}{${weekday(dates[1])}} & 
\multicolumn{1}{c|}{${weekday(dates[2])}} & 
\multicolumn{1}{c}{${weekday(dates[0])}} & 
\multicolumn{1}{c}{${weekday(dates[1])}} & 
\multicolumn{1}{c|}{${weekday(dates[2])}} ${ROW_END}
\hline\rule{0pt}{2.6ex}\noindent
${moonRows.join('\n')}
\hline\multicolumn{7}{c}{}\\[-1.5ex]
\hline
\multicolumn{1}{|c|}{\rule{0pt}{2.4ex}\multirow{4}{*}{\textbf{Day}}} & 
\multicolumn{3}{c|}{\textbf{Sun}} & \multicolumn{3}{c|}{\textbf{Moon}}${ROW_END}
\multicolumn{1}{|c|}{} & \multicolumn{2}{c}{Eqn.of Time} & \multicolumn{1}{|c|}{Mer.} & \multicolumn{2}{c}{Mer.Pass.} & \multicolumn{1}{|c|}{}${ROW_END}
\multicolumn{1}{|c|}{} & \multicolumn{1}{c}{00\textsuperscript{h}} & \multicolumn{1}{c}{12\textsuperscript{h}} & \multicolumn{1}{|c|}{Pass} & \multicolumn{1}{c}{Upper} & \multicolumn{1}{c}{Lower} &\multicolumn{1}{|c|}{Age}${ROW_END}
\multicolumn{1}{|c|}{} & \multicolumn{1}{c}{mm:ss} & \multicolumn{1}{c}{mm:ss} & \multicolumn{1}{|c|}{hh:mm} & \multicolumn{1}{c}{hh:mm} & \multicolumn{1}{c}{hh:mm} &\multicolumn{1}{|c|}{}${ROW_END}
\hline\rule{0pt}{3.0ex}\noindent
${equationRows.join('\n')}
\hline
\end{tabular}`;
}
function moonRowsForLatitude(dates, latitude) {
  const label = formatLatitudeLabel(latitude);
  const events = dates.map(date => dailyEvents(date, latitude));
  const first = [...events.map(event => formatEventCell(event.moonrise)), ...events.map(event => formatEventCell(event.moonset))];
  const second = [...events.map(event => formatEventCell(event.secondMoonrise)), ...events.map(event => formatEventCell(event.secondMoonset))];
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
  const venus = planetHorizontalParallax('Venus', date);
  const mars = planetHorizontalParallax('Mars', date);
  return String.raw`\multicolumn{2}{|r}{Venus:} & ${venus} ${ROW_END}
\multicolumn{2}{|r}{Mars:} & ${mars} ${ROW_END}`;
}

function planetHorizontalParallax(body, date) {
  const EARTH_RADIUS_KM = 6371.0;
  const AU_KM = 149597870.7;
  const values = bodyGhaDec(body, date);
  const minutes = Math.asin(EARTH_RADIUS_KM / (values.distanceAu * AU_KM)) * 180 / Math.PI * 60;
  return formatMinutes(minutes, String.raw`$'$`);
}

function layoutFor(config) {
  const letter = config.paperSize === 'Letter';
  const modern = config.tableStyle === 'modern';

  return {
    paper: letter ? 'letterpaper' : 'a4paper',
    titleTop: letter ? '12mm' : '21mm',
    titleBottom: '15mm',
    titleLeft: letter ? '12mm' : '10mm',
    titleRight: letter ? '12mm' : '10mm',
    evenTop: letter ? '9.4mm' : '15.8mm',
    evenBottom: letter ? '8mm' : '12mm',
    evenOuter: letter ? '12.5mm' : '10mm',
    evenInner: letter ? '12.5mm' : '10mm',
    evenHeadSep: letter ? '2.8pt' : '3.0pt',
    oddTop: letter ? '8mm' : '16mm',
    oddBottom: letter ? '8mm' : '13mm',
    oddOuter: modern ? letter ? '13mm' : '11mm' : '11mm',
    oddInner: modern ? letter ? '13mm' : '14mm' : '14mm',
    oddHeadSep: letter ? '0pt' : '4.6pt',
    footSkip: '12pt',
    stylePackages: modern
      ? String.raw`\usepackage[table]{xcolor}
\definecolor{LightCyan}{rgb}{0.88,1,1}
\usepackage{booktabs}`
      : String.raw`\usepackage{xcolor}
\usepackage{booktabs}`,
    modern
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

function titleCreditRows() {
  return String.raw`    \large\emph{Author:} & \large Andrew \textsc{Bauer}\\
    \large\emph{Original concept from:} & \large Enno \textsc{Rodegerdts}\\
    \large\emph{Ported by:} & \large Aly \textsc{Abouelnour}\\`;
}

function titleDateRange(config, dates) {
  if (config.mode === 'year') return String(config.startDate.getUTCFullYear());
  if (config.mode === 'year-range') return `${config.startDate.getUTCFullYear()} - ${config.endYear}`;
  if (config.mode === 'month') return `${monthName(config.startDate)} ${config.startDate.getUTCFullYear()}`;
  const first = dates[0];
  const last = dates.at(-1);
  return first.getTime() === last.getTime() ? formatDmy(first) : `${formatDmy(first)} - ${formatDmy(last)}`;
}

function evenHeader(dates) {
  const first = dates[0];
  const days = dates.map(date => String(date.getUTCDate()).padStart(2, '0')).join(', ');
  const weekdays = dates.map(date => `${weekday(date)}.`).join(',  ');
  return `${monthName(first)} ${days}   (${weekdays})`;
}

function oddHeader(dates) {
  const first = dates[0];
  const last = dates.at(-1);
  return `${first.getUTCFullYear()} ${monthName(first)} ${String(first.getUTCDate()).padStart(2, '0')} to ${monthName(last).slice(0, 3)}. ${String(last.getUTCDate()).padStart(2, '0')}`;
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
  if (!showHemisphere) return hour % 3 === 0 ? String.raw`\raisebox{0.24ex}{\boldmath$\cdot$~\boldmath$\cdot$~~}${minutesOnly(degrees)}` : minutesOnly(degrees);
  return layout.modern ? String.raw`\textcolor{blue}{${hemisphere}}${degrees}` : String.raw`\textbf{${hemisphere}}${degrees}`;
}

function formatTraditionalSignedDeclination(value) {
  if (!value || value === '--') return value;
  const south = value.startsWith('-');
  const hemisphere = south ? 'S' : 'N';
  const degrees = south ? value.slice(1) : value;
  return String.raw`\textbf{${hemisphere}}${degrees}`;
}
function minutesOnly(value) {
  const match = /\$\^\\circ\$(.*)$/.exec(value);
  return match ? match[1] : value;
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

function formatEventCell(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(value) ? trimSeconds(value) : value;
}
function trimSeconds(value) {
  if (!value) return '--:--';
  return value.replace(/:\d{2}$/, '');
}

function formatDmy(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getUTCFullYear()}`;
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

