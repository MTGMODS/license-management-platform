import { Navigate, Outlet } from 'react-router'

import { useAuthStore } from '@/features/auth'
import { Skeleton } from '@/shared/ui'

/** Admin-only gate. Nested under RequireAuth, so the session is already known. */
export function RequireAdmin() {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return (
      <div className="shell space-y-4 py-24">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
