package expo.modules.screenblocker

import android.content.Context
import android.content.Intent
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.GradientDrawable
import android.provider.Settings
import android.view.MotionEvent
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.ScrollView
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.text.Spannable
import android.text.SpannableString
import android.text.style.ForegroundColorSpan
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Full-screen block screen drawn with a TYPE_APPLICATION_OVERLAY window (needs SYSTEM_ALERT_WINDOW).
 * An overlay (instead of launching an Activity from the background) keeps working under Android's
 * background-activity-launch restrictions. All view work happens on the main thread.
 */
class BlockOverlay(private val appContext: Context) {
  private val main = Handler(Looper.getMainLooper())
  private val windowManager = appContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var root: View? = null // main thread only
  private var floatAnimator: ObjectAnimator? = null // main thread only

  @Volatile
  var isShown = false
    private set

  fun show(info: BlockScreenInfo) {
    if (isShown) return
    isShown = true
    main.post {
      try {
        val view = build(info)
        windowManager.addView(view, layoutParams())
        root = view
        view.requestFocus()
      } catch (e: Exception) {
        // Overlay permission revoked or window token problem: stay "not shown" so we retry later.
        isShown = false
        root = null
      }
    }
  }

  fun hide() {
    if (!isShown) return
    isShown = false
    main.post {
      floatAnimator?.cancel()
      floatAnimator = null
      root?.let {
        try {
          windowManager.removeView(it)
        } catch (_: Exception) {
          // already gone
        }
      }
      root = null
    }
  }

  private fun layoutParams() = WindowManager.LayoutParams(
    ViewGroup.LayoutParams.MATCH_PARENT,
    ViewGroup.LayoutParams.MATCH_PARENT,
    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
    PixelFormat.OPAQUE,
  ).apply { gravity = Gravity.TOP or Gravity.START }

  private fun dp(v: Int) = (v * appContext.resources.displayMetrics.density).toInt()

  private fun goHome() {
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      appContext.startActivity(home)
    } catch (_: Exception) {
      // nothing else to do
    }
    hide()
  }

  private fun openTask(deepLink: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
      .setPackage(appContext.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    try {
      appContext.startActivity(intent)
    } catch (_: Exception) {
      // deep link not handled: fall back to launching the app
      appContext.packageManager.getLaunchIntentForPackage(appContext.packageName)?.let {
        it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.startActivity(it)
      }
    }
    hide()
  }

  private fun label(text: String, sizeSp: Float, color: String, bold: Boolean = false): TextView =
    TextView(appContext).apply {
      this.text = text
      textSize = sizeSp
      setTextColor(Color.parseColor(color))
      gravity = Gravity.CENTER
      if (bold) setTypeface(typeface, Typeface.BOLD)
      visibility = if (text.isEmpty()) View.GONE else View.VISIBLE
    }

  /** Honors the system "remove animations" setting. */
  private fun animationsEnabled(): Boolean =
    try {
      Settings.Global.getFloat(appContext.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    } catch (_: Exception) {
      true
    }

  /** Pill button (58dp, fully round) with an optional leading/trailing icon; shrinks under the finger. */
  private fun button(
    text: String,
    primary: Boolean,
    leading: OverlayIcon.Kind? = null,
    trailing: OverlayIcon.Kind? = null,
    onClick: () -> Unit,
  ): Button =
    Button(appContext).apply {
      this.text = text
      isAllCaps = false
      textSize = 19f
      setTypeface(typeface, Typeface.BOLD)
      minHeight = dp(58)
      minimumHeight = dp(58)
      stateListAnimator = null
      val ink = if (primary) Color.parseColor("#16372A") else Color.WHITE
      setTextColor(ink)
      compoundDrawablePadding = dp(12)
      setCompoundDrawablesRelativeWithIntrinsicBounds(
        leading?.let { OverlayIcon(it, ink, dp(26)) },
        null,
        trailing?.let { OverlayIcon(it, ink, dp(22)) },
        null,
      )
      background = if (primary) {
        GradientDrawable(
          GradientDrawable.Orientation.TOP_BOTTOM,
          intArrayOf(Color.parseColor("#FFD84D"), Color.parseColor("#FFB703")),
        ).apply { cornerRadius = dp(29).toFloat() }
      } else {
        GradientDrawable().apply {
          cornerRadius = dp(29).toFloat()
          setColor(Color.parseColor("#0E3F27"))
          setStroke(dp(2), Color.parseColor("#7BC98A"))
        }
      }
      setOnClickListener { onClick() }
      setOnTouchListener { v, e ->
        when (e.actionMasked) {
          MotionEvent.ACTION_DOWN -> v.animate().scaleX(0.96f).scaleY(0.96f).setDuration(90).start()
          MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
            v.animate().scaleX(1f).scaleY(1f).setDuration(140).start()
        }
        false
      }
      contentDescription = text
      visibility = if (text.isEmpty()) View.GONE else View.VISIBLE
    }

  /** Title where the last word takes the accent color ("Tempo [esgotado]"). */
  private fun accentTitle(text: String): TextView =
    label(text, 38f, "#FFFFFF", bold = true).apply {
      val cut = text.trimEnd().lastIndexOf(' ') + 1
      if (cut in 1 until text.length) {
        this.text = SpannableString(text).apply {
          setSpan(ForegroundColorSpan(Color.parseColor("#FFC72C")), cut, text.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
      }
      contentDescription = text
    }

  /** Rounded translucent chip, used for the streak line. */
  private fun chip(text: String): TextView =
    label(text, 16f, "#FFC72C", bold = true).apply {
      setPadding(dp(16), dp(8), dp(16), dp(8))
      background = GradientDrawable().apply {
        cornerRadius = dp(20).toFloat()
        setColor(Color.parseColor("#26FFFFFF"))
      }
    }

  /** Three layered green hills along the bottom edge. */
  private inner class HillsView : View(appContext) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()

    private fun hill(canvas: Canvas, color: String, top: Float, amp: Float, phase: Float) {
      val w = width.toFloat()
      val h = height.toFloat()
      path.reset()
      path.moveTo(0f, h)
      path.lineTo(0f, top)
      path.cubicTo(w * 0.25f, top - amp, w * (0.5f + phase), top + amp, w, top - amp * 0.4f)
      path.lineTo(w, h)
      path.close()
      paint.color = Color.parseColor(color)
      canvas.drawPath(path, paint)
    }

    override fun onDraw(canvas: Canvas) {
      val h = height.toFloat()
      hill(canvas, "#5DB760", h * 0.30f, h * 0.18f, 0.05f)
      hill(canvas, "#3E9E4B", h * 0.55f, h * 0.16f, -0.08f)
      hill(canvas, "#1F7038", h * 0.80f, h * 0.12f, 0.0f)
    }
  }

  /** Fades and slides a view up into place after [delayMs]. */
  private fun enter(v: View, delayMs: Long, overshoot: Boolean = false) {
    v.alpha = 0f
    v.translationY = dp(18).toFloat()
    v.animate()
      .alpha(1f)
      .translationY(0f)
      .setStartDelay(delayMs)
      .setDuration(420)
      .setInterpolator(if (overshoot) OvershootInterpolator(1.2f) else DecelerateInterpolator())
      .start()
  }

  private fun build(info: BlockScreenInfo): View {
    val container = object : FrameLayout(appContext) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) goHome()
          return true
        }
        return super.dispatchKeyEvent(event)
      }
    }
    container.background = GradientDrawable(
      GradientDrawable.Orientation.TOP_BOTTOM,
      intArrayOf(Color.parseColor("#1B6B43"), Color.parseColor("#0A2E1D")),
    )
    container.isClickable = true // swallow touches meant for the blocked app
    container.isFocusableInTouchMode = true

    container.addView(
      HillsView(),
      FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(170), Gravity.BOTTOM),
    )

    val column = LinearLayout(appContext).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(32), dp(24), dp(40))
    }

    val mascot = SleepyBearView(appContext, info.mascotSkin)
    mascot.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    column.addView(mascot, LinearLayout.LayoutParams(dp(280), dp(280)))

    val title = accentTitle(info.title)
    title.setLineSpacing(0f, 1.05f)
    column.addView(title, spaced(top = 20))
    val subtitle = label(info.subtitle, 18f, "#E4F1E8")
    column.addView(subtitle, spaced(top = 10))

    var streak: TextView? = null
    if (info.streakLabel.isNotEmpty()) {
      streak = chip("\uD83D\uDD25 " + info.streakLabel.replace("{days}", info.streakDays.toString()))
      column.addView(streak, spaced(top = 18))
    }

    val primary = button(
      info.primaryLabel,
      primary = true,
      leading = OverlayIcon.Kind.HOURGLASS,
      trailing = OverlayIcon.Kind.CHEVRON,
    ) { openTask(info.deepLink) }
    val secondary = button(
      info.secondaryLabel,
      primary = false,
      leading = OverlayIcon.Kind.CIRCLE_X,
    ) { goHome() }
    column.addView(primary, spaced(top = 28, fill = true))
    column.addView(secondary, spaced(top = 12, fill = true))

    val scroll = ScrollView(appContext).apply {
      isFillViewport = true
      isVerticalScrollBarEnabled = false
      addView(
        column,
        FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER),
      )
    }
    container.addView(scroll, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

    if (animationsEnabled()) {
      enter(mascot, 60, overshoot = true)
      enter(title, 160)
      enter(subtitle, 220)
      streak?.let { enter(it, 280) }
      enter(primary, 340)
      enter(secondary, 400)
      // The mascot bobs gently once it has settled.
      floatAnimator = ObjectAnimator.ofFloat(mascot, View.TRANSLATION_Y, 0f, -dp(8).toFloat()).apply {
        duration = 1600
        startDelay = 700
        repeatMode = ValueAnimator.REVERSE
        repeatCount = ValueAnimator.INFINITE
        start()
      }
    }
    return container
  }

  private fun spaced(top: Int, fill: Boolean = false) =
    LinearLayout.LayoutParams(
      if (fill) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(top) }
}
