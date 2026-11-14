import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmail,
  parseRecoveryUrl,
  validateCredentials,
  validatePassword,
} from '../auth.ts';

test('validateCredentials checks email shape then password length', () => {
  assert.equal(validateCredentials('', 'segredo123'), 'EMAIL_INVALID');
  assert.equal(validateCredentials('sem-arroba', 'segredo123'), 'EMAIL_INVALID');
  assert.equal(validateCredentials('a@b', 'segredo123'), 'EMAIL_INVALID');
  assert.equal(validateCredentials('ana@mail.com', '1234567'), 'PASSWORD_SHORT');
  assert.equal(validateCredentials(' Ana@Mail.com ', '12345678'), null);
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Ana@Mail.COM '), 'ana@mail.com');
});

test('validatePassword', () => {
  assert.equal(validatePassword('1234567'), 'PASSWORD_SHORT');
  assert.equal(validatePassword('12345678'), null);
});

test('parseRecoveryUrl reads tokens, codes, errors and ignores other links', () => {
  assert.deepEqual(
    parseRecoveryUrl('unscroll://reset#access_token=AAA&refresh_token=BBB&type=recovery'),
    { kind: 'tokens', accessToken: 'AAA', refreshToken: 'BBB' },
  );
  assert.deepEqual(parseRecoveryUrl('unscroll://reset?code=abc123'), {
    kind: 'code',
    code: 'abc123',
  });
  assert.deepEqual(
    parseRecoveryUrl(
      'unscroll://reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
    ),
    { kind: 'error' },
  );
  assert.deepEqual(parseRecoveryUrl('unscroll://reset'), { kind: 'error' });
  assert.deepEqual(parseRecoveryUrl('unscroll://reset/?code=x'), { kind: 'code', code: 'x' });
  assert.equal(parseRecoveryUrl('unscroll://blocked'), null);
  assert.equal(parseRecoveryUrl('unscroll://resetx#access_token=a&refresh_token=b'), null);
  assert.equal(parseRecoveryUrl('https://evil.example/reset#access_token=a&refresh_token=b'), null);
});
