import test from 'node:test';
import assert from 'node:assert/strict';
import { equationOfTime, formatNauticalDegrees, sunMoon, planetsGha } from '../src/ephemeris/index.js';
import { makeSunTablesTex } from '../src/sun-tables.js';

test('formats nautical degrees like Pyalmanac LaTeX output', () => {
  assert.equal(formatNauticalDegrees(179 + 10 / 60), '179$^\\circ$10.0');
  assert.equal(formatNauticalDegrees(-23 - 1 / 60, 2), '-23$^\\circ$01.0');
  assert.equal(formatNauticalDegrees(3 + 5.2 / 60, 3), '003$^\\circ$05.2');
});

test('calculates Sun/Moon almanac values for a fixed UTC date', () => {
  const values = sunMoon(new Date(Date.UTC(2026, 0, 1)));
  assert.equal(values.sunGha, '179$^\\circ$10.0');
  assert.equal(values.sunDec, '-23$^\\circ$01.0');
  assert.equal(values.moonGha, '36$^\\circ$44.4');
  assert.match(values.moonHp, /^60\.7'/);
});

test('calculates Aries and navigational planet rows', () => {
  const values = planetsGha(new Date(Date.UTC(2026, 0, 1)));
  assert.equal(values.aries, '100$^\\circ$39.7');
  assert.equal(values.planets.length, 4);
  assert.deepEqual(values.planets.map(row => row.body), ['Venus', 'Mars', 'Jupiter', 'Saturn']);
});


test('calculates equation of time and moon phase values in JavaScript', () => {
  const values = equationOfTime(new Date(Date.UTC(2026, 0, 1)));
  assert.equal(values.atMidnight, String.raw`\colorbox{lightgray!60}{03:20}`);
  assert.equal(values.atNoon, String.raw`\colorbox{lightgray!60}{03:34}`);
  assert.equal(values.sunTransit, '12:03:34');
  assert.equal(values.moonAge, 12);
  assert.equal(values.moonIllumination, 91);
});
test('renders Sun table rows with valid LaTeX row endings', () => {
  const tex = makeSunTablesTex({ paperSize: 'A4', tableStyle: 'traditional', mode: 'days', startDate: new Date(Date.UTC(2026, 0, 1)), dayCount: 1 });
  assert.match(tex, /0 & 179\$\^\\circ\$10\.0 & -23\$\^\\circ\$01\.0 \\\\/);
  assert.match(tex, /\\subsection\*\{01\.01\.2026\}/);
});

test('renders Sun table grouped pages and modern layout', () => {
  const tex = makeSunTablesTex({ paperSize: 'Letter', tableStyle: 'modern', mode: 'days', startDate: new Date(Date.UTC(2026, 0, 1)), dayCount: 5 });
  assert.match(tex, /\\documentclass\[9pt, letterpaper\]/);
  assert.match(tex, /\\section\*\{Modern Sun Tables\}/);
  assert.match(tex, /\\usepackage\{booktabs\}/);
  assert.match(tex, /\\subsection\*\{01\/01\/2026 - 01\/04\/2026/);
  assert.equal((tex.match(/\\newpage/g) ?? []).length, 1);
  assert.match(tex, /\\textcolor\{blue\}\{-23\$\^\\circ\$01\.0\}/);
});

test('calculates event times for a fixed UTC date and latitude', async () => {
  const { dailyEvents, meridianEvents } = await import('../src/ephemeris/index.js');
  const date = new Date(Date.UTC(2026, 0, 1));
  const events = dailyEvents(date, 40);
  assert.equal(events.sunrise, '07:21:51');
  assert.equal(events.sunset, '16:45:25');
  assert.equal(events.moonrise, '14:27:20');

  const meridian = meridianEvents(date);
  assert.equal(meridian.sun, '12:03:34');
  assert.equal(meridian.planetRows.length, 4);
});

test('renders Event Time table rows with valid LaTeX row endings', async () => {
  const { makeEventTablesTex } = await import('../src/event-tables.js');
  const tex = makeEventTablesTex({ paperSize: 'A4', mode: 'days', startDate: new Date(Date.UTC(2026, 0, 1)), dayCount: 2 });
  assert.match(tex, /\\textbf\{N\} 40\$\^\\circ\$ & 06:17:31 & 06:51:28 & 07:21:51/);
  assert.ok(tex.includes(String.raw`\AlwaysDown`));
  assert.ok(tex.includes('01 & \\colorbox{lightgray!60}{03:20} & \\colorbox{lightgray!60}{03:34} & 12:03:34'));
  assert.equal((tex.match(/\\newpage/g) ?? []).length, 0);
});

test('renders highlighted double moon events in Event Time tables', async () => {
  const { makeEventTablesTex } = await import('../src/event-tables.js');
  const tex = makeEventTablesTex({ paperSize: 'A4', mode: 'days', startDate: new Date(Date.UTC(2026, 4, 15)), dayCount: 1 });
  assert.ok(tex.includes(String.raw`\colorbox{khaki!45}{01:05:36}`));
  assert.ok(tex.includes(String.raw`\colorbox{khaki!45}{23:18:12}`));
});

test('renders Nautical Almanac rows with real Sun/Moon/planet data', async () => {
  const { makeNauticalAlmanacTex } = await import('../src/nautical-tables.js');
  const tex = makeNauticalAlmanacTex({ paperSize: 'A4', tableStyle: 'modern', mode: 'days', startDate: new Date(Date.UTC(2026, 0, 1)), dayCount: 1 });
  assert.ok(tex.includes(String.raw`\color{blue}{0} & 179$^\circ$10.0 & \textcolor{blue}{S}23$^\circ$01.0 && 36$^\circ$44.4`));
  assert.ok(tex.includes(String.raw`\color{blue}{0} & 100$^\circ$39.7 & 180$^\circ$36.3`));
  assert.match(tex, /Venus & 79\$\^\\circ\$56\.6 & 11:58:21/);
  assert.ok(tex.includes('Alpheratz'));
  assert.ok(tex.includes('Markab'));
  assert.ok(tex.includes(String.raw`\textbf{N} 40$^\circ$ & 06:17:41 & 06:51:36 & 07:21:58`));
  assert.ok(tex.includes(String.raw`\colorbox{lightgray!60}{03:34}`));
  assert.ok(tex.includes(String.raw`\newcommand{\AlwaysDown}`));
  assert.ok(tex.includes(String.raw`\AlwaysDown`));
});


test('renders Nautical Almanac grouped pages and style-specific layout', async () => {
  const { makeNauticalAlmanacTex } = await import('../src/nautical-tables.js');
  const tex = makeNauticalAlmanacTex({ paperSize: 'Letter', tableStyle: 'modern', mode: 'days', startDate: new Date(Date.UTC(2026, 0, 1)), dayCount: 3 });
  assert.match(tex, /\\documentclass\[10pt, letterpaper\]/);
  assert.match(tex, /\\section\*\{Modern Nautical Almanac\}/);
  assert.match(tex, /\\renewcommand\{\\familydefault\}\{\\sfdefault\}/);
  assert.equal((tex.match(/\\newpage/g) ?? []).length, 0);
  assert.match(tex, /2026 January 01 to Jan\. 03 \(Thu, Fri, Sat\)/);
  assert.ok(tex.includes(String.raw`\definecolor{LightCyan}`));
  assert.ok(tex.includes(String.raw`\rowcolor{LightCyan}`));
});
test('calculates navigational star SHA and Dec from the Pyalmanac catalog', async () => {
  const { NAVIGATIONAL_STARS, navigationalStars } = await import('../src/ephemeris/index.js');
  const rows = navigationalStars(new Date(Date.UTC(2026, 0, 1)));
  assert.equal(NAVIGATIONAL_STARS.length, 59);
  assert.equal(rows[0].name, 'Alpheratz');
  assert.equal(rows[0].sha, '357$^\\circ$33.9');
  assert.equal(rows.at(-1).name, 'Markab');
  assert.equal(rows.at(-1).dec, '15$^\\circ$20.7');
  const sirius = rows.find(row => row.name === 'Sirius');
  assert.equal(sirius.sha, '258$^\\circ$25.5');
  assert.equal(sirius.dec, '-16$^\\circ$45.1');
});









