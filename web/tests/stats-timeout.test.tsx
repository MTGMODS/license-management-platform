import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { useSalesStats } from '../src/features/license/useSalesStats'
import { useOldSalesStats } from '../src/features/license/useOldSalesStats'
import { usePublicStats } from '../src/features/usage/usePublicStats'
import { request } from '../src/shared/api/http'
import { ApiError, TimeoutError } from '../src/shared/api/errors'
import { requestPublicStats } from '../src/shared/api/publicStats'

vi.mock('../src/shared/api/http', () => ({ request: vi.fn() }))

afterEach(() => vi.useRealTimers())

it.each([
  ['usage', usePublicStats, '/stats/public'],
  ['license', useSalesStats, '/stats/public'],
  ['legacy', useOldSalesStats, '/stats/old'],
] as const)('%s statistics retry after two seconds and stop loading after three seconds total', async (_, useStats, path) => {
  vi.useFakeTimers()
  vi.mocked(request).mockReset().mockImplementation(({ timeoutMs }) =>
    new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeoutMs)),
  )
  // Even a client-wide retry default must not extend the public stats wait.
  const client = new QueryClient({ defaultOptions: { queries: { retry: 2 } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, unmount } = renderHook(() => useStats(), { wrapper })
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ path, timeoutMs: 2_000 }))
  await act(async () => { await vi.advanceTimersByTimeAsync(1_999) })
  expect(result.current.isPending).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(2) })
  expect(result.current.isPending).toBe(true)
  expect(request).toHaveBeenCalledTimes(2)
  expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ path, timeoutMs: 1_000 }))
  await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
  expect(result.current.isError).toBe(true)
  expect(result.current.isFetching).toBe(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(request).toHaveBeenCalledTimes(2)
  unmount()
  client.clear()
})

it('returns a successful retry instead of showing an error', async () => {
  vi.mocked(request).mockReset().mockRejectedValueOnce(new TimeoutError()).mockResolvedValueOnce({ total: 42 })
  await expect(requestPublicStats({ service: 'usage', path: '/stats/public' })).resolves.toEqual({ total: 42 })
  expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({ timeoutMs: 2_000 }))
  expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({ timeoutMs: 1_000 }))
})

it('does not retry explicit client errors or cancelled requests', async () => {
  const forbidden = new ApiError({ status: 403, code: null, message: 'Forbidden' })
  vi.mocked(request).mockReset().mockRejectedValueOnce(forbidden)
  await expect(requestPublicStats({ service: 'license', path: '/stats/old' })).rejects.toBe(forbidden)
  expect(request).toHaveBeenCalledTimes(1)

  const controller = new AbortController()
  controller.abort()
  vi.mocked(request).mockReset().mockRejectedValueOnce(controller.signal.reason)
  await expect(requestPublicStats({ service: 'usage', path: '/stats/public', signal: controller.signal }))
    .rejects.toBe(controller.signal.reason)
  expect(request).toHaveBeenCalledTimes(1)
})
