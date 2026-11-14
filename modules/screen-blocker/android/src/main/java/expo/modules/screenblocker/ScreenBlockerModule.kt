package expo.modules.screenblocker

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenBlockerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ScreenBlocker")

    Events("onBalanceChanged", "onBlockedAppOpened")

    OnCreate {
      BlockerEvents.listener = { name, payload -> sendEvent(name, payload) }
    }
    OnDestroy {
      BlockerEvents.listener = null
    }

    // ---------------------------------------------------------------- permissions
    Function("getPermissionStatus") { Permissions.status(context) }
    Function("openSettings") { target: String -> Permissions.openSettings(context, target) }

    // ---------------------------------------------------------------- apps
    AsyncFunction("getInstalledApps") { InstalledApps.list(context) }
    Function("getBlockedPackages") { BlockerStore.blockedPackages(context).toList() }
    Function("setBlockedPackages") { packages: List<String> ->
      BlockerStore.setBlockedPackages(context, packages.filter { it.isNotBlank() }.toSet())
    }

    // ---------------------------------------------------------------- balance mirror
    Function("getBalance") { BlockerStore.readLedger(context).balanceSeconds.toDouble() }
    Function("setBalanceFromServer") { seconds: Double ->
      BlockerStore.updateLedger(context) { Ledger.setFromServer(it, seconds.toLong()) }.balanceSeconds.toDouble()
    }
    Function("grant") { seconds: Double ->
      BlockerStore.updateLedger(context) { Ledger.grant(it, seconds.toLong()) }.balanceSeconds.toDouble()
    }

    // ---------------------------------------------------------------- usage reporting
    Function("getUnreportedUsage") {
      val state = BlockerStore.readLedger(context)
      val seconds = Ledger.unreported(state)
      if (seconds <= 0L) {
        null
      } else {
        mapOf(
          "eventId" to Ledger.eventId(BlockerStore.installId(context), state.totalConsumedSeconds),
          "seconds" to seconds.toDouble(),
        )
      }
    }
    Function("markUsageReported") { eventId: String ->
      val total = Ledger.parseEventId(BlockerStore.installId(context), eventId)
      if (total != null) BlockerStore.updateLedger(context) { Ledger.markReported(it, total) }
      null
    }

    // ---------------------------------------------------------------- block screen + service
    Function("setBlockScreenInfo") { info: Map<String, Any?> ->
      val d = BlockScreenInfo()
      BlockerStore.setBlockScreenInfo(
        context,
        BlockScreenInfo(
          title = info["title"] as? String ?: d.title,
          subtitle = info["subtitle"] as? String ?: d.subtitle,
          primaryLabel = info["primaryLabel"] as? String ?: d.primaryLabel,
          secondaryLabel = info["secondaryLabel"] as? String ?: d.secondaryLabel,
          streakLabel = info["streakLabel"] as? String ?: d.streakLabel,
          streakDays = (info["streakDays"] as? Number)?.toInt() ?: d.streakDays,
          mascotSkin = info["mascotSkin"] as? String ?: d.mascotSkin,
          deepLink = info["deepLink"] as? String ?: d.deepLink,
          notificationTitle = info["notificationTitle"] as? String ?: d.notificationTitle,
          notificationText = info["notificationText"] as? String ?: d.notificationText,
        ),
      )
      null
    }

    Function("startService") {
      BlockerStore.setEnforcementEnabled(context, true)
      BlockerService.start(context)
    }
    Function("stopService") {
      BlockerStore.setEnforcementEnabled(context, false)
      BlockerService.stop(context)
      null
    }
    Function("isServiceRunning") { BlockerService.running }
  }
}
