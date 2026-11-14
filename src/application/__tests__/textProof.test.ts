import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTextProofValid, toTextProof } from '../textProof.ts';
import { strings } from '../../strings/pt-BR.ts';

const ok = { book: 'Hábitos', chapter: '', summary: 'a'.repeat(200), insight: 'b'.repeat(20) };

test('isTextProofValid enforces the minimums and the chapter cap', () => {
  assert.equal(isTextProofValid(ok), true);
  assert.equal(isTextProofValid({ ...ok, book: 'x' }), false);
  assert.equal(isTextProofValid({ ...ok, summary: 'a'.repeat(199) }), false);
  assert.equal(isTextProofValid({ ...ok, summary: ' '.repeat(100) + 'a'.repeat(150) }), false);
  assert.equal(isTextProofValid({ ...ok, insight: 'curto' }), false);
  assert.equal(isTextProofValid({ ...ok, chapter: 'c'.repeat(81) }), false);
});

test('toTextProof trims and drops an empty chapter', () => {
  assert.deepEqual(toTextProof({ ...ok, book: '  Hábitos ', chapter: '  ' }).chapter, undefined);
  assert.equal(toTextProof({ ...ok, chapter: ' Cap 3 ' }).chapter, 'Cap 3');
  assert.equal(toTextProof({ ...ok, book: '  Hábitos ' }).book, 'Hábitos');
});

test('pt-BR strings cover every task category and hint', () => {
  for (const c of ['home', 'exercise', 'reading', 'study'] as const) {
    assert.ok(strings.categories[c].length > 0);
    assert.ok(strings.categories[`${c}Hint`].length > 0);
  }
  assert.match(strings.textProof.summaryCount, /\{count\}.*\{min\}/);
});
