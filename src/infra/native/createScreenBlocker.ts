import type { IScreenBlockerService } from '../../application/ports/IScreenBlockerService';
import { createPlatformScreenBlocker } from './ScreenBlocker';

let instance: IScreenBlockerService | null = null;

/** App-wide singleton. Everything outside infra/native depends only on IScreenBlockerService. */
export function getScreenBlocker(): IScreenBlockerService {
  instance ??= createPlatformScreenBlocker();
  return instance;
}
