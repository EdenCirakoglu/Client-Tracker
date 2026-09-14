import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'test-results/browser-results.json';
const text = readFileSync(file, 'utf8');
const report = JSON.parse(text);
if (report.config.metadata.gitCommit || report.config.metadata.gitDiff) {
  throw new Error('Browser report includes automatic Git identity/diff metadata. Do not upload.');
}
if (process.env.CI && /[A-Z]:[\\/]Users[\\/]/i.test(text)) {
  throw new Error('Browser report includes a personal Windows path. Do not upload.');
}
if (!/^[a-f0-9]{40}$/.test(report.config.metadata.revision)) {
  throw new Error('Browser evidence must retain the explicit tested revision.');
}
console.log(
  'Browser evidence retains revision provenance without automatic Git identity metadata.',
);
