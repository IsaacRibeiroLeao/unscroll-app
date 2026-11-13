import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBlockScreenInfo } from '../blockScreenInfo.ts';
import { errorMessage, proofMessage } from '../errorMessages.ts';
import type { ErrorTexts } from '../errorMessages.ts';
import { BackendError } from '../ports/IBackendApi.ts';
import type { Profile, ProofOutcome } from '../ports/IBackendApi.ts';
import { purchaseShopItem } from '../purchaseShopItem.ts';
import { submitTaskProof } from '../submitTaskProof.ts';
import { syncScreenTime } from '../syncScreenTime.ts';

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 'u1',
  displayName: null,
  timezone: 'America/Sao_Paulo',
  balanceSeconds: 600,
  xp: 0,
  gems: 0,
  streakDays: 3,
  streakFreezeCount: 0,
  isPro: false,
  activeMascotSkin: 'default',
  ...over,
});

const approved: ProofOutcome = {
  approved: true,
  code: 'APPROVED',
  confidence: 0.9,
  feedback: '',
  rewards: {
    minutes: 20,
    xp: 50,
    gems: 25,
    newStreak: 1,
    streakIncremented: true,
    newBalanceSeconds: 1200,
    newXp: 50,
    newGems: 25,
  },
};

test('submitTaskProof syncs the SERVER balance only when approved', async () => {
  const synced: number[] = [];
  const blocker = { syncBalance: async (s: number) => void synced.push(s) };
  const ok = await submitTaskProof({
    backend: { verifyTaskProof: async () => approved },
    blocker,
    taskId: 't',
    photoUri: 'file://x',
  });
  assert.equal(ok.outcome.approved, true);
  assert.deepEqual(synced, [1200]);

  const rejected = await submitTaskProof({
    backend: {
      verifyTaskProof: async () => ({
        ...approved,
        approved: false,
        code: 'REJECTED',
        rewards: null,
      }),
    },
    blocker,
    taskId: 't',
    photoUri: 'file://x',
  });
  assert.equal(rejected.outcome.approved, false);
  assert.deepEqual(synced, [1200]);
});

test('submitTaskProof keeps the approval when the blocker fails', async () => {
  const r = await submitTaskProof({
    backend: { verifyTaskProof: async () => approved },
    blocker: {
      syncBalance: async () => {
        throw new Error('no service');
      },
    },
    taskId: 't',
    photoUri: 'file://x',
  });
  assert.equal(r.outcome.approved, true);
  assert.ok(r.blockerError instanceof Error);
});

test('purchaseShopItem re-syncs only when the balance changed', async () => {
  const synced: number[] = [];
  const blocker = { syncBalance: async (s: number) => void synced.push(s) };
  const base = { sku: 'x', newGems: 0, newStreakFreezeCount: 0 };
  await purchaseShopItem({
    backend: { purchaseItem: async () => ({ ...base, newBalanceSeconds: 600 }) },
    blocker,
    sku: 'x',
    previousBalanceSeconds: 600,
  });
  assert.deepEqual(synced, []);
  await purchaseShopItem({
    backend: { purchaseItem: async () => ({ ...base, newBalanceSeconds: 2400 }) },
    blocker,
    sku: 'x',
    previousBalanceSeconds: 600,
  });
  assert.deepEqual(synced, [2400]);
});

function syncDeps(opts: { usage?: boolean; failReport?: boolean }) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      userId: 'u1',
      blocker: {
        getUnreportedUsage: async () => (opts.usage ? [{ eventId: 'i:60', seconds: 60 }] : []),
        markUsageReported: async (id: string) => void calls.push(`mark:${id}`),
        syncBalance: async (s: number) => void calls.push(`sync:${s}`),
      } as never,
      screenTimeApi: {
        consumeScreenTime: async () => {
          if (opts.failReport) throw new Error('offline');
          calls.push('consume');
          return { newBalanceSeconds: 540, appliedSeconds: 60, duplicate: false };
        },
      },
      backend: {
        getProfile: async () => {
          calls.push('profile');
          return profile({ balanceSeconds: 540 });
        },
      },
    },
  };
}

test('syncScreenTime: report -> profile -> sync, in that order', async () => {
  const t = syncDeps({ usage: true });
  const r = await syncScreenTime(t.deps);
  assert.deepEqual(t.calls, ['consume', 'mark:i:60', 'profile', 'sync:540']);
  assert.equal(r.reportError, null);
});

test('syncScreenTime: failed report never overwrites the native balance', async () => {
  const t = syncDeps({ usage: true, failReport: true });
  const r = await syncScreenTime(t.deps);
  assert.deepEqual(t.calls, ['profile']);
  assert.ok(r.reportError instanceof Error);
});

const texts: ErrorTexts = {
  errors: {
    NETWORK: 'net',
    UNAUTHORIZED: 'auth',
    TASK_BUSY: 'busy',
    TASK_NOT_FOUND: 'nf',
    INSUFFICIENT_GEMS: 'gems',
    ALREADY_OWNED: 'owned',
    FREEZE_LIMIT: 'freeze',
    BALANCE_CAP: 'cap',
    ITEM_NOT_FOUND: 'item',
    SKIN_NOT_OWNED: 'skin',
    TASK_CREATE_LIMIT: 'limit',
    IMAGE_TOO_LARGE: 'big',
    UNKNOWN: 'unknown',
  },
  proof: {
    REJECTED: 'rejected.',
    LOW_QUALITY: 'low',
    AI_UNAVAILABLE: 'ai',
    DAILY_LIMIT: 'daily',
    ALREADY_COMPLETED: 'done',
  },
};

test('errorMessage maps BackendError codes and hides unknown errors', () => {
  assert.equal(errorMessage(new BackendError('INSUFFICIENT_GEMS'), texts), 'gems');
  assert.equal(errorMessage(new Error('secret stack'), texts), 'unknown');
});

test('proofMessage appends short server feedback only for REJECTED', () => {
  assert.equal(proofMessage('REJECTED', 'Falta o prato.', texts), 'rejected. Falta o prato.');
  assert.equal(proofMessage('REJECTED', 'x'.repeat(200), texts), 'rejected.');
  assert.equal(proofMessage('LOW_QUALITY', 'blur', texts), 'low');
});

test('buildBlockScreenInfo hides the streak line at zero', () => {
  const t = {
    title: 'T',
    subtitle: 'S',
    primaryButton: 'P',
    secondaryButton: 'N',
    streakLabel: '{days} dias',
    notificationTitle: 'NT',
    notificationText: 'NX',
  };
  const a = buildBlockScreenInfo(profile({ streakDays: 4 }), t, 'unscroll://blocked');
  assert.equal(a.streakLabel, '{days} dias');
  assert.equal(a.streakDays, 4);
  const b = buildBlockScreenInfo(profile({ streakDays: 0 }), t, 'unscroll://blocked');
  assert.equal(b.streakLabel, '');
});

test('awaitPro polls until the webhook flips is_pro', async () => {
  const { awaitPro } = await import('../awaitPro.ts');
  let calls = 0;
  const backend = { getProfile: async () => profile({ isPro: ++calls >= 3 }) };
  assert.equal(await awaitPro({ backend, sleep: async () => {} }), true);
  assert.equal(calls, 3);
  const never = { getProfile: async () => profile({ isPro: false }) };
  assert.equal(await awaitPro({ backend: never, sleep: async () => {}, attempts: 2 }), false);
});
