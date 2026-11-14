package expo.modules.screenblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts the blocker after a reboot or an app update when enforcement was enabled. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!BlockerStore.enforcementEnabled(context)) return
    if (!Permissions.hasUsageAccess(context)) return
    BlockerService.start(context)
  }
}
