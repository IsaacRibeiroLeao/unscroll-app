import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError } from '../../../application/ports/IAuthService.ts';
import { createAuthService, toAuthError } from '../authService.ts';

type AuthResult = { data?: unknown; error?: Record<string, unknown> | null };

function client(
  auth: Record<string, (...a: unknown[]) => Promise<AuthResult>>,
  calls: unknown[][] = [],
) {
  const wrapped = Object.fromEntries(
    Object.entries(auth).map(([k, fn]) => [
      k,
      async (...args: unknown[]) => {
        calls.push([k, ...args]);
        return fn(...args);
      },
    ]),
  );
  return { auth: wrapped } as unknown as SupabaseClient;
}

test('toAuthError maps codes and messages', () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ code: 'invalid_credentials' }, 'INVALID_CREDENTIALS'],
    [{ message: 'Invalid login credentials' }, 'INVALID_CREDENTIALS'],
    [{ code: 'user_already_exists' }, 'EMAIL_TAKEN'],
    [{ code: 'weak_password' }, 'WEAK_PASSWORD'],
    [{ code: 'email_address_invalid' }, 'EMAIL_INVALID'],
    [{ code: 'email_not_confirmed' }, 'EMAIL_NOT_CONFIRMED'],
    [{ code: 'over_email_send_rate_limit' }, 'RATE_LIMITED'],
    [{ status: 429 }, 'RATE_LIMITED'],
    [{ code: 'signup_disabled' }, 'SIGNUP_DISABLED'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'NETWORK'],
    [{ message: 'boom' }, 'UNKNOWN'],
  ];
  for (const [input, code] of cases)
    assert.equal(toAuthError(input).code, code, JSON.stringify(input));
});

test('signIn normalizes the email and surfaces errors', async () => {
  const calls: unknown[][] = [];
  const ok = createAuthService(
    client({ signInWithPassword: async () => ({ error: null }) }, calls),
  );
  await ok.signIn('  Ana@Mail.COM ', 'segredo123');
  assert.deepEqual(calls[0], [
    'signInWithPassword',
    { email: 'ana@mail.com', password: 'segredo123' },
  ]);
  const bad = createAuthService(
    client({ signInWithPassword: async () => ({ error: { code: 'invalid_credentials' } }) }),
  );
  await assert.rejects(
    bad.signIn('a@b.co', 'x'),
    (e: unknown) => e instanceof AuthError && e.code === 'INVALID_CREDENTIALS',
  );
});

test('signUp distinguishes session, email confirmation and duplicates', async () => {
  const withSession = createAuthService(
    client({
      signUp: async () => ({ data: { user: { identities: [{}] }, session: {} }, error: null }),
    }),
  );
  assert.equal(await withSession.signUp('a@b.co', '12345678'), 'signedIn');

  const needsConfirm = createAuthService(
    client({
      signUp: async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }),
    }),
  );
  assert.equal(await needsConfirm.signUp('a@b.co', '12345678'), 'confirmEmail');

  const duplicate = createAuthService(
    client({
      signUp: async () => ({ data: { user: { identities: [] }, session: null }, error: null }),
    }),
  );
  await assert.rejects(
    duplicate.signUp('a@b.co', '12345678'),
    (e: unknown) => e instanceof AuthError && e.code === 'EMAIL_TAKEN',
  );

  const failing = createAuthService(
    client({ signUp: async () => ({ data: { user: null }, error: { code: 'weak_password' } }) }),
  );
  await assert.rejects(
    failing.signUp('a@b.co', '1'),
    (e: unknown) => e instanceof AuthError && e.code === 'WEAK_PASSWORD',
  );
});

test('signOut and currentEmail', async () => {
  const svc = createAuthService(
    client({
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: { user: { email: 'a@b.co' } } } }),
    }),
  );
  await svc.signOut();
  assert.equal(await svc.currentEmail(), 'a@b.co');
  const out = createAuthService(client({ getSession: async () => ({ data: { session: null } }) }));
  assert.equal(await out.currentEmail(), null);
  const failing = createAuthService(client({ signOut: async () => ({ error: { message: 'x' } }) }));
  await assert.rejects(failing.signOut(), AuthError);
});

test('password reset: request, complete from link, update', async () => {
  const calls: unknown[][] = [];
  const svc = createAuthService(
    client(
      {
        resetPasswordForEmail: async () => ({ error: null }),
        setSession: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ error: null }),
        updateUser: async () => ({ error: null }),
      },
      calls,
    ),
  );
  await svc.requestPasswordReset(' Ana@Mail.com ');
  assert.deepEqual(calls[0], [
    'resetPasswordForEmail',
    'ana@mail.com',
    { redirectTo: 'unscroll://reset' },
  ]);
  await svc.completeRecovery('unscroll://reset#access_token=A&refresh_token=B');
  assert.deepEqual(calls[1], ['setSession', { access_token: 'A', refresh_token: 'B' }]);
  await svc.completeRecovery('unscroll://reset?code=zzz');
  assert.deepEqual(calls[2], ['exchangeCodeForSession', 'zzz']);
  await svc.updatePassword('novaSenha123');
  assert.deepEqual(calls[3], ['updateUser', { password: 'novaSenha123' }]);

  for (const bad of ['unscroll://reset#error=access_denied', 'https://x/y', 'unscroll://reset']) {
    await assert.rejects(
      svc.completeRecovery(bad),
      (e: unknown) => e instanceof AuthError && e.code === 'RECOVERY_LINK_INVALID',
    );
  }
  const expired = createAuthService(
    client({ setSession: async () => ({ error: { message: 'expired' } }) }),
  );
  await assert.rejects(
    expired.completeRecovery('unscroll://reset#access_token=A&refresh_token=B'),
    (e: unknown) => e instanceof AuthError && e.code === 'RECOVERY_LINK_INVALID',
  );
  const same = createAuthService(
    client({ updateUser: async () => ({ error: { code: 'same_password' } }) }),
  );
  await assert.rejects(
    same.updatePassword('x'),
    (e: unknown) => e instanceof AuthError && e.code === 'SAME_PASSWORD',
  );
});
