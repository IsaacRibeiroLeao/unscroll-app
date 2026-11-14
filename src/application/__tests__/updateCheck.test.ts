import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, decideUpdate, parseVersionInfo } from '../updateCheck.ts';

test('compareVersions orders numerically, not lexically', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(compareVersions('0.1.0', '0.2.0'), -1);
});

test('parseVersionInfo accepts only a well-formed file', () => {
  assert.deepEqual(parseVersionInfo({ version: '0.2.0', minSupported: '0.1.0', notes: 'x' }), {
    version: '0.2.0',
    minSupported: '0.1.0',
    notes: 'x',
  });
  assert.equal(parseVersionInfo({ version: 'latest', minSupported: '0.1.0' }), null);
  assert.equal(parseVersionInfo({ version: '1.0.0' }), null);
  assert.equal(parseVersionInfo(null), null);
  assert.equal(parseVersionInfo('x'), null);
  assert.equal(parseVersionInfo({ version: '1.0.0', minSupported: '1.0.0' })?.notes, '');
});

test('decideUpdate', () => {
  const info = { version: '0.3.0', minSupported: '0.2.0', notes: '' };
  assert.equal(decideUpdate('0.3.0', info), 'none');
  assert.equal(decideUpdate('0.4.0', info), 'none');
  assert.equal(decideUpdate('0.2.5', info), 'optional');
  assert.equal(decideUpdate('0.1.0', info), 'required');
});
