/**
 * Checks whether the PC installer actually exists before sending the user to
 * it. No installer has been built yet, so the configured path is a
 * placeholder: navigating straight there would drop the user on a 404 page
 * instead of showing a friendly message.
 */
export async function isInstallerAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })

    if (!response.ok) return false

    // A single-page app serves index.html for unknown paths, so a 200 alone
    // does not prove a binary is there.
    const contentType = response.headers.get('content-type') ?? ''
    return !contentType.includes('text/html')
  } catch {
    return false
  }
}
