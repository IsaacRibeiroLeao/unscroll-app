import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ScreenBlockerError } from '../../../../application/ports/IScreenBlockerService.ts';
import { AndroidScreenBlockerService } from '../AndroidScreenBlockerService.ts';
import type {
  AndroidNativePort,
  AndroidPermissionFlags,
} from '../AndroidScreenBlockerService.ts';

const APPS = [
  { packageName: 'com.a', label: 'A', iconBase64: '' },
  { packageName: 'com.b', label: 'B', iconBase64: '' },
];

function setup(opts: { flags?: Partial<AndroidPermissionFlags>; blocked?: string[] } = {}) {
  const log: string[] = [];
  let flags: AndroidPermissionFlags = {
    usageAccess: true,
    overlay: true,
    notifications: true,
    batteryOptimizationIgnored: true,
    ...opts.flags,
  };
  let blocked = opts.blocked ?? [];
  let balance = 0;
  let usage: { eventId: string; seconds: number } | null = null;
  let startOk = true;
  let nextPick: string[] | null = null;
  const balanceListeners = new Set<(s: number) => void>();

  const native: AndroidNativePort = {
    getPermissionStatus: () => flags,
    openSettings: (t) => {
      log.push(`open:${t}`);
      return true;
    },
    getInstalledApps: async () => APPS,
    getBlockedPackages: () => blocked,
    setBlockedPackages: (p) => {
      blocked = p;
      log.push(`set:${p.join(',')}`);
    },
    getBalance: () => balance,
    setBalanceFromServer: (s) => {
      balance = s;
      log.push(`server:${s}`);
      return balance;
    },
    grant: (s) => {
      balance += s;
      log.push(`grant:${s}`);
      return balance;
    },
    getUnreportedUsage: () => usage,
    markUsageReported: (id) => log.push(`reported:${id}`),
    setBlockScreenInfo: () => log.push('info'),
    startService: () => {
      log.push('start');
      return startOk;
    },
    stopService: () => log.push('stop'),
    addBalanceListener: (l) => {
      balanceListeners.add(l);
      return { remove: () => balanceListeners.delete(l) };
    },
    addBlockedAppListener: () => ({ remove: () => {} }),
  };
  const svc = new AndroidScreenBlockerService({
    native,
    picker: { pick: async () => nextPick },
  });
  return {
    svc,
    log,
    balanceListeners,
    setFlags: (f: Partial<AndroidPermissionFlags>) => (flags = { ...flags, ...f }),
    setUsage: (u: typeof usage) => (usage = u),
    setPick: (p: string[] | null) => (nextPick = p),
    failStart: () => (startOk = false),
  };
}

test('permissions: granted when required ones are on; battery is only advisory', async () => {
  const t = setup({ flags: { batteryOptimizationIgnored: false } });
  const s = await t.svc.getPermissionStatus();
  assert.equal(s.granted, true);
  assert.deepEqual(s.missing, ['batteryOptimization']);
});

test('permissions: missing required ones are listed in order and requested one at a time', async () => {
  const t = setup({ flags: { usageAccess: false, overlay: false } });
  const s = await t.svc.requestPermissions();
  assert.equal(s.granted, false);
  assert.deepEqual(s.missing, ['usageAccess', 'overlay']);
  assert.deepEqual(t.log, ['open:usageAccess']);
});

test('startMonitoring fails closed without permissions or selection', async () => {
  const noPerm = setup({ flags: { overlay: false }, blocked: ['com.a'] });
  await assert.rejects(noPerm.svc.startMonitoring(), (e) => {
    assert.ok(e instanceof ScreenBlockerError);
    assert.equal(e.code, 'NOT_AUTHORIZED');
    return true;
  });
  const noSel = setup();
  await assert.rejects(noSel.svc.startMonitoring(), (e) => {
    assert.ok(e instanceof ScreenBlockerError);
    assert.equal(e.code, 'NO_SELECTION');
    return true;
  });
});

test('startMonitoring starts the service; refusal becomes NATIVE_FAILURE', async () => {
  const ok = setup({ blocked: ['com.a'] });
  await ok.svc.startMonitoring();
  assert.deepEqual(ok.log, ['start']);

  const refused = setup({ blocked: ['com.a'] });
  refused.failStart();
  await assert.rejects(refused.svc.startMonitoring(), (e) => {
    assert.ok(e instanceof ScreenBlockerError);
    assert.equal(e.code, 'NATIVE_FAILURE');
    return true;
  });
});

test('pickApps persists a sorted, de-duplicated selection of installed apps only', async () => {
  const t = setup();
  t.setPick(['com.b', 'com.a', 'com.b', 'com.gone']);
  const r = await t.svc.pickApps();
  assert.deepEqual(r, { selectedCount: 2, unchanged: false });
  assert.deepEqual(t.log, ['set:com.a,com.b']);
  assert.equal(await t.svc.getSelectedAppsCount(), 2);
});

test('pickApps: cancel or same selection leaves everything untouched', async () => {
  const t = setup({ blocked: ['com.a'] });
  t.setPick(null);
  assert.deepEqual(await t.svc.pickApps(), { selectedCount: 1, unchanged: true });
  t.setPick(['com.a']);
  assert.deepEqual(await t.svc.pickApps(), { selectedCount: 1, unchanged: true });
  assert.deepEqual(t.log, []);
});

test('syncBalance clamps bad input and (re)arms the service only when it can run', async () => {
  const t = setup({ blocked: ['com.a'] });
  await t.svc.syncBalance(-5);
  await t.svc.syncBalance(Number.NaN);
  await t.svc.syncBalance(90.9);
  assert.deepEqual(t.log, ['server:0', 'start', 'server:0', 'start', 'server:90', 'start']);

  const noPerm = setup({ blocked: ['com.a'], flags: { usageAccess: false } });
  await noPerm.svc.syncBalance(60);
  assert.deepEqual(noPerm.log, ['server:60']);

  const noSel = setup();
  await noSel.svc.grantTime(60);
  assert.deepEqual(noSel.log, ['grant:60']);
});

test('blockNow zeroes the balance and starts the service', async () => {
  const t = setup({ blocked: ['com.a'] });
  await t.svc.grantTime(100);
  await t.svc.blockNow();
  assert.equal(await t.svc.getBalanceSeconds(), 0);
  assert.equal(t.log.at(-1), 'start');
});

test('usage is reported once per cumulative event id', async () => {
  const t = setup();
  assert.deepEqual(await t.svc.getUnreportedUsage(), []);
  t.setUsage({ eventId: 'i:300', seconds: 300 });
  assert.deepEqual(await t.svc.getUnreportedUsage(), [{ eventId: 'i:300', seconds: 300 }]);
  await t.svc.markUsageReported('i:300');
  assert.deepEqual(t.log, ['reported:i:300']);
});

test('balance listener subscribes and unsubscribes', () => {
  const t = setup();
  const seen: number[] = [];
  const off = t.svc.onBalanceChanged((s) => seen.push(s));
  assert.equal(t.balanceListeners.size, 1);
  [...t.balanceListeners][0]?.(42);
  off();
  assert.equal(t.balanceListeners.size, 0);
  assert.deepEqual(seen, [42]);
});

test('stopMonitoring stops the service', async () => {
  const t = setup();
  await t.svc.stopMonitoring();
  assert.deepEqual(t.log, ['stop']);
});

test('listBlockedApps returns only blocked installed apps with their labels', async () => {
  const { svc } = setup({ blocked: ['com.b', 'com.gone'] });
  assert.deepEqual(await svc.listBlockedApps(), [
    { id: 'com.b', label: 'B', iconBase64: null },
  ]);
});

test('listBlockedApps is empty without a selection', async () => {
  const { svc } = setup({ blocked: [] });
  assert.deepEqual(await svc.listBlockedApps(), []);
});

test('setAppBlocked adds and removes one app and returns the new count', async () => {
  const { svc, log } = setup({ blocked: ['com.a'] });
  assert.equal(await svc.setAppBlocked('com.b', true), 2);
  assert.equal(await svc.setAppBlocked('com.a', false), 1);
  assert.deepEqual(
    log.filter((l) => l.startsWith('set:')),
    ['set:com.a,com.b', 'set:com.b'],
  );
});
