# alamanac-js

Node.js conversion of the Pyalmanac app. The conversion currently generates Nautical Almanac daily pages, Sun tables, Event Time tables, and static Increments/Corrections PDFs.

## Requirements

- Node.js 20 or newer
- MiKTeX or another TeX distribution with `pdflatex`

## Install

```powershell
npm install
```

## Run

Interactive mode:

```powershell
npm start
```

Quick mode examples:

```powershell
node src/cli.js nautical --date 01012026 --days 1 --style traditional --paper A4 --output-dir output
node src/cli.js sun --date 01012026 --days 1 --output-dir output
node src/cli.js events --date 01012026 --days 1 --output-dir output
node src/cli.js increments --paper A4 --output-dir output
```

Generated PDFs are written to `output/` by default. Use `--keep-tex` if you want to preserve the generated TeX file beside the PDF.

## Validate

```powershell
npm run check
npm test
```

## Conversion Status

This is a functional conversion in progress, not yet a byte-for-byte clone of Pyalmanac. The remaining work is table layout parity, CLI completion, and PDF regression checks. The app itself is JavaScript-only.

