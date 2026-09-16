import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2] ?? 'test-results/browser-results.json';

// Check if the file exists; if e2e tests didn't run, skip validation
if (!existsSync(file)) {
  console.log('Browser test results file not found. E2E tests may not have run.');
  process.exit(0);
}

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
if (/clientops\.sid=s(?:%3A|:)|#token=[a-f0-9]{64}/i.test(text)) {
  throw new Error(
    'Browser evidence includes a session cookie or account-link token. Do not upload.',
  );
}
console.log(
  'Browser evidence retains revision provenance without automatic Git identity metadata.',
);
