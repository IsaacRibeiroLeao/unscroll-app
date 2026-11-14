package expo.modules.screenblocker

/**
 * Pure balance accounting (no Android imports, unit-tested on the JVM).
 *
 * The balance is consumed by REAL foreground time of blocked apps, measured by the service with a
 * monotonic clock (decision D1). `totalConsumedSeconds` only grows; the server is told about the
 * difference `total - reported` (idempotent by event id), so nothing is lost if the JS side is dead.
 */
data class LedgerState(
  val balanceSeconds: Long = 0,
  val totalConsumedSeconds: Long = 0,
  val reportedTotalSeconds: Long = 0,
  val carryMs: Long = 0,
)

object Ledger {
  /** Keep in sync with private.max_balance_seconds() (SQL) and MAX_BALANCE_SECONDS (TS). */
  const val MAX_BALANCE_SECONDS = 7200L

  fun consume(s: LedgerState, deltaMs: Long): LedgerState {
    if (deltaMs <= 0L) return s
    if (s.balanceSeconds <= 0L) return if (s.carryMs == 0L) s else s.copy(carryMs = 0)
    val carry = s.carryMs + deltaMs
    val whole = carry / 1000
    val deducted = minOf(whole, s.balanceSeconds)
    val newBalance = s.balanceSeconds - deducted
    return s.copy(
      balanceSeconds = newBalance,
      totalConsumedSeconds = s.totalConsumedSeconds + deducted,
      carryMs = if (newBalance == 0L) 0L else carry % 1000,
    )
  }

  fun grant(s: LedgerState, seconds: Long): LedgerState {
    if (seconds <= 0L) return s
    return s.copy(balanceSeconds = minOf(MAX_BALANCE_SECONDS, s.balanceSeconds + seconds))
  }

  fun unreported(s: LedgerState): Long = (s.totalConsumedSeconds - s.reportedTotalSeconds).coerceAtLeast(0)

  /**
   * `serverSeconds` is the authoritative balance. Anything consumed locally that the server has not
   * been told about yet is subtracted so a late sync never gives time back.
   */
  fun setFromServer(s: LedgerState, serverSeconds: Long): LedgerState {
    val capped = serverSeconds.coerceIn(0L, MAX_BALANCE_SECONDS)
    return s.copy(balanceSeconds = (capped - unreported(s)).coerceAtLeast(0), carryMs = 0)
  }

  fun markReported(s: LedgerState, totalSeconds: Long): LedgerState =
    s.copy(reportedTotalSeconds = maxOf(s.reportedTotalSeconds, minOf(totalSeconds, s.totalConsumedSeconds)))

  fun eventId(installId: String, totalSeconds: Long): String = "$installId:$totalSeconds"

  /** Returns the cumulative total encoded in an event id of this install, or null. */
  fun parseEventId(installId: String, eventId: String): Long? {
    val prefix = "$installId:"
    if (!eventId.startsWith(prefix)) return null
    return eventId.removePrefix(prefix).toLongOrNull()?.takeIf { it >= 0 }
  }
}
