export function makePlaceholderTex(config) {
  return String.raw`\documentclass[10pt, ${paperOption(config.paperSize)}]{report}
\usepackage[utf8]{inputenc}
\begin{document}
\section*{Pyalmanac Node Conversion Scaffold}
\begin{tabular}{ll}
Output type & ${escapeLatex(config.outputType)}\\
Mode & ${escapeLatex(config.mode)}\\
Paper size & ${escapeLatex(config.paperSize)}\\
Table style & ${escapeLatex(config.tableStyle)}\\
Start date & ${config.startDate.toISOString().slice(0, 10)}\\
Days & ${config.dayCount}\\
\end{tabular}

\bigskip
This file confirms the Inquirer workflow and output naming. The astronomical
remaining renderer-specific layout work should be ported next.
\end{document}
`;
}

function paperOption(paperSize) {
  return paperSize === 'Letter' ? 'letterpaper' : 'a4paper';
}

function escapeLatex(value) {
  return String(value).replace(/[\\%$#_{}&]/g, match => `\\${match}`);
}

