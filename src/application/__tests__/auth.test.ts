import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEmail, validateCredentials } from '../auth.ts';

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
