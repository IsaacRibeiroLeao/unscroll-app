// Bridges the imperative `pickApps()` call to the declarative native picker view, which must be
// rendered by <ScreenBlockerHost /> (mounted once in the root layout).
import { ScreenBlockerError } from '../../../application/ports/IScreenBlockerService.ts';
import type { PickedSelection, SelectionPickerPort } from './IosScreenBlockerService.ts';

export interface PickerRequest {
  currentToken: string | null;
  resolve: (result: PickedSelection | null) => void;
}

type Host = (request: PickerRequest) => void;

class PickerBridge implements SelectionPickerPort {
  private host: Host | null = null;
  private inFlight = false;

  /** Called by the host component on mount; returns the unsubscribe function. */
  subscribe(host: Host): () => void {
    this.host = host;
    return () => {
      if (this.host === host) this.host = null;
    };
  }

  pick(currentToken: string | null): Promise<PickedSelection | null> {
    const host = this.host;
    if (!host) {
      return Promise.reject(
        new ScreenBlockerError('UNSUPPORTED', 'ScreenBlockerHost is not mounted'),
      );
    }
    if (this.inFlight) {
      return Promise.reject(new ScreenBlockerError('NATIVE_FAILURE', 'picker already open'));
    }
    this.inFlight = true;
    return new Promise<PickedSelection | null>((resolve) => {
      host({
        currentToken,
        resolve: (result) => {
          this.inFlight = false;
          resolve(result);
        },
      });
    });
  }
}

export const pickerBridge = new PickerBridge();
