// Build script: injects the GAS_API_URL secret into index.html at deploy time.
//
// Run via: GAS_API_URL=... node build.js
// Reads index.html (which contains the placeholder __GAS_API_URL__),
// substitutes the real URL from the environment variable, and writes
// the result to dist/index.html for GitHub Pages to serve.
//
// This keeps the real GAS Web App URL out of the committed source file.

const fs = require('fs');
const path = require('path');

const gasUrl = process.env.GAS_API_URL;

if (!gasUrl) {
  console.error('ERROR: GAS_API_URL environment variable is not set.');
  console.error('This should be provided via the GAS_API_URL repository secret in CI.');
  process.exit(1);
}

const srcPath = path.join(__dirname, 'index.html');
const outDir = path.join(__dirname, 'dist');
const outPath = path.join(outDir, 'index.html');

let content = fs.readFileSync(srcPath, 'utf8');

const placeholder = '__GAS_API_URL__';
if (!content.includes(placeholder)) {
  console.error(`ERROR: placeholder "${placeholder}" not found in index.html.`);
  process.exit(1);
}

content = content.split(placeholder).join(gasUrl);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');

console.log(`Built ${outPath} with GAS_API_URL injected.`);
