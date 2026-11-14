import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError } from '../../application/ports/IAuthService.ts';
import type { AuthErrorCode, IAuthService } from '../../application/ports/IAuthService.ts';
import { normalizeEmail, parseRecoveryUrl, RESET_REDIRECT } from '../../application/auth.ts';

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
  } else if (code === 'same_password' || text.includes('different from the old')) {
    mapped = 'SAME_PASSWORD';
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

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: RESET_REDIRECT,
      });
      if (error) throw toAuthError(error);
    },

    async completeRecovery(url) {
      const link = parseRecoveryUrl(url);
      if (!link || link.kind === 'error') throw new AuthError('RECOVERY_LINK_INVALID');
      const { error } =
        link.kind === 'tokens'
          ? await client.auth.setSession({
              access_token: link.accessToken,
              refresh_token: link.refreshToken,
            })
          : await client.auth.exchangeCodeForSession(link.code);
      if (error) throw new AuthError('RECOVERY_LINK_INVALID', error.message);
    },

    async updatePassword(newPassword) {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw toAuthError(error);
    },

    async deleteAccount() {
      const res = await client.functions.invoke('delete-account', { body: {} });
      if (res.error) throw toAuthError({ message: String(res.error.message ?? res.error) });
      // The user no longer exists server side; drop the local session without a network call.
      await client.auth.signOut({ scope: 'local' });
    },

    async currentEmail() {
      const { data } = await client.auth.getSession();
      return data.session?.user.email ?? null;
    },
  };
}
