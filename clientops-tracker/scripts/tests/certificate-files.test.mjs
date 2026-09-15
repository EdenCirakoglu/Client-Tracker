import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { replaceCertificateFile } from '../lib/certificate-files.mjs';

test('certificate replacement changes file identity even when source timestamps match', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clientops-cert-'));
  try {
    const source = join(directory, 'new.pem');
    const target = join(directory, 'current.pem');
    writeFileSync(source, 'new fixture content');
    writeFileSync(target, 'old fixture content');
    const time = new Date('2026-01-01T00:00:00Z');
    utimesSync(source, time, time);
    utimesSync(target, time, time);
    const original = statSync(target);
    replaceCertificateFile(source, target, 0o600);
    assert.equal(readFileSync(target, 'utf8'), 'new fixture content');
    assert.notEqual(statSync(target).ino, original.ino);
    if (process.platform !== 'win32') assert.equal(statSync(target).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(directory).sort(), ['current.pem', 'new.pem']);
    assert.throws(() => replaceCertificateFile(join(directory, 'missing.pem'), target, 0o600));
    assert.equal(readFileSync(target, 'utf8'), 'new fixture content');
    assert.deepEqual(readdirSync(directory).sort(), ['current.pem', 'new.pem']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
