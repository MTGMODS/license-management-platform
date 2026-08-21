/**
 * Values the backend does not serve. The helper video id comes from Vite env
 * so the YouTube link can change without a code edit; screenshots are bundled
 * from `src/assets/screenshots`. VIP prices come from `GET /license/tariffs`.
 */

/**
 * Version manifest published alongside the helper. Served from raw
 * githubusercontent, which sends `Access-Control-Allow-Origin: *`, so the
 * browser may read it directly.
 */
export const RELEASE_MANIFEST_URL =
  'https://raw.githubusercontent.com/MTGMODS/arizona-helper/main/Update.json'

/**
 * Used only if the manifest is unreachable or omits `update_url`. The manifest
 * carries the same link, which keeps the download in step with the version.
 */
export const FREE_LUA_FALLBACK_URL =
  'https://github.com/MTGMODS/arizona-helper/raw/refs/heads/main/Arizona%20Helper.lua'

/**
 * Placeholder path: no installer has been built yet. The download button
 * probes this URL first and reports that the installer is still being prepared
 * rather than navigating the user into a 404 page.
 */
export const PC_INSTALLER_URL = '/helper/download/installer.exe'

/** MonetLoader launchers for mobile auto / manual install. */
export const MONETLOADER_X32_URL =
  'https://github.com/MTGMODS/arz_monetloader/releases/latest'
export const MONETLOADER_X64_URL =
  'https://github.com/idmkdev/arzmod-patcher/releases/latest'

/** Install walkthroughs (YouTube). */
export const PC_MANUAL_GUIDE_URL = 'https://youtu.be/6RGwkuaK_Bg'
export const MOBILE_X32_GUIDE_URL = 'https://youtu.be/mlX6ZzP35mw'
export const MOBILE_X64_GUIDE_URL = 'https://www.youtube.com/watch?v=qh5s5JJrLX8'
export const MOBILE_MANUAL_GUIDE_URL = 'https://www.youtube.com/shorts/cuD9swqlJt4'

export const TELEGRAM_VIP_CHAT_URL = 'https://t.me/+bi-SlBWfG7o3NDgy'
export const DISCORD_SERVER_URL = 'https://discord.gg/qBPEYjfNhv'

function readEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Accepts a bare 11-char id or a youtu.be / watch / embed URL. */
export function parseYoutubeId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^[\w-]{11}$/.test(value)) return value

  try {
    const url = new URL(value)
    if (url.hostname.replace(/^www\./, '') === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    const fromQuery = url.searchParams.get('v')
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery
    const embed = url.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/)
    return embed?.[1] ?? null
  } catch {
    return null
  }
}

/** YouTube id for the gallery and the beginner guide (`VITE_HELPER_VIDEO_URL`). */
export const HELPER_VIDEO_ID: string | null = parseYoutubeId(readEnv('VITE_HELPER_VIDEO_URL'))

/** YouTube poster used in gallery thumbnails. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
