import { stripVTControlCharacters } from 'node:util';

export function historyMounts(root, commonDir) {
  return [
    '-v',
    `${root}:/repo:ro`,
    '-v',
    `${commonDir}:/git-common:ro`,
    '-e',
    'GIT_DIR=/git-common',
    '-e',
    'GIT_WORK_TREE=/repo',
  ];
}

export function assertHistoryScan(status, output) {
  const text = stripVTControlCharacters(output);
  if (
    status !== 0 ||
    /\bERR\b|\b0 commits scanned\./.test(text) ||
    !/\b[1-9]\d* commits scanned\./.test(text)
  ) {
    throw new Error('Secret scan did not complete a successful non-empty history scan.');
  }
}
