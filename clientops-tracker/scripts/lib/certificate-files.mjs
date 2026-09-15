import { randomUUID } from 'node:crypto';
import { chmodSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

export function replaceCertificateFile(source, destination, mode) {
  const temporary = `${destination}.${randomUUID()}.next`;
  try {
    writeFileSync(temporary, readFileSync(source), { mode: 0o600, flag: 'wx' });
    chmodSync(temporary, mode);
    // A new file identity prevents Nginx inheriting a stale SSL object on rapid reloads.
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
}
