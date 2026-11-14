package expo.modules.screenblocker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LedgerTest {
  @Test fun consumesWholeSecondsAndKeepsRemainder() {
    var s = LedgerState(balanceSeconds = 10)
    s = Ledger.consume(s, 750)
    assertEquals(10, s.balanceSeconds)
    assertEquals(750, s.carryMs)
    s = Ledger.consume(s, 750)
    assertEquals(9, s.balanceSeconds)
    assertEquals(1, s.totalConsumedSeconds)
    assertEquals(500, s.carryMs)
  }

  @Test fun neverGoesNegativeAndStopsAtZero() {
    var s = LedgerState(balanceSeconds = 2)
    s = Ledger.consume(s, 5_000)
    assertEquals(0, s.balanceSeconds)
    assertEquals(2, s.totalConsumedSeconds)
    assertEquals(0, s.carryMs)
    s = Ledger.consume(s, 5_000)
    assertEquals(2, s.totalConsumedSeconds)
  }

  @Test fun ignoresNonPositiveDelta() {
    val s = LedgerState(balanceSeconds = 5)
    assertEquals(s, Ledger.consume(s, 0))
    assertEquals(s, Ledger.consume(s, -10))
  }

  @Test fun grantIsCappedAt120Minutes() {
    assertEquals(1800, Ledger.grant(LedgerState(), 1800).balanceSeconds)
    assertEquals(7200, Ledger.grant(LedgerState(balanceSeconds = 7000), 1800).balanceSeconds)
    assertEquals(5, Ledger.grant(LedgerState(balanceSeconds = 5), -3).balanceSeconds)
  }

  @Test fun serverSyncSubtractsUnreportedUsage() {
    val s = LedgerState(balanceSeconds = 100, totalConsumedSeconds = 300, reportedTotalSeconds = 200)
    assertEquals(900, Ledger.setFromServer(s, 1000).balanceSeconds)
    assertEquals(0, Ledger.setFromServer(s, 50).balanceSeconds)
    assertEquals(7100, Ledger.setFromServer(s, 99_999).balanceSeconds)
    val reported = Ledger.markReported(s, 300)
    assertEquals(1000, Ledger.setFromServer(reported, 1000).balanceSeconds)
  }

  @Test fun markReportedIsMonotonicAndBounded() {
    var s = LedgerState(totalConsumedSeconds = 300, reportedTotalSeconds = 100)
    s = Ledger.markReported(s, 50)
    assertEquals(100, s.reportedTotalSeconds)
    s = Ledger.markReported(s, 10_000)
    assertEquals(300, s.reportedTotalSeconds)
    assertEquals(0, Ledger.unreported(s))
  }

  @Test fun eventIdsRoundTripAndAreScopedToTheInstall() {
    val id = Ledger.eventId("abc", 600)
    assertEquals("abc:600", id)
    assertEquals(600L, Ledger.parseEventId("abc", id))
    assertNull(Ledger.parseEventId("other", id))
    assertNull(Ledger.parseEventId("abc", "abc:x"))
  }
}
