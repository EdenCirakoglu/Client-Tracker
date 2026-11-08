import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeReturnDestination,
  loginDestination,
  destinationAfterLogin,
} from '../../apps/web/src/lib/return-destination.ts';

test('preserves internal query parameters and record anchors through login', () => {
  for (const path of [
    '/tickets/123?from=delivery#scope',
    '/tickets/123#delivery',
    '/summaries/123',
    '/tickets?status=OPEN&search=one%20two',
  ]) {
    assert.equal(safeReturnDestination(path), path);
    assert.equal(
      destinationAfterLogin(new URL(loginDestination(path), 'https://fixture.example').search),
      path,
    );
  }
});

test('rejects external, malformed, encoded, protocol-relative and looping destinations', () => {
  for (const path of [
    'https://outside.example/',
    '//outside.example',
    '/\\outside.example',
    '/%2f%2foutside.example',
    '/tickets/%2e%2e/login',
    '/tickets/../login',
    '/tickets?x=%',
    '/tickets?x=%0a',
    '/tickets?x=%5c',
    '/login?next=/login',
    '/api/auth/logout',
    '/forgot-password',
    '/tickets\n',
    '/tickets/abc def',
    'javascript:alert(1)',
    '/dashboard' + '?x='.repeat(800),
  ]) {
    assert.equal(safeReturnDestination(path), null, path);
    assert.equal(destinationAfterLogin(`?next=${encodeURIComponent(path)}`), '/dashboard', path);
  }
  assert.equal(destinationAfterLogin(''), '/dashboard');
  assert.equal(destinationAfterLogin('?next=/tickets&next=/summaries'), '/dashboard');
});
