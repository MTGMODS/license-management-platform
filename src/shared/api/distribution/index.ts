/**
 * The Distribution Service exposes exactly one browser-facing route:
 * `GET /api/v1/files/downloads/vip/{token}`. It is unauthenticated — the
 * 10-character token in the URL is the only credential — and responds with a
 * binary `FileResponse` carrying `Content-Disposition: attachment`.
 *
 * Two consequences shape the client:
 *
 *  - Never fetch the URL. The backend deletes the file in a background task
 *    right after the first successful response, so a prefetch, a retry or a
 *    React StrictMode double-invoke would consume the single-use link and
 *    leave the user with nothing.
 *  - Never attach the bearer token. The endpoint expects none, and sending
 *    one on a cross-origin request would only add a preflight.
 *
 * So the download is handed to the browser as a plain navigation.
 */
export function triggerFileDownload(url: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  // Honoured for same-origin URLs; cross-origin relies on the backend's
  // Content-Disposition header, which is already set to attachment.
  anchor.download = ''
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
