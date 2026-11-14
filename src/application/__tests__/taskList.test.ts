import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Task } from '../ports/IBackendApi.ts';
import { withNewTask } from '../taskList.ts';

const task = (id: string): Task => ({
  id,
  title: id,
  description: null,
  recurrence: 'once',
  category: 'home',
  status: 'pending',
  rewardMinutes: 20,
  rewardXp: 50,
  rewardGems: 25,
});

test('withNewTask puts the new task first and keeps the rest', () => {
  assert.deepEqual(
    withNewTask([task('a'), task('b')], task('c')).map((t) => t.id),
    ['c', 'a', 'b'],
  );
});

test('withNewTask handles an empty cache and never duplicates an id', () => {
  assert.deepEqual(
    withNewTask(undefined, task('a')).map((t) => t.id),
    ['a'],
  );
  assert.deepEqual(
    withNewTask([task('a'), task('b')], task('b')).map((t) => t.id),
    ['b', 'a'],
  );
});
