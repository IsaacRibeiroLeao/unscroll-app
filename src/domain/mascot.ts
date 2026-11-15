export type MascotSkin = 'default' | 'mascot_skin_fire' | 'mascot_skin_zen';
/**
 * happy: cheering · wink: thumbs up + wink · proud: thumbs up · sleepy: out of time ·
 * peek: onboarding · royal: trophy (Pro) · phone: holding a phone (welcome) · sad: crying (delete account)
 */
export type MascotMood =
  | 'sleepy'
  | 'happy'
  | 'wink'
  | 'proud'
  | 'peek'
  | 'royal'
  | 'phone'
  | 'sad'
  | 'clock'
  | 'gems'
  | 'love'
  | 'think'
  | 'surprised'
  | 'laptop'
  | 'celebrate'
  | 'cool';

const SKINS: readonly MascotSkin[] = ['default', 'mascot_skin_fire', 'mascot_skin_zen'];

/** Unknown values (e.g. a skin added server-side before an app update) fall back to the default. */
export function toMascotSkin(value: string): MascotSkin {
  return (SKINS as readonly string[]).includes(value) ? (value as MascotSkin) : 'default';
}

export function moodFor(balanceSeconds: number, streakDays: number): MascotMood {
  if (balanceSeconds <= 0) return 'sleepy';
  return streakDays >= 7 ? 'proud' : 'happy';
}
