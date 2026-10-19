import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { useSalesStats } from '../src/features/license/useSalesStats'
import { useOldSalesStats } from '../src/features/license/useOldSalesStats'
import { usePublicStats } from '../src/features/usage/usePublicStats'
import { request } from '../src/shared/api/http'
import { TimeoutError } from '../src/shared/api/errors'

vi.mock('../src/shared/api/http', () => ({ request: vi.fn() }))

afterEach(() => vi.useRealTimers())

it.each([
  ['usage', usePublicStats, '/stats/public'],
  ['license', useSalesStats, '/stats/public'],
  ['legacy', useOldSalesStats, '/stats/old'],
] as const)('%s statistics stop loading after two seconds without an automatic retry', async (_, useStats, path) => {
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
  expect(result.current.isError).toBe(true)
  expect(result.current.isFetching).toBe(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(request).toHaveBeenCalledTimes(1)
  unmount()
  client.clear()
})
