package expo.modules.screenblocker

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import java.io.ByteArrayOutputStream

object InstalledApps {
  private const val ICON_PX = 72

  /**
   * Launchable apps only (MAIN/LAUNCHER). Works with a <queries> entry for that intent, so we do not
   * need QUERY_ALL_PACKAGES (restricted by Google Play policy).
   */
  fun list(ctx: Context): List<Map<String, String>> {
    val pm = ctx.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    @Suppress("DEPRECATION")
    val infos = pm.queryIntentActivities(intent, 0)
    return infos
      .filter { it.activityInfo.packageName != ctx.packageName }
      .distinctBy { it.activityInfo.packageName }
      .map { ri ->
        mapOf(
          "packageName" to ri.activityInfo.packageName,
          "label" to ri.loadLabel(pm).toString(),
          "iconBase64" to encodeIcon(ri.loadIcon(pm)),
        )
      }
      .sortedBy { it["label"]!!.lowercase() }
  }

  private fun encodeIcon(drawable: android.graphics.drawable.Drawable): String {
    val bitmap = Bitmap.createBitmap(ICON_PX, ICON_PX, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, ICON_PX, ICON_PX)
    drawable.draw(canvas)
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    bitmap.recycle()
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }
}
