package expo.modules.screenblocker

/**
 * Pure state machine over UsageEvents (no Android imports). Feed events in time order; the
 * foreground package is whatever was resumed last and not yet paused/stopped/hidden by the screen.
 * Replaying an overlapping window of events is safe (the final state only depends on the order).
 */
class ForegroundTracker {
  var foregroundPackage: String? = null
    private set

  fun onEvent(type: Int, packageName: String?, @Suppress("UNUSED_PARAMETER") timeMs: Long) {
    when (type) {
      MOVE_TO_FOREGROUND -> if (!packageName.isNullOrEmpty()) foregroundPackage = packageName
      MOVE_TO_BACKGROUND, ACTIVITY_STOPPED -> if (packageName == foregroundPackage) foregroundPackage = null
      SCREEN_NON_INTERACTIVE, KEYGUARD_SHOWN -> foregroundPackage = null
    }
  }

  companion object {
    // Values of UsageEvents.Event.* (ACTIVITY_RESUMED == MOVE_TO_FOREGROUND, ACTIVITY_PAUSED == MOVE_TO_BACKGROUND).
    const val MOVE_TO_FOREGROUND = 1
    const val MOVE_TO_BACKGROUND = 2
    const val SCREEN_NON_INTERACTIVE = 16
    const val KEYGUARD_SHOWN = 17
    const val ACTIVITY_STOPPED = 23
  }
}
