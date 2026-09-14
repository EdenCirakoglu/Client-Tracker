import type { RequestHandler } from 'express';

const actions: Record<string, string> = {
  '/api/auth/login': 'login',
  '/api/auth/logout': 'logout',
  '/api/auth/forgot-password': 'recovery_requested',
  '/api/auth/reset-password': 'password_reset',
  '/api/auth/change-password': 'password_change',
  '/api/auth/accept-invitation': 'invitation_acceptance',
  '/api/users/invitations': 'invitation_requested',
};

export const requestLog: RequestHandler = (req, res, next) => {
  const started = performance.now();
  const action =
    req.method === 'POST'
      ? actions[req.path]
      : req.method === 'PATCH' && /^\/api\/users\/[a-f0-9-]{36}$/.test(req.path)
        ? 'account_access_change'
        : undefined;
  res.once('finish', () => {
    // Never include URLs, query strings, headers, bodies, IPs or email addresses.
    console.log(
      JSON.stringify({
        event: action ? 'security_request' : 'http_request',
        ...(action ? { action } : {}),
        time: new Date().toISOString(),
        method: req.method,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
        ...(action && req.user ? { actorId: req.user.id } : {}),
      }),
    );
  });
  next();
};
