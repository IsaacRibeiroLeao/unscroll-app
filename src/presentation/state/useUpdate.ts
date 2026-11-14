import { useEffect, useState } from 'react';
import { checkForUpdate } from '../../infra/update/updateService';
import type { UpdateStatus } from '../../infra/update/updateService';

/** Checks once per app launch while signed in. */
export function useUpdate(enabled: boolean): UpdateStatus | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void checkForUpdate().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return status;
}
