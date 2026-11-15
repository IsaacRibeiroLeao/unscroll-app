package expo.modules.screenblocker

/**
 * Pure state machine over UsageEvents (no Android imports). Feed events in time order.
 *
 * It tracks resumed ACTIVITIES, not just packages. Moving inside an app (opening a profile, a story,
 * the camera) pauses one activity of that app and resumes another: keying on the package alone made
 * the late "paused" event of the old screen wipe out the new screen, so the app looked closed while
 * it was still on screen and the block overlay was dropped.
 *
 * Replaying an overlapping window of events is safe: the final state only depends on their order.
 */
class ForegroundTracker {
  // activity key -> package, oldest first. The last entry is the app in front.
  private val resumed = LinkedHashMap<String, String>()

  val foregroundPackage: String?
    get() = resumed.values.lastOrNull()

  fun onEvent(type: Int, packageName: String?, className: String?, @Suppress("UNUSED_PARAMETER") timeMs: Long) {
    val pkg = packageName.orEmpty()
    val key = "$pkg/${className.orEmpty()}"
    when (type) {
      MOVE_TO_FOREGROUND -> if (pkg.isNotEmpty()) {
        // A different app took the screen: whatever else we thought was resumed is stale.
        resumed.entries.removeAll { it.value != pkg }
        resumed.remove(key)
        resumed[key] = pkg
      }
      MOVE_TO_BACKGROUND, ACTIVITY_STOPPED -> resumed.remove(key)
      SCREEN_NON_INTERACTIVE, KEYGUARD_SHOWN -> resumed.clear()
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
