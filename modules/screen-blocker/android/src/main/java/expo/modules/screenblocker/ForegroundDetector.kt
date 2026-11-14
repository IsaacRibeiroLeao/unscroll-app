package expo.modules.screenblocker

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/** Reads UsageStatsManager.queryEvents and feeds the pure ForegroundTracker. */
class ForegroundDetector(context: Context) {
  private val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
  private val tracker = ForegroundTracker()
  private var cursor = 0L

  /** Returns the package currently in the foreground, or null when unknown / screen off. */
  fun poll(nowMs: Long): String? {
    val from = if (cursor == 0L) nowMs - INITIAL_WINDOW_MS else cursor - OVERLAP_MS
    val events = usm.queryEvents(from, nowMs) ?: return tracker.foregroundPackage
    val event = UsageEvents.Event()
    var maxTs = cursor
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      tracker.onEvent(event.eventType, event.packageName, event.timeStamp)
      if (event.timeStamp > maxTs) maxTs = event.timeStamp
    }
    cursor = if (maxTs > 0L) maxTs else nowMs
    return tracker.foregroundPackage
  }

  private companion object {
    // Usage events can be delivered slightly late: re-read a small overlap (replay is safe).
    const val OVERLAP_MS = 2_000L
    // Initial window to discover the app that is already in front when the service starts.
    const val INITIAL_WINDOW_MS = 6 * 60 * 60 * 1000L
  }
}
