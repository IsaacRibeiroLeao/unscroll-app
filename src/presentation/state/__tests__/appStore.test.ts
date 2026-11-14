import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useAppStore } from '../appStore.ts';
import { fill } from '../../format.ts';

test('app store starts empty and updates each field', () => {
  const s = useAppStore.getState();
  assert.equal(s.userId, null);
  assert.equal(s.onboarded, null);
  assert.equal(s.lastProof, null);
  s.setUserId('u1');
  s.setOnboarded(true);
  const proof = {
    outcome: {
      approved: true,
      code: 'APPROVED' as const,
      confidence: 1,
      feedback: '',
      rewards: null,
    },
    blockerFailed: false,
  };
  s.setLastProof(proof);
  const next = useAppStore.getState();
  assert.equal(next.userId, 'u1');
  assert.equal(next.onboarded, true);
  assert.deepEqual(next.lastProof, proof);
  next.setLastProof(null);
  assert.equal(useAppStore.getState().lastProof, null);
});

test('fill replaces every placeholder', () => {
  assert.equal(fill('{a} e {b}', { a: 1, b: 'x' }), '1 e x');
  assert.equal(fill('sem', { a: 1 }), 'sem');
});
