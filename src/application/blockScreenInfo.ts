import type { BlockScreenInfo } from './ports/IScreenBlockerService.ts';
import type { Profile } from './ports/IBackendApi.ts';

export interface BlockScreenTexts {
  title: string;
  subtitle: string;
  primaryButton: string;
  secondaryButton: string;
  streakLabel: string;
  notificationTitle: string;
  notificationText: string;
}

/** Content for the native block screen (Android). The streak line is hidden when the streak is 0. */
export function buildBlockScreenInfo(
  profile: Pick<Profile, 'streakDays' | 'activeMascotSkin'>,
  texts: BlockScreenTexts,
  deepLink: string,
): BlockScreenInfo {
  return {
    title: texts.title,
    subtitle: texts.subtitle,
    primaryLabel: texts.primaryButton,
    secondaryLabel: texts.secondaryButton,
    streakLabel: profile.streakDays > 0 ? texts.streakLabel : '',
    streakDays: profile.streakDays,
    mascotSkin: profile.activeMascotSkin,
    deepLink,
    notificationTitle: texts.notificationTitle,
    notificationText: texts.notificationText,
  };
}
