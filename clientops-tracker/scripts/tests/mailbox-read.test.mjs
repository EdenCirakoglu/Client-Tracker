import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { readMailboxJson } from '../lib/mailbox-read.mjs';

async function endpoint(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

const limits = { timeoutMs: 1000, attemptTimeoutMs: 100, retryDelayMs: 10 };

test('recovers when the mailbox closes its first connection', async (t) => {
  let calls = 0;
  const url = await endpoint(t, (req, res) => {
    calls++;
    if (calls === 1) return req.socket.destroy();
    res.end(JSON.stringify({ messages: [] }));
  });
  assert.deepEqual(await readMailboxJson(url, limits), { messages: [] });
  assert(calls >= 2);
});

test('retries a temporary mailbox HTTP 503', async (t) => {
  let calls = 0;
  const url = await endpoint(t, (_req, res) => {
    res.statusCode = ++calls === 1 ? 503 : 200;
    res.end(JSON.stringify({ messages: [] }));
  });
  assert.deepEqual(await readMailboxJson(url, limits), { messages: [] });
  assert.equal(calls, 2);
});

test('retries when a JSON response body is interrupted', async (t) => {
  let calls = 0;
  const url = await endpoint(t, (req, res) => {
    if (++calls === 1) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.flushHeaders();
      res.write('{');
      return setTimeout(() => req.socket.destroy(), 10);
    }
    res.end(JSON.stringify({ messages: [] }));
  });
  assert.deepEqual(await readMailboxJson(url, limits), { messages: [] });
  assert(calls >= 2);
});

test('bounds a stalled response body and retries the read', { timeout: 5000 }, async (t) => {
  let calls = 0;
  const url = await endpoint(t, (_req, res) => {
    if (++calls === 1) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.flushHeaders();
      return res.write('{');
    }
    res.end(JSON.stringify({ messages: [] }));
  });
  assert.deepEqual(await readMailboxJson(url, limits), { messages: [] });
  assert(calls >= 2);
});

test('persistent socket failure fails within the deadline', { timeout: 5000 }, async (t) => {
  const url = await endpoint(t, (req) => req.socket.destroy());
  const started = performance.now();
  await assert.rejects(readMailboxJson(url, { ...limits, timeoutMs: 200 }), /Mailbox unavailable/);
  assert(performance.now() - started < 1500);
});

test(
  'an unresponsive server cannot hang verification indefinitely',
  { timeout: 5000 },
  async (t) => {
    const url = await endpoint(t, () => {});
    const started = performance.now();
    await assert.rejects(
      readMailboxJson(url, { ...limits, timeoutMs: 200 }),
      /Mailbox unavailable/,
    );
    assert(performance.now() - started < 1500);
  },
);

test('does not retry HTTP 401 or expose its response body', async (t) => {
  let calls = 0;
  const url = await endpoint(t, (_req, res) => {
    calls++;
    res.statusCode = 401;
    res.end('fictional-sensitive-body');
  });
  await assert.rejects(readMailboxJson(url, limits), (error) => {
    assert.match(error.message, /HTTP 401/);
    assert(!String(error).includes('fictional-sensitive-body'));
    return true;
  });
  assert.equal(calls, 1);
});

test('does not retry malformed JSON or log mailbox contents', async (t) => {
  let calls = 0;
  const url = await endpoint(t, (_req, res) => {
    calls++;
    res.end('fictional-sensitive-body');
  });
  await assert.rejects(readMailboxJson(url, limits), (error) => {
    assert.match(error.message, /invalid JSON/);
    assert(!String(error).includes('fictional-sensitive-body'));
    return true;
  });
  assert.equal(calls, 1);
});
