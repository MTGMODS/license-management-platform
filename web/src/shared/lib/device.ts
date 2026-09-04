export type DeviceKind = 'pc' | 'mobile'

interface UserAgentDataLike {
  mobile?: boolean
}

/**
 * Detects the platform to pick an install flow. `userAgentData.mobile` is the
 * reliable signal where available; the UA string is the fallback, matched
 * loosely because SAMP players arrive from a wide range of mobile browsers.
 */
export function detectDevice(): DeviceKind {
  const uaData = (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData

  if (typeof uaData?.mobile === 'boolean') {
    return uaData.mobile ? 'mobile' : 'pc'
  }

  return /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent)
    ? 'mobile'
    : 'pc'
}
