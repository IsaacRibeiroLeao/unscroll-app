import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en } from '../en.ts';
import { es } from '../es.ts';
import { strings } from '../pt-BR.ts';

type Tree = { [k: string]: unknown };

function leaves(node: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === 'string') out.set(path, node);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Tree)) {
      for (const [p, s] of leaves(v, path ? `${path}.${k}` : k)) out.set(p, s);
    }
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(',');

for (const [name, locale] of [['en', en], ['es', es]] as const) {
  test(`${name} has every pt-BR key with the same placeholders`, () => {
    const base = leaves(strings);
    const other = leaves(locale);
    assert.deepEqual([...other.keys()].sort(), [...base.keys()].sort());
    for (const [path, text] of base) {
      assert.equal(placeholders(other.get(path) ?? ''), placeholders(text), path);
    }
  });
}
