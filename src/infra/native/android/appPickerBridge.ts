// Bridges the imperative `pickApps()` call to the declarative picker modal rendered by
// <ScreenBlockerHost /> (mounted once in the root layout).
import { ScreenBlockerError } from '../../../application/ports/IScreenBlockerService.ts';
import type { AppPickerPort, AppPickerRequest } from './AndroidScreenBlockerService.ts';

export interface PickerHostRequest extends AppPickerRequest {
  resolve: (result: string[] | null) => void;
}

type Host = (request: PickerHostRequest) => void;

export class AppPickerBridge implements AppPickerPort {
  private host: Host | null = null;
  private inFlight = false;

  subscribe(host: Host): () => void {
    this.host = host;
    return () => {
      if (this.host === host) this.host = null;
    };
  }

  pick(request: AppPickerRequest): Promise<string[] | null> {
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
    return new Promise<string[] | null>((resolve) => {
      host({
        ...request,
        resolve: (result) => {
          this.inFlight = false;
          resolve(result);
        },
      });
    });
  }
}

export const appPickerBridge = new AppPickerBridge();
