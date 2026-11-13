import { useEffect, useRef, useState } from 'react';
import { DeviceActivitySelectionSheetView } from 'react-native-device-activity';
import { pickerBridge } from './ios/pickerBridge';
import type { PickerRequest } from './ios/pickerBridge';
import type { PickedSelection } from './ios/IosScreenBlockerService';

/** Hosts the native Family Activity picker sheet. Mount once in the root layout. */
export default function ScreenBlockerHost() {
  const [request, setRequest] = useState<PickerRequest | null>(null);
  const latest = useRef<PickedSelection | null>(null);

  useEffect(
    () =>
      pickerBridge.subscribe((r) => {
        latest.current = null;
        setRequest(r);
      }),
    [],
  );

  if (!request) return null;

  return (
    <DeviceActivitySelectionSheetView
      // Invisible anchor: the native side presents the iOS sheet itself.
      style={{ width: 1, height: 1, position: 'absolute' }}
      familyActivitySelection={request.currentToken}
      onSelectionChange={(e) => {
        const n = e.nativeEvent;
        latest.current = {
          token: n.familyActivitySelection,
          count: n.applicationCount + n.categoryCount + n.webDomainCount,
        };
      }}
      onDismissRequest={() => {
        // TODO(verificar): Cancel and Done both land here; `latest` holds the last live change.
        request.resolve(latest.current);
        setRequest(null);
      }}
    />
  );
}
