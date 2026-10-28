const protectedRoute =
  /^\/(?:dashboard|clients|projects|delivery|tickets|releases|summaries|users|account)(?:\/[a-zA-Z0-9-]+)*\/?$/;

/** Navigation only: destinations never authorize access to a record or decision. */
export function safeReturnDestination(value: string | null): string | null {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//'))
    return null;
  try {
    const decoded = decodeURIComponent(value);
    if (
      /[\\\s]/.test(value) ||
      decoded.includes('\\') ||
      [...decoded].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    )
      return null;
    const url = new URL(value, 'https://clientops.invalid');
    if (url.origin !== 'https://clientops.invalid' || !protectedRoute.test(url.pathname))
      return null;
    // Reject normalized paths rather than permitting dot-segment redirects to another route.
    if (value.split(/[?#]/, 1)[0] !== url.pathname) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginDestination(value: string): string {
  const destination = safeReturnDestination(value);
  return destination ? `/login?${new URLSearchParams({ next: destination })}` : '/login';
}

export function destinationAfterLogin(search: string): string {
  const values = new URLSearchParams(search).getAll('next');
  return (values.length === 1 && safeReturnDestination(values[0] ?? null)) || '/dashboard';
}
