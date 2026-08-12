import { request } from '../http'

import type { UsagePublicStats } from './types'

/**
 * Single payload backing the whole analytics section. All four period windows
 * arrive precomputed, so switching the period is a client-side reselect rather
 * than a refetch. The backend caches it for five minutes with stale-while-revalidate.
 */
export function getUsagePublicStats(signal?: AbortSignal): Promise<UsagePublicStats> {
  return request<UsagePublicStats>({ service: 'usage', path: '/stats/public', signal })
}

export * from './types'
