import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const outputDirectory = join(process.cwd(), 'dist', 'assets');
const payloadPath = join(process.cwd(), 'dist', 'data-waster-payload.bin');
const expectedPayloadBytes = 5 * 1024 * 1024;
const limits = {
  javascriptChunkBytes: 700 * 1024,
  totalJavaScriptBytes: 3 * 1024 * 1024,
  totalCssBytes: 350 * 1024,
};

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

let files;
try {
  files = await collectFiles(outputDirectory);
} catch {
  console.error('Bundle check failed: dist/assets was not found. Run `npm run build` first.');
  process.exit(1);
}

const assets = await Promise.all(files.map(async (path) => ({ path, bytes: (await stat(path)).size })));
const javascript = assets.filter(({ path }) => path.endsWith('.js'));
const stylesheets = assets.filter(({ path }) => path.endsWith('.css'));
const totalJavaScript = javascript.reduce((sum, file) => sum + file.bytes, 0);
const totalCss = stylesheets.reduce((sum, file) => sum + file.bytes, 0);
const oversizedChunks = javascript.filter(({ bytes }) => bytes > limits.javascriptChunkBytes);
const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

console.log(`JavaScript: ${format(totalJavaScript)} across ${javascript.length} chunks (budget ${format(limits.totalJavaScriptBytes)})`);
console.log(`CSS: ${format(totalCss)} across ${stylesheets.length} files (budget ${format(limits.totalCssBytes)})`);
for (const file of javascript.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`  ${format(file.bytes)}  ${relative(process.cwd(), file.path)}`);
}

const failures = [];
try {
  const payload = await stat(payloadPath);
  if (payload.size !== expectedPayloadBytes) failures.push(`GitHub Pages payload must be exactly ${format(expectedPayloadBytes)} (found ${format(payload.size)})`);
} catch {
  failures.push('GitHub Pages payload is missing from dist/data-waster-payload.bin');
}
if (totalJavaScript > limits.totalJavaScriptBytes) failures.push('total JavaScript exceeds its budget');
if (totalCss > limits.totalCssBytes) failures.push('total CSS exceeds its budget');
if (oversizedChunks.length) failures.push(`${oversizedChunks.length} JavaScript chunk(s) exceed ${format(limits.javascriptChunkBytes)}`);
if (!javascript.length) failures.push('no JavaScript assets were found');

if (failures.length) {
  console.error(`Bundle budget failed: ${failures.join('; ')}.`);
  process.exit(1);
}
console.log('Bundle and GitHub Pages payload checks passed.');
