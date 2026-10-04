import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function* textValues(value) {
  if (typeof value === 'string') yield value;
  else if (value && typeof value === 'object')
    for (const child of Object.values(value)) yield* textValues(child);
}

export function validateBrowserEvidence(text, revision, ci = false) {
  const report = JSON.parse(text);
  const decodedText = [...textValues(report)].join('\n');
  if (!report.config?.metadata || !report.stats || !Array.isArray(report.suites)) {
    throw new Error('Missing browser report metadata, statistics or suites.');
  }
  if (report.config.metadata.gitCommit || report.config.metadata.gitDiff) {
    throw new Error('Browser report includes automatic Git identity/diff metadata. Do not upload.');
  }
  if (ci && /[A-Z]:[\\/]Users[\\/]/i.test(decodedText)) {
    throw new Error('Browser report includes a personal Windows path. Do not upload.');
  }
  if (
    !/^[a-f0-9]{40}$/.test(report.config.metadata.revision) ||
    report.config.metadata.revision !== revision
  ) {
    throw new Error('Browser evidence must retain the explicit tested revision.');
  }
  if (ci && report.config.metadata.workingTreeDirty !== false) {
    throw new Error('Hosted browser evidence must come from a clean checkout.');
  }
  if (!(report.stats.expected + report.stats.unexpected > 0) || report.suites.length === 0) {
    throw new Error('No executed browser scenarios in report.');
  }
  if (/clientops\.sid=s(?:%3A|:)|#token=[a-f0-9]{64}/i.test(decodedText)) {
    throw new Error(
      'Browser evidence includes a session cookie or account-link token. Do not upload.',
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? 'test-results/browser-results.json';
  // Missing or malformed reports fail closed; never authorize uploads without evidence.
  validateBrowserEvidence(
    readFileSync(file, 'utf8'),
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    !!process.env.CI,
  );
  console.log('Browser evidence retains the tested revision without private authentication data.');
}
