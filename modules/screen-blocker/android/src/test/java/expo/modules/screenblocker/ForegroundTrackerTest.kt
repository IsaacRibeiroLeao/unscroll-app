package expo.modules.screenblocker

import expo.modules.screenblocker.ForegroundTracker.Companion.ACTIVITY_STOPPED
import expo.modules.screenblocker.ForegroundTracker.Companion.KEYGUARD_SHOWN
import expo.modules.screenblocker.ForegroundTracker.Companion.MOVE_TO_BACKGROUND
import expo.modules.screenblocker.ForegroundTracker.Companion.MOVE_TO_FOREGROUND
import expo.modules.screenblocker.ForegroundTracker.Companion.SCREEN_NON_INTERACTIVE
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ForegroundTrackerTest {
  @Test fun tracksResumeAndPause() {
    val t = ForegroundTracker()
    assertNull(t.foregroundPackage)
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", 1)
    assertEquals("com.a", t.foregroundPackage)
    t.onEvent(MOVE_TO_BACKGROUND, "com.a", 2)
    assertNull(t.foregroundPackage)
  }

  @Test fun lateStopOfPreviousAppDoesNotClearTheNewOne() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", 1)
    t.onEvent(MOVE_TO_FOREGROUND, "com.b", 2)
    t.onEvent(ACTIVITY_STOPPED, "com.a", 3)
    assertEquals("com.b", t.foregroundPackage)
  }

  @Test fun screenOffAndKeyguardClear() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", 1)
    t.onEvent(SCREEN_NON_INTERACTIVE, null, 2)
    assertNull(t.foregroundPackage)
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", 3)
    t.onEvent(KEYGUARD_SHOWN, null, 4)
    assertNull(t.foregroundPackage)
  }

  @Test fun replayingAnOverlappingWindowEndsInTheSameState() {
    val seq = listOf(
      Triple(MOVE_TO_FOREGROUND, "com.a", 1L),
      Triple(MOVE_TO_BACKGROUND, "com.a", 2L),
      Triple(MOVE_TO_FOREGROUND, "com.b", 3L),
    )
    val t = ForegroundTracker()
    seq.forEach { t.onEvent(it.first, it.second, it.third) }
    seq.drop(1).forEach { t.onEvent(it.first, it.second, it.third) }
    assertEquals("com.b", t.foregroundPackage)
  }

  @Test fun ignoresEmptyPackage() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "", 1)
    assertNull(t.foregroundPackage)
  }
}
