package expo.modules.screenblocker

import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings

object Permissions {
  fun hasUsageAccess(ctx: Context): Boolean {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun hasOverlay(ctx: Context): Boolean = Settings.canDrawOverlays(ctx)

  fun notificationsEnabled(ctx: Context): Boolean =
    (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled()

  fun batteryOptimizationIgnored(ctx: Context): Boolean =
    (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(ctx.packageName)

  fun status(ctx: Context): Map<String, Boolean> = mapOf(
    "usageAccess" to hasUsageAccess(ctx),
    "overlay" to hasOverlay(ctx),
    "notifications" to notificationsEnabled(ctx),
    "batteryOptimizationIgnored" to batteryOptimizationIgnored(ctx),
  )

  /** Opens the exact Settings screen for `target`; returns false if nothing could handle it. */
  fun openSettings(ctx: Context, target: String): Boolean {
    val pkgUri = Uri.parse("package:${ctx.packageName}")
    val candidates: List<Intent> = when (target) {
      "usageAccess" -> listOf(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, pkgUri),
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS),
      )
      "overlay" -> listOf(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkgUri))
      "notifications" -> listOf(
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName),
      )
      // The list screen needs no special permission (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS is
      // restricted by Google Play policy).
      "batteryOptimization" -> listOf(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      else -> emptyList()
    }
    for (intent in candidates) {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        ctx.startActivity(intent)
        return true
      } catch (_: Exception) {
        // try the next fallback
      }
    }
    return false
  }
}
