package expo.modules.screenblocker

/** In-process bridge from the service to the JS module (only delivers while JS is alive). */
object BlockerEvents {
  @Volatile
  var listener: ((name: String, payload: Map<String, Any?>) -> Unit)? = null

  fun emit(name: String, payload: Map<String, Any?>) {
    try {
      listener?.invoke(name, payload)
    } catch (_: Throwable) {
      // JS side may be gone; the native state is the source of truth.
    }
  }
}
