/**
 * Hands a URL to the browser as a download.
 *
 * Deliberately a navigation rather than a fetch. Blob downloads would need
 * the response body in JavaScript, which fails on cross-origin files without
 * CORS and, for single-use links, consumes them before the user gets the file.
 */
export function triggerFileDownload(url: string): void {
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
