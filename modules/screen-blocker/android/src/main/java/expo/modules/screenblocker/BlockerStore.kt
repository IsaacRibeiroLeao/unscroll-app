package expo.modules.screenblocker

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/** Texts and info for the native block screen. Strings come from JS (pt-BR file), never hardcoded here. */
data class BlockScreenInfo(
  val title: String = "",
  val subtitle: String = "",
  val primaryLabel: String = "",
  val secondaryLabel: String = "",
  val streakLabel: String = "",
  val streakDays: Int = 0,
  val mascotSkin: String = "default",
  val deepLink: String = "unscroll://blocked",
  val notificationTitle: String = "",
  val notificationText: String = "",
)

/**
 * SharedPreferences-backed state. The balance mirror lives here so the service works with the JS
 * runtime dead; every read-modify-write goes through one lock (service and module share a process).
 */
object BlockerStore {
  private const val PREFS = "unscroll_screen_blocker"
  private val lock = Any()

  private fun prefs(ctx: Context): SharedPreferences =
    ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // ----------------------------------------------------------------- ledger
  private fun readLedgerLocked(p: SharedPreferences) = LedgerState(
    balanceSeconds = p.getLong("balance_seconds", 0),
    totalConsumedSeconds = p.getLong("total_consumed_seconds", 0),
    reportedTotalSeconds = p.getLong("reported_total_seconds", 0),
    carryMs = p.getLong("carry_ms", 0),
  )

  fun readLedger(ctx: Context): LedgerState = synchronized(lock) { readLedgerLocked(prefs(ctx)) }

  fun updateLedger(ctx: Context, change: (LedgerState) -> LedgerState): LedgerState =
    synchronized(lock) {
      val p = prefs(ctx)
      val next = change(readLedgerLocked(p))
      p.edit()
        .putLong("balance_seconds", next.balanceSeconds)
        .putLong("total_consumed_seconds", next.totalConsumedSeconds)
        .putLong("reported_total_seconds", next.reportedTotalSeconds)
        .putLong("carry_ms", next.carryMs)
        .apply()
      next
    }

  /** Random id per install so event ids stay unique even after a reinstall resets the counters. */
  fun installId(ctx: Context): String = synchronized(lock) {
    val p = prefs(ctx)
    p.getString("install_id", null) ?: UUID.randomUUID().toString().replace("-", "").also {
      p.edit().putString("install_id", it).apply()
    }
  }

  // ----------------------------------------------------------------- blocked packages
  fun blockedPackages(ctx: Context): Set<String> = synchronized(lock) {
    prefs(ctx).getStringSet("blocked_packages", emptySet())?.toSet() ?: emptySet()
  }

  fun setBlockedPackages(ctx: Context, packages: Set<String>) = synchronized(lock) {
    prefs(ctx).edit().putStringSet("blocked_packages", HashSet(packages)).apply()
  }

  // ----------------------------------------------------------------- enforcement flag
  fun enforcementEnabled(ctx: Context): Boolean = synchronized(lock) { prefs(ctx).getBoolean("enforcement", false) }

  fun setEnforcementEnabled(ctx: Context, enabled: Boolean) = synchronized(lock) {
    prefs(ctx).edit().putBoolean("enforcement", enabled).apply()
  }

  // ----------------------------------------------------------------- block screen info
  fun blockScreenInfo(ctx: Context): BlockScreenInfo = synchronized(lock) {
    val p = prefs(ctx)
    val d = BlockScreenInfo()
    BlockScreenInfo(
      title = p.getString("bs_title", d.title) ?: d.title,
      subtitle = p.getString("bs_subtitle", d.subtitle) ?: d.subtitle,
      primaryLabel = p.getString("bs_primary", d.primaryLabel) ?: d.primaryLabel,
      secondaryLabel = p.getString("bs_secondary", d.secondaryLabel) ?: d.secondaryLabel,
      streakLabel = p.getString("bs_streak_label", d.streakLabel) ?: d.streakLabel,
      streakDays = p.getInt("bs_streak_days", d.streakDays),
      mascotSkin = p.getString("bs_skin", d.mascotSkin) ?: d.mascotSkin,
      deepLink = p.getString("bs_deeplink", d.deepLink) ?: d.deepLink,
      notificationTitle = p.getString("bs_notif_title", d.notificationTitle) ?: d.notificationTitle,
      notificationText = p.getString("bs_notif_text", d.notificationText) ?: d.notificationText,
    )
  }

  fun setBlockScreenInfo(ctx: Context, i: BlockScreenInfo) = synchronized(lock) {
    prefs(ctx).edit()
      .putString("bs_title", i.title)
      .putString("bs_subtitle", i.subtitle)
      .putString("bs_primary", i.primaryLabel)
      .putString("bs_secondary", i.secondaryLabel)
      .putString("bs_streak_label", i.streakLabel)
      .putInt("bs_streak_days", i.streakDays)
      .putString("bs_skin", i.mascotSkin)
      .putString("bs_deeplink", i.deepLink)
      .putString("bs_notif_title", i.notificationTitle)
      .putString("bs_notif_text", i.notificationText)
      .apply()
  }
}
