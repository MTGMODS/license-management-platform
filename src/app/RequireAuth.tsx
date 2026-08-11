import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuthStore } from '@/features/auth'
import { Skeleton } from '@/shared/ui'

/**
 * Gate for authenticated-only routes. While the stored session is still being
 * validated the route renders a placeholder rather than redirecting, otherwise
 * a returning user would be bounced to /login on every hard refresh.
 */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'initialising') {
    return (
      <div className="shell space-y-4 py-24">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
