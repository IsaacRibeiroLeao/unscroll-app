// Wires IosScreenBlockerService to react-native-device-activity (v0.6.x).
// Do not call Swift APIs directly: everything below is the library's own JS API.
import * as DA from 'react-native-device-activity';
import { strings } from '../../strings/pt-BR';
import { IosScreenBlockerService, SELECTION_ID } from './ios/IosScreenBlockerService';
import type { AuthStatus, DeviceActivityPort } from './ios/IosScreenBlockerService';
import { pickerBridge } from './ios/pickerBridge';
import type { IScreenBlockerService } from '../../application/ports/IScreenBlockerService';

export {
  ScreenBlockerError,
  type IScreenBlockerService,
  type PermissionKey,
  type PermissionState,
  type PermissionStatus,
  type PickAppsResult,
  type BlockScreenInfo,
  type ScreenBlockerErrorCode,
  type Unsubscribe,
  type UsageReport,
} from '../../application/ports/IScreenBlockerService';

function callbackNameOf(event: unknown): string {
  // The README shows `event.nativeEvent.callbackName`, the type says `event.callbackName`.
  // TODO(verificar): confirm on device; both shapes are handled.
  const e = event as { callbackName?: unknown; nativeEvent?: { callbackName?: unknown } } | null;
  const name = e?.callbackName ?? e?.nativeEvent?.callbackName;
  return typeof name === 'string' ? name : '';
}

const api: DeviceActivityPort = {
  getAuthorizationStatus: () => DA.getAuthorizationStatus() as AuthStatus,
  requestAuthorization: () => DA.requestAuthorization('individual'),
  getSelectionToken: (id) => DA.getFamilyActivitySelectionId(id),
  setSelection: (id, token) =>
    DA.setFamilyActivitySelectionId({ id, familyActivitySelection: token }),
  block: (selectionId, triggeredBy) =>
    DA.blockSelection({ activitySelectionId: selectionId }, triggeredBy),
  unblock: (selectionId, triggeredBy) =>
    DA.unblockSelection({ activitySelectionId: selectionId }, triggeredBy),
  startMonitoring: (activityName, schedule, events) =>
    DA.startMonitoring(
      activityName,
      { intervalStart: schedule.start, intervalEnd: schedule.end, repeats: false },
      events.map((e) => ({
        eventName: e.eventName,
        familyActivitySelection: e.token,
        threshold: e.threshold,
      })),
    ),
  stopMonitoring: (names) => DA.stopMonitoring(names),
  getActivities: () => DA.getActivities(),
  configureBlockActions: ({ activityName, callbackName, eventName, selectionId }) =>
    DA.configureActions({
      activityName,
      callbackName,
      eventName,
      actions: [{ type: 'blockSelection', familyActivitySelectionId: selectionId }],
    }),
  cleanUpActivity: (name) => DA.cleanUpAfterActivity(name),
  getEvents: (name) =>
    DA.getEvents(name).map((e) => ({
      activityName: e.activityName,
      callbackName: e.callbackName,
      eventName: e.eventName,
    })),
  configureShield: () =>
    DA.updateShield(
      {
        title: strings.shield.title,
        subtitle: strings.shield.subtitle,
        primaryButtonLabel: strings.shield.primaryButton,
        iconSystemName: 'lock.fill',
        backgroundBlurStyle: DA.UIBlurEffectStyle.systemMaterialDark,
      },
      {
        // The Shield cannot open our app (library's `openApp` uses a hardcoded URL scheme), so the
        // primary button closes it and posts a notification the user can tap.
        primary: {
          behavior: 'close',
          actions: [
            {
              type: 'sendNotification',
              payload: {
                title: strings.shield.notificationTitle,
                body: strings.shield.notificationBody,
              },
            },
          ],
        },
      },
      `configureShield:${SELECTION_ID}`,
    ),
  storeGet: <T>(key: string) => DA.userDefaultsGet<T>(key),
  storeSet: (key, value) => {
    DA.userDefaultsSet(key, value);
  },
  onMonitorEvent: (listener) =>
    DA.onDeviceActivityMonitorEvent((event) => listener(callbackNameOf(event))),
};

export function createPlatformScreenBlocker(): IScreenBlockerService {
  return new IosScreenBlockerService({ api, picker: pickerBridge });
}
