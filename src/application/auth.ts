export const PASSWORD_MIN_LENGTH = 8;

export type CredentialIssue = 'EMAIL_INVALID' | 'PASSWORD_SHORT';

/** Pragmatic shape check; the server remains the authority on what is a deliverable address. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** First problem with the typed credentials, or null when they can be submitted. */
export function validateCredentials(email: string, password: string): CredentialIssue | null {
  if (!EMAIL_SHAPE.test(normalizeEmail(email))) return 'EMAIL_INVALID';
  if (password.length < PASSWORD_MIN_LENGTH) return 'PASSWORD_SHORT';
  return null;
}

export function validatePassword(password: string): 'PASSWORD_SHORT' | null {
  return password.length < PASSWORD_MIN_LENGTH ? 'PASSWORD_SHORT' : null;
}

export const RESET_REDIRECT = 'unscroll://reset';

export type RecoveryLink =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error' };

function readParams(part: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const key = decodeURIComponent(i === -1 ? pair : pair.slice(0, i));
    const value = i === -1 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    out[key] = value;
  }
  return out;
}

/**
 * Parses the deep link Supabase redirects to after the user taps the reset email: tokens in the
 * fragment (implicit flow), a `code` in the query (PKCE) or an error. Null when it is not a reset link.
 */
export function parseRecoveryUrl(url: string): RecoveryLink | null {
  if (!url.startsWith(RESET_REDIRECT)) return null;
  const rest = url.slice(RESET_REDIRECT.length);
  if (rest && !/^[/?#]/.test(rest)) return null;
  const hashAt = rest.indexOf('#');
  const queryAt = rest.indexOf('?');
  const fragment = hashAt === -1 ? '' : rest.slice(hashAt + 1);
  const query =
    queryAt === -1
      ? ''
      : rest.slice(queryAt + 1, hashAt !== -1 && hashAt > queryAt ? hashAt : undefined);
  const params = { ...readParams(query), ...readParams(fragment) };
  if (params['error'] || params['error_code']) return { kind: 'error' };
  const access = params['access_token'];
  const refresh = params['refresh_token'];
  if (access && refresh) return { kind: 'tokens', accessToken: access, refreshToken: refresh };
  if (params['code']) return { kind: 'code', code: params['code'] };
  return { kind: 'error' };
}
