/** Apps built around endless feeds and autoplay: the usual doom-scroll culprits (Android package names). */
export const DISTRACTING_APPS: readonly { packageName: string; name: string }[] = [
  { packageName: 'com.instagram.android', name: 'Instagram' },
  { packageName: 'com.instagram.lite', name: 'Instagram Lite' },
  { packageName: 'com.instagram.barcelona', name: 'Threads' },
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { packageName: 'com.zhiliaoapp.musically.go', name: 'TikTok Lite' },
  { packageName: 'com.ss.android.ugc.trill', name: 'TikTok' },
  { packageName: 'com.kwai.video', name: 'Kwai' },
  { packageName: 'com.google.android.youtube', name: 'YouTube' },
  { packageName: 'com.facebook.katana', name: 'Facebook' },
  { packageName: 'com.facebook.lite', name: 'Facebook Lite' },
  { packageName: 'com.twitter.android', name: 'X (Twitter)' },
  { packageName: 'com.snapchat.android', name: 'Snapchat' },
  { packageName: 'com.reddit.frontpage', name: 'Reddit' },
  { packageName: 'com.pinterest', name: 'Pinterest' },
  { packageName: 'tv.twitch.android.app', name: 'Twitch' },
  { packageName: 'com.netflix.mediaclient', name: 'Netflix' },
  { packageName: 'com.tumblr', name: 'Tumblr' },
  { packageName: 'video.like', name: 'Likee' },
];

const ORDER = new Map(DISTRACTING_APPS.map((a, i) => [a.packageName, i]));

/** Splits installed apps into the known-addictive ones (catalog order) and the rest (original order). */
export function partitionApps<T extends { packageName: string }>(
  apps: readonly T[],
): { suggested: T[]; others: T[] } {
  const suggested = apps
    .filter((a) => ORDER.has(a.packageName))
    .sort((a, b) => (ORDER.get(a.packageName) ?? 0) - (ORDER.get(b.packageName) ?? 0));
  const others = apps.filter((a) => !ORDER.has(a.packageName));
  return { suggested, others };
}
