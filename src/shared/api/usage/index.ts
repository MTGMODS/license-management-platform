import { request } from '../http'

import type {
  UsagePublicStats,
  UsageQueryParams,
  UsageQueryResult,
  UsageQuerySchema,
} from './types'

/**
 * Single payload backing the whole analytics section. It takes no period
 * parameter: all four windows arrive precomputed, so switching the period is a
 * client-side reselect rather than a refetch. The backend caches it for five
 * minutes with stale-while-revalidate.
 */
export function getUsagePublicStats(signal?: AbortSignal): Promise<UsagePublicStats> {
  return request<UsagePublicStats>({ service: 'usage', path: '/stats/public', signal })
}

/** Capabilities of the Query Builder, as declared by the backend. */
export function getUsageQuerySchema(signal?: AbortSignal): Promise<UsageQuerySchema> {
  return request<UsageQuerySchema>({ service: 'usage', path: '/stats/query/schema', signal })
}

export function runUsageQuery(
  params: UsageQueryParams,
  signal?: AbortSignal,
): Promise<UsageQueryResult> {
  const { metric, ...rest } = params

  return request<UsageQueryResult>({
    service: 'usage',
    path: '/stats/query',
    signal,
    query: {
      ...rest,
      metric: metric?.length ? metric.join(',') : undefined,
    },
  })
}

export * from './types'
