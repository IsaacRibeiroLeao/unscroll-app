package expo.modules.screenblocker

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import android.view.View

/**
 * Sleeping bear hugging a clock among leaves ("out of time" art). Same geometry as
 * SleepyClockArt in src/presentation/components/art.tsx, drawn on a 240 x 240 grid.
 * Fur colors follow the equipped skin.
 */
class SleepyBearView(context: Context, skin: String) : View(context) {
  private val fur: Int
  private val inner: Int

  init {
    when (skin) {
      "mascot_skin_fire" -> { fur = Color.parseColor("#EE8F5E"); inner = Color.parseColor("#F6BE9C") }
      "mascot_skin_zen" -> { fur = Color.parseColor("#D9CBA3"); inner = Color.parseColor("#EFE6C8") }
      else -> { fur = Color.parseColor("#E9A94F"); inner = Color.parseColor("#F2C98F") }
    }
  }

  private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }
  private val letter = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#5BBF73")
    typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
  }

  private fun f(color: String): Paint = fill.apply { this.color = Color.parseColor(color) }
  private fun f(color: Int): Paint = fill.apply { this.color = color }
  private fun s(color: String, width: Float): Paint = stroke.apply {
    this.color = Color.parseColor(color)
    strokeWidth = width
  }

  /** Absolute-coordinate SVG subset: M L H V C Q Z. Enough for the shapes above. */
  private fun svg(d: String): Path {
    val path = Path()
    val tokens = Regex("[MLHVCQZ]|-?\\d+(?:\\.\\d+)?").findAll(d).map { it.value }.toList()
    var i = 0
    var cmd = 'M'
    var x = 0f
    var y = 0f
    fun num() = tokens[i++].toFloat()
    while (i < tokens.size) {
      val t = tokens[i]
      if (t.length == 1 && t[0].isLetter()) {
        cmd = t[0]
        i++
        if (cmd == 'Z') { path.close(); continue }
      }
      when (cmd) {
        'M' -> { x = num(); y = num(); path.moveTo(x, y); cmd = 'L' }
        'L' -> { x = num(); y = num(); path.lineTo(x, y) }
        'H' -> { x = num(); path.lineTo(x, y) }
        'V' -> { y = num(); path.lineTo(x, y) }
        'C' -> {
          val x1 = num(); val y1 = num(); val x2 = num(); val y2 = num()
          x = num(); y = num()
          path.cubicTo(x1, y1, x2, y2, x, y)
        }
        'Q' -> {
          val x1 = num(); val y1 = num()
          x = num(); y = num()
          path.quadTo(x1, y1, x, y)
        }
        else -> return path
      }
    }
    return path
  }

  private fun star(cx: Float, cy: Float, r: Float): Path {
    val k = r * 0.22f
    return Path().apply {
      moveTo(cx, cy - r)
      quadTo(cx + k, cy - k, cx + r, cy)
      quadTo(cx + k, cy + k, cx, cy + r)
      quadTo(cx - k, cy + k, cx - r, cy)
      quadTo(cx - k, cy - k, cx, cy - r)
      close()
    }
  }

  override fun onDraw(c: Canvas) {
    val scale = minOf(width, height) / 240f
    c.save()
    c.translate((width - 240f * scale) / 2f, (height - 240f * scale) / 2f)
    c.scale(scale, scale)

    val ink = "#2A1A12"
    // leaves + mound
    c.drawPath(svg("M18 150 C30 110 62 100 88 120 C62 120 40 132 30 160 Z"), f("#4FA766"))
    c.drawPath(svg("M222 150 C212 112 184 102 158 122 C182 122 200 134 210 160 Z"), f("#3F9A5E"))
    c.drawPath(svg("M44 120 C40 84 60 66 82 78 C66 86 56 100 56 124 Z"), f("#6CC27F"))
    c.drawPath(svg("M196 118 C200 84 182 66 160 80 C176 88 184 100 184 124 Z"), f("#58B06C"))
    c.drawOval(16f, 164f, 224f, 244f, f("#14492D"))
    c.drawOval(36f, 142f, 204f, 230f, f("#1B6B43"))

    // ears + head
    c.drawCircle(80f, 58f, 19f, f(fur))
    c.drawCircle(160f, 58f, 19f, f(fur))
    c.drawCircle(80f, 58f, 10f, f(inner))
    c.drawCircle(160f, 58f, 10f, f(inner))
    c.drawCircle(120f, 100f, 54f, f(fur))
    c.drawOval(97f, 103f, 143f, 137f, f(inner))
    c.drawOval(112.5f, 104.8f, 127.5f, 115.2f, f(ink))
    c.drawPath(svg("M86 96 Q96 106 106 96"), s(ink, 4f))
    c.drawPath(svg("M134 96 Q144 106 154 96"), s(ink, 4f))
    c.drawPath(svg("M112 130 Q120 124 128 130"), s(ink, 3.4f))

    // clock
    c.drawCircle(120f, 168f, 46f, f("#14522F"))
    c.drawCircle(120f, 168f, 37f, f("#F8E9C4"))
    val tick = s("#14522F", 3.6f)
    c.drawLine(120f, 136f, 120f, 143f, tick)
    c.drawLine(120f, 193f, 120f, 200f, tick)
    c.drawLine(88f, 168f, 95f, 168f, tick)
    c.drawLine(145f, 168f, 152f, 168f, tick)
    c.drawPath(svg("M104 166 L117 178 L140 154"), s("#14522F", 6f))

    // paws
    c.drawCircle(80f, 150f, 15f, f(fur))
    c.drawCircle(160f, 150f, 15f, f(fur))

    // Zzz + sparkles
    letter.textSize = 20f; c.drawText("z", 178f, 72f, letter)
    letter.textSize = 26f; c.drawText("z", 196f, 52f, letter)
    letter.textSize = 32f; c.drawText("z", 212f, 28f, letter)
    c.drawPath(star(38f, 62f, 9f), f("#FFC72C"))
    c.drawPath(star(208f, 106f, 7f), f("#FFC72C"))
    c.restore()
  }
}
