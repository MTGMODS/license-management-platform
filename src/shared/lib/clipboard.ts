/**
 * Hands a string to the clipboard. Returns false when the browser refuses
 * (permissions, HTTP, embedded webviews) instead of rejecting.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
