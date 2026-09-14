import { setTimeout as delay } from 'node:timers/promises';

const transientCodes = new Set([
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
]);
const transientStatuses = new Set([502, 503, 504]);
class MailboxResponseError extends Error {}

// Only read-only mailbox requests are retried; API mutations and outage assertions stay strict.
export async function readMailboxJson(
  url,
  { timeoutMs = 10000, attemptTimeoutMs = 2000, retryDelayMs = 250 } = {},
) {
  const deadline = performance.now() + timeoutMs;
  let attempts = 0;
  while (performance.now() < deadline) {
    const signal = AbortSignal.timeout(
      Math.max(1, Math.ceil(Math.min(attemptTimeoutMs, deadline - performance.now()))),
    );
    attempts++;
    try {
      const response = await fetch(url, { signal });
      if (response.ok) return await response.json();
      await response.body?.cancel();
      if (!transientStatuses.has(response.status)) {
        throw new MailboxResponseError(`Mailbox returned HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof MailboxResponseError) throw error;
      if (error instanceof SyntaxError) throw new Error('Mailbox returned invalid JSON');
      if (!signal.aborted && !transientCodes.has(error.cause?.code ?? error.code)) {
        throw new Error('Mailbox read failed with a non-retryable transport error');
      }
    }
    const remaining = deadline - performance.now();
    if (remaining > 0) await delay(Math.min(retryDelayMs, remaining));
  }
  // Do not include URLs, raw transport errors or response bodies containing account tokens.
  throw new Error(`Mailbox unavailable after ${attempts} read attempts within ${timeoutMs}ms`);
}
