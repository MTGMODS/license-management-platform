import { STATS_REQUEST_TIMEOUT_MS, STATS_RETRY_TIMEOUT_MS } from './config'
import { ApiError } from './errors'
import { request, type RequestConfig } from './http'

/** One bounded retry; each new load/refetch starts with the full first-attempt budget. */
export async function requestPublicStats<T>(config: Pick<RequestConfig, 'service' | 'path' | 'signal'>): Promise<T> {
  try {
    return await request<T>({ ...config, timeoutMs: STATS_REQUEST_TIMEOUT_MS })
  } catch (error) {
    if (config.signal?.aborted || (error instanceof ApiError && error.status < 500)) throw error
    return request<T>({ ...config, timeoutMs: STATS_RETRY_TIMEOUT_MS })
  }
}
