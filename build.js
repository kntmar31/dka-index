// Build script: injects the GAS_API_URL secret (passed in as an env var by
// the GitHub Actions workflow) into index.html at deploy time, replacing the
// __GAS_API_URL__ placeholder. Outputs the result to dist/index.html.
//
// Usage (in CI):
//   GAS_API_URL=... node build.js
//
// Note: this keeps the literal URL out of the committed source, but the
// deployed page's JS will still contain it in plain text (any static site
// visitor's browser needs the real URL to call it). See PR description for
// details on this limitation.

const fs = require('fs');
const path = require('path');

const gasApiUrl = process.env.GAS_API_URL;

if (!gasApiUrl) {
  console.error('Error: GAS_API_URL environment variable is not set.');
  process.exit(1);
}

const srcPath = path.join(__dirname, 'index.html');
const outDir = path.join(__dirname, 'dist');
const outPath = path.join(outDir, 'index.html');

const src = fs.readFileSync(srcPath, 'utf8');

if (!src.includes('__GAS_API_URL__')) {
  console.error('Error: placeholder __GAS_API_URL__ not found in index.html.');
  process.exit(1);
}

const output = src.split('__GAS_API_URL__').join(gasApiUrl);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');

console.log('Built dist/index.html with GAS_API_URL injected.');
