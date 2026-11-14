export type MascotSkin = 'default' | 'mascot_skin_fire' | 'mascot_skin_zen';
/**
 * happy: thumbs up · wink: thumbs up + wink · proud: arms up with medal · sleepy: out of time ·
 * peek: onboarding · royal: Pro · phone: crown + backpack + phone (welcome) · sad: delete account
 */
export type MascotMood = 'sleepy' | 'happy' | 'wink' | 'proud' | 'peek' | 'royal' | 'phone' | 'sad';

const SKINS: readonly MascotSkin[] = ['default', 'mascot_skin_fire', 'mascot_skin_zen'];

/** Unknown values (e.g. a skin added server-side before an app update) fall back to the default. */
export function toMascotSkin(value: string): MascotSkin {
  return (SKINS as readonly string[]).includes(value) ? (value as MascotSkin) : 'default';
}

export function moodFor(balanceSeconds: number, streakDays: number): MascotMood {
  if (balanceSeconds <= 0) return 'sleepy';
  return streakDays >= 7 ? 'proud' : 'happy';
}
