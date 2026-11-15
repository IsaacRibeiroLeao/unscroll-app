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
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", "Main", 1)
    assertEquals("com.a", t.foregroundPackage)
    t.onEvent(MOVE_TO_BACKGROUND, "com.a", "Main", 2)
    assertNull(t.foregroundPackage)
  }

  @Test fun lateStopOfPreviousAppDoesNotClearTheNewOne() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", "Main", 1)
    t.onEvent(MOVE_TO_FOREGROUND, "com.b", "Main", 2)
    t.onEvent(ACTIVITY_STOPPED, "com.a", "Main", 3)
    assertEquals("com.b", t.foregroundPackage)
  }

  @Test fun screenOffAndKeyguardClear() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", "Main", 1)
    t.onEvent(SCREEN_NON_INTERACTIVE, null, "Main", 2)
    assertNull(t.foregroundPackage)
    t.onEvent(MOVE_TO_FOREGROUND, "com.a", "Main", 3)
    t.onEvent(KEYGUARD_SHOWN, null, "Main", 4)
    assertNull(t.foregroundPackage)
  }

  @Test fun replayingAnOverlappingWindowEndsInTheSameState() {
    val seq = listOf(
      Triple(MOVE_TO_FOREGROUND, "com.a", 1L),
      Triple(MOVE_TO_BACKGROUND, "com.a", 2L),
      Triple(MOVE_TO_FOREGROUND, "com.b", 3L),
    )
    val t = ForegroundTracker()
    seq.forEach { t.onEvent(it.first, it.second, "Main", it.third) }
    seq.drop(1).forEach { t.onEvent(it.first, it.second, "Main", it.third) }
    assertEquals("com.b", t.foregroundPackage)
  }

  @Test fun ignoresEmptyPackage() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "", "Main", 1)
    assertNull(t.foregroundPackage)
  }

  @Test fun movingBetweenScreensOfTheSameAppKeepsItInFront() {
    val t = ForegroundTracker()
    t.onEvent(MOVE_TO_FOREGROUND, "com.insta", "Feed", 1)
    t.onEvent(MOVE_TO_FOREGROUND, "com.insta", "Profile", 2)
    t.onEvent(MOVE_TO_BACKGROUND, "com.insta", "Feed", 3) // late pause of the old screen
    assertEquals("com.insta", t.foregroundPackage)
    t.onEvent(ACTIVITY_STOPPED, "com.insta", "Feed", 4)
    assertEquals("com.insta", t.foregroundPackage)
    t.onEvent(MOVE_TO_BACKGROUND, "com.insta", "Profile", 5)
    assertNull(t.foregroundPackage)
  }
}
