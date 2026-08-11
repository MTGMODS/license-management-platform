import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/features/auth'
import { ApiError } from '@/shared/api'

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Public analytics are cached for five minutes server-side, so a
        // shorter client window would only produce identical payloads.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // A 4xx is a verdict, not a hiccup; retrying just delays the error
          // state. Auth failures are already handled by the refresh flow.
          if (error instanceof ApiError && error.status < 500) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            closeButton
            toastOptions={{
              classNames: {
                toast: 'glass bevel !border-white/8 !text-fg',
                description: '!text-fg-muted',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
