package expo.modules.screenblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Foreground service (type specialUse) that:
 *  - polls the foreground app (UsageStatsManager.queryEvents, ~750 ms);
 *  - while a blocked app is in front, deducts REAL time from the mirrored balance (decision D1);
 *  - shows the block overlay when the balance is 0.
 * State lives in SharedPreferences, so it keeps working with the JS runtime dead.
 */
class BlockerService : Service() {
  private lateinit var thread: HandlerThread
  private lateinit var handler: Handler
  private lateinit var detector: ForegroundDetector
  private lateinit var overlay: BlockOverlay
  private var started = false
  private var lastTickElapsed = 0L
  private var ticksSinceEmit = 0

  override fun onCreate() {
    super.onCreate()
    thread = HandlerThread("unscroll-blocker").also { it.start() }
    handler = Handler(thread.looper)
    detector = ForegroundDetector(applicationContext)
    overlay = BlockOverlay(applicationContext)
    running = true
    startAsForeground()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startAsForeground()
    if (!started) {
      started = true
      lastTickElapsed = SystemClock.elapsedRealtime()
      handler.post(tick)
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    running = false
    handler.removeCallbacksAndMessages(null)
    overlay.hide()
    thread.quitSafely()
    super.onDestroy()
  }

  private val tick = object : Runnable {
    override fun run() {
      try {
        doTick()
      } catch (t: Throwable) {
        Log.e(TAG, "tick failed", t)
      } finally {
        handler.postDelayed(this, POLL_MS)
      }
    }
  }

  private fun doTick() {
    val ctx = applicationContext
    if (!Permissions.hasUsageAccess(ctx)) {
      overlay.hide()
      lastTickElapsed = SystemClock.elapsedRealtime()
      return
    }

    val nowElapsed = SystemClock.elapsedRealtime()
    // Monotonic clock: changing the wall clock cannot buy time. Long gaps (doze) are not charged.
    val delta = (nowElapsed - lastTickElapsed).coerceIn(0L, MAX_DELTA_MS)
    lastTickElapsed = nowElapsed

    val fg = detector.poll(System.currentTimeMillis())
    val blocked = BlockerStore.blockedPackages(ctx)
    val inBlockedApp = fg != null && fg != ctx.packageName && fg in blocked

    if (!inBlockedApp) {
      overlay.hide()
      return
    }

    val state = BlockerStore.updateLedger(ctx) { Ledger.consume(it, delta) }
    if (state.balanceSeconds <= 0L) {
      if (!overlay.isShown) {
        overlay.show(BlockerStore.blockScreenInfo(ctx))
        BlockerEvents.emit("onBlockedAppOpened", mapOf("packageName" to fg))
      }
      BlockerEvents.emit("onBalanceChanged", mapOf("seconds" to 0))
      ticksSinceEmit = 0
    } else {
      overlay.hide()
      if (++ticksSinceEmit >= EMIT_EVERY_TICKS) {
        ticksSinceEmit = 0
        BlockerEvents.emit("onBalanceChanged", mapOf("seconds" to state.balanceSeconds))
      }
    }
  }

  private fun startAsForeground() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun buildNotification(): Notification {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Unscroll", NotificationManager.IMPORTANCE_LOW).apply {
        setShowBadge(false)
      },
    )
    val info = BlockerStore.blockScreenInfo(this)
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setContentTitle(info.notificationTitle.ifEmpty { "Unscroll" })
      .setContentText(info.notificationText)
      .setOngoing(true)
      .setContentIntent(open)
      .build()
  }

  companion object {
    private const val TAG = "UnscrollBlocker"
    private const val CHANNEL_ID = "unscroll_blocker"
    private const val NOTIFICATION_ID = 4101
    private const val POLL_MS = 750L
    private const val MAX_DELTA_MS = 3_000L
    private const val EMIT_EVERY_TICKS = 5

    @Volatile
    var running = false
      private set

    /** Starts the service. Returns false when the system refuses (e.g. started from background). */
    fun start(ctx: Context): Boolean = try {
      ContextCompat.startForegroundService(ctx, Intent(ctx, BlockerService::class.java))
      true
    } catch (e: Exception) {
      Log.w(TAG, "could not start service", e)
      false
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, BlockerService::class.java))
    }
  }
}
