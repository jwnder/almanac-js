# alamanac-js

Node.js conversion of the Pyalmanac app. It generates Nautical Almanac daily pages, Sun tables, Event Time tables, and static Increments/Corrections PDFs without running Python.

## Requirements

- Windows PowerShell or a compatible terminal
- Node.js 20 or newer
- MiKTeX with `pdflatex` available on `PATH`

## Windows Install

Install Node.js LTS and MiKTeX with `winget`:

```powershell
winget install OpenJS.NodeJS.LTS
winget install MiKTeX.MiKTeX
```

Close and reopen PowerShell after installing so `node`, `npm`, and `pdflatex` are visible on `PATH`.

Verify the tools:

```powershell
node --version
npm --version
pdflatex --version
```

Install the project dependencies:

```powershell
cd D:\tmp5\alamanac-js
npm install
```

MiKTeX may install missing LaTeX packages during the first PDF build. If it prints `So far, you have not checked for MiKTeX updates`, open **MiKTeX Console** from the Start menu and run updates. The warning usually does not block PDF generation, but updating MiKTeX prevents package/font installation problems.

## Run

Interactive mode:

```powershell
npm start
```

Quick mode examples:

```powershell
node src\cli.js nautical --date 2026 --style modern --paper A4 --output-dir output
node src\cli.js nautical --date 01012026 --days 3 --style modern --paper A4 --output-dir output --keep-tex --keep-log
node src\cli.js sun --date 01012026 --days 1 --output-dir output
node src\cli.js events --date 01012026 --days 1 --output-dir output
node src\cli.js increments --paper A4 --output-dir output
```

Generated PDFs are written to `output\` by default. Use `--keep-tex` to preserve the generated `.tex` file, `--keep-log` to preserve the LaTeX `.log`, and `--verbose` to show `pdflatex` output while compiling. `--data-pages-only` is accepted for compatibility with Pyalmanac-style runs where front matter can be skipped.

## Date Inputs

The interactive prompt accepts:

- `DDMMYYYY` for a specific date, for example `01012026`
- `YYYY` for a full year, for example `2026`
- `YYYY-YYYY` for a year range
- `MM` or `-MM` for month-oriented input supported by the CLI
- blank for today

## Validate

Run the syntax check and test suite:

```powershell
npm run check
npm test
```

## Troubleshooting

If `pdflatex` is not recognized, reopen PowerShell. If it still fails, confirm MiKTeX is installed and add its `miktex\bin\x64` directory to `PATH`.

If PDF generation fails, rerun with `--keep-tex --keep-log`, then inspect the generated `.log` file in `output\`. LaTeX errors are usually reported with a line number like `l.123`.

If MiKTeX asks to install packages, allow it. The generated TeX uses common packages such as `geometry`, `xcolor`, `booktabs`, `array`, and `multirow`.

## Conversion Status

The app itself is JavaScript-only. The current conversion includes ephemeris calculations through `astronomy-engine`, interactive Inquirer prompts, TeX generation, and PDF compilation through MiKTeX. Nautical Almanac output now includes the richer Pyalmanac-style details such as 59 navigational stars, modern color bands, moon event highlighting, planet SHA/meridian data, and Venus/Mars horizontal parallax.