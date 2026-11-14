import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ScreenBlockerError } from '../../../../application/ports/IScreenBlockerService.ts';
import { IosScreenBlockerService, SELECTION_ID } from '../IosScreenBlockerService.ts';
import type {
  AuthStatus,
  DeviceActivityPort,
  PickedSelection,
} from '../IosScreenBlockerService.ts';
import type { RecordedEvent } from '../usagePlan.ts';

interface Monitor {
  activityName: string;
  eventNames: string[];
  token: string;
}

function setup(opts: { auth?: AuthStatus; token?: string; selected?: boolean } = {}) {
  const log: string[] = [];
  const store = new Map<string, unknown>();
  const monitors = new Map<string, Monitor>();
  const actions: { activityName: string; callbackName: string; eventName?: string }[] = [];
  const events: RecordedEvent[] = [];
  const selections = new Map<string, string>();
  let blocked = false;
  let auth: AuthStatus = opts.auth ?? 2;
  let now = 1_700_000_000_000;
  let failStart = false;
  let nextPick: PickedSelection | null = null;
  let monitorListener: ((n: string) => void) | null = null;

  const api: DeviceActivityPort = {
    getAuthorizationStatus: () => auth,
    requestAuthorization: async () => {
      log.push('requestAuthorization');
    },
    getSelectionToken: (id) => selections.get(id),
    setSelection: (id, token) => void selections.set(id, token),
    block: (_id, by) => {
      blocked = true;
      log.push(`block:${by}`);
    },
    unblock: (_id, by) => {
      blocked = false;
      log.push(`unblock:${by}`);
    },
    startMonitoring: async (activityName, _schedule, evs) => {
      if (failStart) throw new Error('boom');
      monitors.set(activityName, {
        activityName,
        eventNames: evs.map((e) => e.eventName),
        token: evs[0]?.token ?? '',
      });
    },
    stopMonitoring: (names) => names.forEach((n) => monitors.delete(n)),
    getActivities: () => [...monitors.keys()],
    configureBlockActions: (p) => void actions.push(p),
    cleanUpActivity: (name) => {
      for (let i = events.length - 1; i >= 0; i--) if (events[i]?.activityName === name) events.splice(i, 1);
    },
    getEvents: (name) => events.filter((e) => !name || e.activityName === name),
    configureShield: () => void log.push('configureShield'),
    storeGet: <T>(k: string) => store.get(k) as T | undefined,
    storeSet: (k, v) => void store.set(k, JSON.parse(JSON.stringify(v))),
    onMonitorEvent: (l) => {
      monitorListener = l;
      return { remove: () => void (monitorListener = null) };
    },
  };
  const svc = new IosScreenBlockerService({
    api,
    picker: { pick: async () => nextPick },
    now: () => now,
    sleep: async () => {},
  });

  if (opts.selected !== false) {
    selections.set(SELECTION_ID, opts.token ?? 'TOKEN');
    store.set('unscroll.ios.state', { window: null, pending: [], selectionCount: 3 });
  }

  const activity = () => [...monitors.keys()][0] as string;
  return {
    svc, log, monitors, actions, events, store, selections,
    isBlocked: () => blocked,
    setAuth: (a: AuthStatus) => void (auth = a),
    advance: (ms: number) => void (now += ms),
    failNextStart: () => void (failStart = true),
    setPick: (p: PickedSelection | null) => void (nextPick = p),
    fireMonitor: (n: string) => monitorListener?.(n),
    activity,
    consume(seconds: number, name = activity()) {
      events.push({ activityName: name, callbackName: 'eventDidReachThreshold', eventName: `u-${seconds}` });
    },
  };
}

test('permissions map the library status (and poll while notDetermined)', async () => {
  const t = setup({ auth: 0 });
  assert.deepEqual(await t.svc.getPermissionStatus(), { state: 'undetermined', granted: false, missing: ['screenTime'] });
  assert.equal((await t.svc.requestPermissions()).state, 'undetermined');
  t.setAuth(2);
  assert.deepEqual(await t.svc.requestPermissions(), { state: 'granted', granted: true, missing: [] });
  t.setAuth(1);
  assert.equal((await t.svc.getPermissionStatus()).state, 'denied');
});

test('syncBalance(>0): block actions registered BEFORE unblock, events cumulative', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  assert.equal(t.isBlocked(), false);
  assert.deepEqual(t.monitors.get(t.activity())?.eventNames, ['u-300', 'u-600', 'u-900', 'u-1200']);
  assert.deepEqual(
    t.actions.map((a) => `${a.callbackName}:${a.eventName ?? '-'}`),
    ['eventDidReachThreshold:u-1200', 'intervalDidEnd:-'],
  );
  assert.equal(await t.svc.getBalanceSeconds(), 1200);
  assert.ok(t.log.some((l) => l.startsWith('unblock')));
});

test('balance is derived from native usage events (app may have been dead)', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  t.consume(300);
  t.consume(600);
  assert.equal(await t.svc.getBalanceSeconds(), 600);
  const [r] = await t.svc.getUnreportedUsage();
  assert.equal(r?.seconds, 600);
  assert.equal(r?.eventId, `${t.activity()}:600`);

  await t.svc.markUsageReported(r!.eventId);
  assert.deepEqual(await t.svc.getUnreportedUsage(), []);
  t.consume(900);
  const [r2] = await t.svc.getUnreportedUsage();
  assert.equal(r2?.seconds, 300);
  assert.equal(r2?.eventId, `${t.activity()}:900`);

  t.consume(1200);
  assert.equal(await t.svc.getBalanceSeconds(), 0);
});

test('resync keeps unreported usage as pending and restarts a fresh window', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  const first = t.activity();
  t.consume(600);
  t.advance(1000);
  await t.svc.syncBalance(900); // server balance (caller did not reconcile first)
  assert.notEqual(t.activity(), first);
  assert.equal(t.monitors.size, 1, 'old monitor stopped');
  assert.equal(await t.svc.getBalanceSeconds(), 900);
  const pending = await t.svc.getUnreportedUsage();
  assert.deepEqual(pending, [{ eventId: `${first}:600`, seconds: 600 }]);
  await t.svc.markUsageReported(pending[0]!.eventId);
  assert.deepEqual(await t.svc.getUnreportedUsage(), []);
});

test('syncBalance(0) / junk blocks and drops the window', async () => {
  const t = setup();
  await t.svc.syncBalance(600);
  await t.svc.syncBalance(0);
  assert.equal(t.isBlocked(), true);
  assert.equal(t.monitors.size, 0);
  await t.svc.syncBalance(600);
  await t.svc.syncBalance(Number.NaN);
  assert.equal(t.isBlocked(), true);
});

test('balance is capped at 120 min', async () => {
  const t = setup();
  await t.svc.syncBalance(99999);
  assert.equal(await t.svc.getBalanceSeconds(), 7200);
});

test('grantTime adds to the local balance and re-arms', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  t.consume(300);
  await t.svc.grantTime(1200);
  assert.equal(await t.svc.getBalanceSeconds(), 2100);
  assert.equal(t.isBlocked(), false);
  assert.deepEqual(t.monitors.get(t.activity())?.eventNames.at(-1), 'u-2100');
});

test('grantTime from zero unblocks', async () => {
  const t = setup();
  await t.svc.blockNow();
  assert.equal(t.isBlocked(), true);
  await t.svc.grantTime(1800);
  assert.equal(t.isBlocked(), false);
  assert.equal(await t.svc.getBalanceSeconds(), 1800);
});

test('fail closed: monitor failure keeps apps blocked and surfaces NATIVE_FAILURE', async () => {
  const t = setup();
  await t.svc.syncBalance(0);
  t.failNextStart();
  await assert.rejects(t.svc.syncBalance(600), (e: unknown) => e instanceof ScreenBlockerError && e.code === 'NATIVE_FAILURE');
  assert.equal(t.isBlocked(), true);
  assert.equal(await t.svc.getBalanceSeconds(), 0);
});

test('guards: not authorized / no selection', async () => {
  const t = setup({ auth: 1 });
  await assert.rejects(t.svc.syncBalance(600), (e: unknown) => e instanceof ScreenBlockerError && e.code === 'NOT_AUTHORIZED');

  const none = setup({ selected: false });
  await assert.rejects(none.svc.syncBalance(600), (e: unknown) => e instanceof ScreenBlockerError && e.code === 'NO_SELECTION');
  await none.svc.syncBalance(0); // quietly fine
  await none.svc.startMonitoring(); // nothing to enforce
  assert.equal(none.log.length, 0);
});

test('startMonitoring: fail closed with no window; keeps a healthy window; re-arms a lost monitor', async () => {
  const t = setup();
  await t.svc.startMonitoring();
  assert.equal(t.isBlocked(), true, 'no grant yet -> blocked');

  await t.svc.syncBalance(1200);
  const act = t.activity();
  await t.svc.startMonitoring();
  assert.equal(t.activity(), act, 'healthy window untouched');

  t.monitors.clear(); // system dropped the monitor
  t.consume(300, act);
  await t.svc.startMonitoring();
  assert.equal(t.monitors.size, 1);
  assert.equal(await t.svc.getBalanceSeconds(), 900);
  assert.deepEqual(await t.svc.getUnreportedUsage(), [{ eventId: `${act}:300`, seconds: 300 }]);
});

test('clock moved forward past the window end blocks (fail closed) and keeps usage', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  const act = t.activity();
  t.consume(300);
  t.advance(25 * 60 * 60 * 1000);
  assert.equal(await t.svc.getBalanceSeconds(), 0);
  await t.svc.startMonitoring();
  assert.equal(t.isBlocked(), true);
  assert.deepEqual(await t.svc.getUnreportedUsage(), [{ eventId: `${act}:300`, seconds: 300 }]);
});

test('stopMonitoring unblocks and keeps pending usage', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  const act = t.activity();
  t.consume(600);
  await t.svc.stopMonitoring();
  assert.equal(t.isBlocked(), false);
  assert.equal(t.monitors.size, 0);
  assert.deepEqual(await t.svc.getUnreportedUsage(), [{ eventId: `${act}:600`, seconds: 600 }]);
});

test('pickApps: new selection is blocked at zero balance; old selection released first', async () => {
  const t = setup();
  t.setPick({ token: 'NEW', count: 4 });
  const res = await t.svc.pickApps();
  assert.deepEqual(res, { selectedCount: 4, unchanged: false });
  assert.equal(t.selections.get(SELECTION_ID), 'NEW');
  assert.equal(t.isBlocked(), true);
  assert.ok(t.log.indexOf('unblock:pickApps:release-old') < t.log.findIndex((l) => l.startsWith('block:pickApps')));
  assert.equal(await t.svc.getSelectedAppsCount(), 4);
});

test('pickApps keeps the current balance (restarts the window with the new selection)', async () => {
  const t = setup();
  await t.svc.syncBalance(1200);
  t.consume(300);
  t.setPick({ token: 'NEW', count: 2 });
  await t.svc.pickApps();
  assert.equal(await t.svc.getBalanceSeconds(), 900);
  assert.equal(t.monitors.get(t.activity())?.token, 'NEW');
});

test('pickApps: cancel is unchanged; empty selection clears and unblocks', async () => {
  const t = setup();
  t.setPick(null);
  assert.deepEqual(await t.svc.pickApps(), { selectedCount: 3, unchanged: true });
  t.setPick({ token: null, count: 0 });
  assert.deepEqual(await t.svc.pickApps(), { selectedCount: 0, unchanged: false });
  assert.equal(await t.svc.getSelectedAppsCount(), 0);
  assert.equal(t.isBlocked(), false);
});

test('onBalanceChanged fires on sync and on native monitor events; unsubscribe stops it', async () => {
  const t = setup();
  const seen: number[] = [];
  const off = t.svc.onBalanceChanged((s) => seen.push(s));
  await t.svc.syncBalance(600);
  t.consume(300);
  t.fireMonitor('eventDidReachThreshold');
  t.fireMonitor('intervalDidStart'); // ignored
  assert.deepEqual(seen, [600, 300]);
  off();
  await t.svc.syncBalance(0);
  assert.deepEqual(seen, [600, 300]);
});

test('operations are serialized (no interleaving)', async () => {
  const t = setup();
  const a = t.svc.syncBalance(600);
  const b = t.svc.syncBalance(1200);
  await Promise.all([a, b]);
  assert.equal(await t.svc.getBalanceSeconds(), 1200);
  assert.equal(t.monitors.size, 1);
});
