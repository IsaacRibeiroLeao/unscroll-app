import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError } from '../../application/ports/IAuthService.ts';
import type { AuthErrorCode, IAuthService } from '../../application/ports/IAuthService.ts';
import { normalizeEmail } from '../../application/auth.ts';

interface RawAuthError {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}

/** Maps a Supabase Auth error to a stable code (never exposes server text to the UI). */
export function toAuthError(error: RawAuthError): AuthError {
  const code = error.code ?? '';
  const text = (error.message ?? '').toLowerCase();
  let mapped: AuthErrorCode = 'UNKNOWN';
  if (code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    mapped = 'INVALID_CREDENTIALS';
  } else if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    text.includes('already registered')
  ) {
    mapped = 'EMAIL_TAKEN';
  } else if (code === 'weak_password' || text.includes('password should be')) {
    mapped = 'WEAK_PASSWORD';
  } else if (code === 'email_address_invalid' || code === 'validation_failed') {
    mapped = 'EMAIL_INVALID';
  } else if (code === 'email_not_confirmed' || text.includes('not confirmed')) {
    mapped = 'EMAIL_NOT_CONFIRMED';
  } else if (code.startsWith('over_') || error.status === 429) {
    mapped = 'RATE_LIMITED';
  } else if (code === 'signup_disabled') {
    mapped = 'SIGNUP_DISABLED';
  } else if (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    text.includes('network') ||
    text.includes('fetch')
  ) {
    mapped = 'NETWORK';
  }
  return new AuthError(mapped, error.message);
}

export function createAuthService(client: SupabaseClient): IAuthService {
  return {
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw toAuthError(error);
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw toAuthError(error);
      // With "Confirm email" on, an already-registered address returns a user with no identities
      // instead of an error (to avoid leaking which emails exist).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new AuthError('EMAIL_TAKEN');
      }
      return data.session ? 'signedIn' : 'confirmEmail';
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw toAuthError(error);
    },

    async currentEmail() {
      const { data } = await client.auth.getSession();
      return data.session?.user.email ?? null;
    },
  };
}
