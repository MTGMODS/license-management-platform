/**
 * Opens downloads externally in Telegram Mini Apps, otherwise uses the browser.
 *
 * Deliberately a navigation rather than a fetch. Blob downloads would need
 * the response body in JavaScript, which fails on cross-origin files without
 * CORS and, for single-use links, consumes them before the user gets the file.
 */
export function triggerFileDownload(url: string): void {
  const telegram = window.Telegram?.WebApp
  const isMiniApp = telegram?.initData || (telegram?.platform && telegram.platform !== 'unknown')
  if (isMiniApp && telegram?.openLink) {
    telegram.openLink(url)
    return
  }

  const anchor = document.createElement('a')
  anchor.href = url
  // Honoured for same-origin URLs only; cross-origin downloads rely on the
  // server's Content-Disposition or content type.
  anchor.download = ''
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
