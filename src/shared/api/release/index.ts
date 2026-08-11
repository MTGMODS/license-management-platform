import { FREE_LUA_FALLBACK_URL, RELEASE_MANIFEST_URL } from '@/shared/config/product'
import { NetworkError } from '../errors'

/** Raw shape of `Update.json` as published in the helper repository. */
interface ReleaseManifestPayload {
  current_version?: string
  update_url?: string
  update_info?: string
  vip_current_version?: string
  vip_update_info?: string
}

export interface ReleaseInfo {
  /** Numeric part only, e.g. `1.8.9`. */
  version: string
  /** Full string as published, e.g. `1.8.9 Free`. */
  rawVersion: string
  /** Changelog for this build; may be empty. */
  notes: string
}

export interface ReleaseManifest {
  free: ReleaseInfo
  vip: ReleaseInfo | null
  /** Download URL for the free build, taken from the manifest when present. */
  freeDownloadUrl: string
}

/**
 * The manifest is written by the helper's own tooling and saved in
 * windows-1251, the encoding the Lua script itself uses. `response.json()`
 * always decodes as UTF-8, which would turn every Cyrillic changelog byte into
 * a replacement character, so the bytes are decoded explicitly instead.
 */
function decodeManifest(buffer: ArrayBuffer): string {
  return new TextDecoder('windows-1251').decode(buffer)
}

/** Splits `1.8.9 Free` into its numeric version and drops the edition label. */
function parseVersion(raw: string | undefined): ReleaseInfo | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const match = /^\d+(?:\.\d+)*/.exec(trimmed)

  return {
    version: match?.[0] ?? trimmed,
    rawVersion: trimmed,
    notes: '',
  }
}

export async function fetchReleaseManifest(signal?: AbortSignal): Promise<ReleaseManifest> {
  let response: Response

  try {
    response = await fetch(RELEASE_MANIFEST_URL, { signal, cache: 'no-cache' })
  } catch {
    throw new NetworkError('Release manifest is unreachable')
  }

  if (!response.ok) {
    throw new NetworkError(`Release manifest responded with ${response.status}`)
  }

  const text = decodeManifest(await response.arrayBuffer())

  let payload: ReleaseManifestPayload
  try {
    payload = JSON.parse(text) as ReleaseManifestPayload
  } catch {
    throw new NetworkError('Release manifest is not valid JSON')
  }

  const free = parseVersion(payload.current_version)

  if (!free) {
    throw new NetworkError('Release manifest has no current_version')
  }

  const vip = parseVersion(payload.vip_current_version)

  return {
    free: { ...free, notes: payload.update_info?.trim() ?? '' },
    vip: vip ? { ...vip, notes: payload.vip_update_info?.trim() ?? '' } : null,
    freeDownloadUrl: payload.update_url?.trim() || FREE_LUA_FALLBACK_URL,
  }
}
