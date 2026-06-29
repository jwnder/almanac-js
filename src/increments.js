const PI = Math.PI;
const ROW_END = String.raw`\\` + '\n';

export function makeIncrementsTex(config) {
  const isA4 = config.paperSize === 'A4';
  const paper = isA4 ? 'a4paper' : 'letterpaper';
  const tm = '15mm';
  const bm = '15mm';
  const lm = '8mm';
  const rm = '8mm';
  const colsep = isA4 ? '' : '5pt';

  return String.raw`\documentclass[10pt, ${paper}]{scrreprt}
\usepackage[automark]{scrlayer-scrpage}
\pagestyle{scrheadings}
\clearpairofpagestyles
\chead{\large \textbf{Increments and Corrections}}
\usepackage[english]{babel}
\usepackage{fontenc}
\usepackage{multirow}
\usepackage{array, multicol, blindtext}
\usepackage[landscape,headsep=0mm, headheight=5mm, top=${tm}, bottom=${bm}, left=${lm}, right=${rm}]{geometry}
\newcommand{\HRule}{\rule{\linewidth}{0.9mm}}
\usepackage[pdftex]{graphicx}
\begin{document}
\hbadness=10000
\newcount\hbadness
\hfuzz=6.5Pt
\newdimen\hfuzz
\begin{scriptsize}
${allIncrementTabs(colsep)}
${refractionTable()}
${parallaxTable()}
${dipTable()}
\end{scriptsize}
\newpage
\begin{multicols}{2}
\begin{scriptsize}
${venusMarsParallaxTable()}
\end{scriptsize}
\newpage
${aboutTables()}
\end{multicols}
\end{document}
`;
}

export function degMin(deg) {
  const sign = deg < 0 ? '-' : '';
  const absolute = Math.abs(deg);
  let degrees = Math.trunc(absolute);
  let minutes = roundHalfEven((absolute - degrees) * 60, 1);
  if (Math.trunc(minutes) === 60) {
    minutes -= 60;
    degrees += 1;
    if (degrees === 360) degrees = 0;
  }
  return `${sign}${degrees}$^\\circ$${formatFixed(minutes, 1, 4)}`;
}

function decDeg(degrees, minutes) {
  return Number(degrees) + Number(minutes) / 60;
}

function rad(degrees, minutes) {
  return decDeg(degrees, minutes) / 180 * PI;
}

function sunIncrement(minutes, seconds) {
  const hour = (seconds / 60 + minutes) / 60;
  return degMin(15 * hour);
}

function ariesIncrement(minutes, seconds) {
  const hour = (seconds / 60 + minutes) / 60;
  return degMin(decDeg(15, 2.46) * hour);
}

function moonIncrement(minutes, seconds) {
  const hour = (seconds / 60 + minutes) / 60;
  return degMin(decDeg(14, 19.0) * hour);
}

function vCorrection(minutes, v) {
  return roundHalfEven(v * ((minutes + 0.5) / 60), 1);
}

function incrementTable(minutes) {
  let table = String.raw`
\noindent
\begin{tabular*}{0.33\textwidth}[t]{@{\extracolsep{\fill}}|>{\bfseries}p{0.3cm}|>{\hspace{-3pt}}r|>{\hspace{-3pt}}r|>{\hspace{-3pt}}r||>{\hspace{-3pt}}c>{\hspace{-3pt}}c>{\hspace{-3pt}}c<{\hspace{-3pt}}|}
\hline
{\tiny m} \textbf{${Math.trunc(minutes)}} & \multicolumn{1}{p{0.5cm}|}{\textbf{Sun Plan.}} & \multicolumn{1}{c|}{\multirow{2}{*}{\textbf{Aries}}} &
\multicolumn{1}{c||}{\multirow{2}{*}{\textbf{Moon}}} &
\multicolumn{3}{c|}{\multirow{2}{*}{\textit{\textbf{v and d corr}}}}\\
\hline
`;

  for (let sec = 0; sec < 60; sec += 1) {
    table += `${sec} & ${sunIncrement(minutes, sec)} & ${ariesIncrement(minutes, sec)} & ${moonIncrement(minutes, sec)} & ${fixed1(0.1 * sec)} - ${fixed1(vCorrection(minutes, 0.1 * sec))} & ${fixed1(6 + 0.1 * sec)} - ${fixed1(vCorrection(minutes, 6 + 0.1 * sec))} & ${fixed1(12 + 0.1 * sec)} - ${fixed1(vCorrection(minutes, 12 + 0.1 * sec))} ${ROW_END}`;
  }

  table += String.raw`\hline \end{tabular*}`;
  return table;
}

function allIncrementTabs(colsep) {
  let table = '';
  if (colsep !== '') {
    table += String.raw`
\newlength{\oldtabcolsep}
\setlength{\oldtabcolsep}{\tabcolsep}
\setlength{\tabcolsep}{${colsep}}`;
  }

  for (let minutes = 0; minutes < 60; minutes += 1) {
    table += incrementTable(minutes);
  }

  if (colsep !== '') {
    table += String.raw`
\setlength{\tabcolsep}{\oldtabcolsep}`;
  }
  return table;
}

function dip(meter) {
  return 60 * 0.0293 * Math.sqrt(meter);
}

function dipTable() {
  let table = String.raw`\noindent
\begin{tabular}[t]{|c c c|}
\multicolumn{3}{c}{\textbf{DIP}}\\
\hline
\textit{m} & \textit{dip} & \textit{ft}\\
\hline
`;

  for (let meter = 1; meter < 25.5; meter += 0.5) {
    table += `${fixed1(meter)} & ${fixed1(dip(meter))} & ${fixed1(meter / 0.3084)}${ROW_END}`;
  }

  table += String.raw`\hline
\end{tabular}
`;
  return table;
}

function refraction(height) {
  return 1 / Math.tan((height + 7.31 / (height + 4.4)) / 180 * PI);
}

function refractionTable() {
  let table = String.raw`
\noindent
\begin{tabular}[t]{|c c|}
\multicolumn{2}{c}{\textbf{Refract.}}\\
\hline
\textit{$H_{a}$} & \textit{ref}\\
\hline
`;

  for (let ho = 5; ho < 20; ho += 0.5) table += `${fixed1(ho)}$^\\circ$ & ${fixed1(refraction(ho))}${ROW_END}`;
  for (let ho = 20; ho < 40; ho += 1) table += `${fixed1(ho)}$^\\circ$ & ${fixed1(refraction(ho))}${ROW_END}`;
  for (let ho = 40; ho < 90; ho += 5) table += `${fixed1(ho)}$^\\circ$ & ${fixed1(refraction(ho))}${ROW_END}`;

  table += String.raw`\hline
\end{tabular}
`;
  return table;
}

function parallax(horizontalParallax, degrees, minutes) {
  return rad(0, horizontalParallax) * Math.cos(rad(degrees, minutes)) * 180 / PI * 60;
}

function parallaxTable() {
  const HP = 54.0;
  let table = String.raw`\noindent
\begin{tabular}[t]{|c|rrrrrrrrrrrrrrrrrr|}
\multicolumn{19}{c}{\textbf{Parallax of the Moon}}\\
\hline
`;

  let header = String.raw`\textbf{$H_{a}$} `;
  for (let d = 0; d < 90; d += 5) {
    header += String.raw`& \multicolumn{1}{>{\hspace{-4pt}}c<{\hspace{-4pt}}|}{\textbf{${d}-${d + 5}$^\circ$}}`;
  }
  table += `${header} ${ROW_END}\\hline`;

  for (let hDeg = 0; hDeg < 5; hDeg += 1) {
    let degreeLine = String.raw` $'$ `;
    for (let dd = hDeg; dd < 90; dd += 5) {
      degreeLine += String.raw`& \multicolumn{1}{l}{\textbf{${dd}$^\circ$}}`;
    }
    table += `${degreeLine}\\vline ${ROW_END}`;

    for (let hMin = 0; hMin < 60; hMin += 10) {
      let line = String.raw`\textbf{${hMin}} `;
      for (let dd = hDeg; dd < 90; dd += 5) {
        line += ` & ${fixed1(parallax(HP, dd, hMin))} `;
      }
      table += `${line}${ROW_END}`;
    }
  }

  table += String.raw`\hline
\multicolumn{1}{|c|}{\textbf{HP}} & \multicolumn{18}{c|}{correction for HP per column}\\
\hline
`;

  for (let hp = 54.3; hp < 61.5; hp += 0.3) {
    let line = String.raw`\textbf{ ${fixed1(hp)}} `;
    for (let d = 2; d < 90; d += 5) {
      line += `& ${fixed1(parallax(hp, d, 30) - parallax(54, d, 30))} `;
    }
    table += `${line}${ROW_END}`;
  }

  table += String.raw`\hline
\end{tabular}
`;
  return table;
}

function venusMarsParallaxTable() {
  let table = String.raw`\noindent
\begin{tabular}[t]{|c|cccccc|}
\multicolumn{7}{c}{\textbf{Parallax of Venus and Mars}}\\
\hline
$H_{a}$ HP & \textbf{.1$'$} & \textbf{.2$'$} & \textbf{.3$'$} & \textbf{.4$'$} & \textbf{.5$'$} & \textbf{.6$'$} \\
\hline
`;

  for (let hDeg = 10; hDeg < 90; hDeg += 10) {
    let line = String.raw`\textbf{ ${hDeg}$^\circ$} `;
    for (let hp = 0.1; hp < 0.7; hp += 0.1) {
      line += `& ${fixed1(parallax(hp, hDeg, 0))} `;
    }
    table += `${line}${ROW_END}`;
  }

  table += String.raw`\hline
\end{tabular}
`;
  return table;
}

function aboutTables() {
  return String.raw`\section*{About these tables}
The preceding static tables are independent from the year. They differ from the tables found in the official paper versions of the Nautical almanac in two important considerations.
\begin{itemize}
  \item My tables are not arranged as \textit{critical} tables. So chose the value that fits best to your value and interpolate in the rare cases where this should be necessary.
  \item My tables do not combine multiple corrections as some tables in the paper Nautical Almanac do. Each correction has to be applied separately.
\end{itemize}
All tables that are specific for a year are contained in the Nautical Almanac daily pages for the corresponding year.
\subsubsection*{Increments}
The large increment table is is nothing but a linear interpolation between the tabulated values in the daily pages of the Nautical almanac. This table is basically identical with the official one.
\subsubsection*{DIP}
The DIP table corrects for height of eye over the surface. This value has to be subtracted from the sextant altitude ($H_s$). The correction in degrees for height of eye in meters is given by the following formula:
\[d=0.0293\sqrt{m}\]
This is the first correction (apart from index error) that has to be applied to the measured altitude.
\subsubsection*{Refraction}
The next correction is for refraction in the earth's atmosphere. As usual this table is correct for 10$^\circ$C and a pressure of 1010 hPa. This correction has to be applied to apparent altitude ($H_a$). The exact values can be calculated by the following formula.
\[R_0=\cot \left( H_a + \frac{7.31}{H_a+4.4}\right)\]
For other than standard conditions, calculate a correction factor for $R_0$ by: \[f=\frac{0.28P}{T+273}\] where $P$ is the pressure in hectopascal and $T$ is the temperature in $^\circ$C. No table is given for this correction so far.
\subsubsection*{Parallax}
For moon sight (and if necessary for Mars and Venus) a parallax correction is necessary. For Mars and Venus the horizontal parallax ($HP$) is never more than 0.5' and can be omitted if this kind of precision is not necessary. The parallax ($P$) can be calculated from horizontal parallax ($HP$) and apparent altitude $H_a$ with the following formula:
\[P={HP} \times \cos(H_a)\]
The table for the moon gives the parallax for a horizontal parallax of 54' which is the lowest value for the moon. For all other values, the value in the lower half of the table has to be added. Note that this table is only for parallax and does not correct for refraction and semidiameter. For all moon and sun sights, semidiameter has to be added for lower limb sights and subtracted for upper limb sights. The value for HP and semidiameter is tabulated in the daily pages. The smaller parallax table is for parallax of Venus and Mars.
\subsubsection*{Altitude correction}
To correct your sextant altitude $H_s$ do the following:
Calculate $H_a$ by
\[H_a= H_s+I-d\]
Where $I$ is the sextant's index error and $d$ is DIP. Then calculate the observed altitude $H_o$ by
\[H_o= H_a-R+P\pm SD\]
where $R$ is refraction, $P$ is parallax and $SD$ is the semidiameter.
\subsubsection*{Sight reduction}
Sight reduction tables can be downloaded from the US government's internet pages. Search for HO-229 or HO-249. These values can also be calculated with two, relatively simple, formulas:
\[ \sin H_c= \sin L \sin d + \cos L \cos d \cos LHA\]
and
\[\cos A = \frac{\sin d - \sin L \sin H_c}{\cos L \cos H_c}\]
where $A$ is the azimuth angle, $L$ is the latitude, $d$ is the declination and $LHA$ is the local hour angle. The azimuth ($Z_n$) is given by the following rule:
\begin{itemize}
  \item if the $LHA$ is greater than $180^\circ$,\quad$Z_n=A$
  \item if the $LHA$ is less than $180^\circ$,\quad$Z_n = 360^\circ - A$
\end{itemize}`;
}

function roundHalfEven(value, digits = 0) {
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

function fixed1(value) {
  return roundHalfEven(value, 1).toFixed(1);
}

function formatFixed(value, digits, width) {
  const text = roundHalfEven(value, digits).toFixed(digits);
  return text.padStart(width, '0');
}
