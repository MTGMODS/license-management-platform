import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/features/auth'
import { queryClient } from '@/shared/api/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
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
