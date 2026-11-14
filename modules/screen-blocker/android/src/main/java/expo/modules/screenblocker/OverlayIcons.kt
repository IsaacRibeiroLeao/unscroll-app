package expo.modules.screenblocker

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable

/** Tiny vector icons for the block screen buttons, drawn on a 24 x 24 grid. */
class OverlayIcon(private val kind: Kind, private val color: Int, private val sizePx: Int) : Drawable() {
  enum class Kind { HOURGLASS, CHEVRON, CIRCLE_X }

  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = this@OverlayIcon.color
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }

  override fun getIntrinsicWidth() = sizePx
  override fun getIntrinsicHeight() = sizePx

  override fun draw(canvas: Canvas) {
    val b = bounds
    canvas.save()
    canvas.translate(b.left.toFloat(), b.top.toFloat())
    val k = minOf(b.width(), b.height()) / 24f
    canvas.scale(k, k)
    when (kind) {
      Kind.HOURGLASS -> {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2.4f
        canvas.drawLine(5f, 3f, 19f, 3f, paint)
        canvas.drawLine(5f, 21f, 19f, 21f, paint)
        paint.style = Paint.Style.FILL
        canvas.drawPath(Path().apply {
          moveTo(7f, 3.5f); lineTo(17f, 3.5f); lineTo(12f, 11.5f); close()
          moveTo(12f, 12.5f); lineTo(17f, 20.5f); lineTo(7f, 20.5f); close()
        }, paint)
      }
      Kind.CHEVRON -> {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 3f
        canvas.drawPath(Path().apply { moveTo(9f, 5f); lineTo(16f, 12f); lineTo(9f, 19f) }, paint)
      }
      Kind.CIRCLE_X -> {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2.2f
        canvas.drawCircle(12f, 12f, 9.5f, paint)
        canvas.drawLine(8.5f, 8.5f, 15.5f, 15.5f, paint)
        canvas.drawLine(15.5f, 8.5f, 8.5f, 15.5f, paint)
      }
    }
    canvas.restore()
  }

  override fun setAlpha(alpha: Int) { paint.alpha = alpha }
  override fun setColorFilter(colorFilter: ColorFilter?) { paint.colorFilter = colorFilter }
  @Deprecated("Deprecated in Java")
  override fun getOpacity() = PixelFormat.TRANSLUCENT
}
