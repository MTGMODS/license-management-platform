import { Navigate, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth'
import { ErrorState, Skeleton } from '@/shared/ui'

/**
 * Gate for authenticated-only routes. While the stored session is still being
 * validated the route renders a placeholder rather than redirecting, otherwise
 * a returning user would be bounced to /login on every hard refresh.
 */
export function RequireAuth() {
  const { t } = useTranslation('common')
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const bootstrap = useAuthStore((state) => state.bootstrap)

  if (status === 'initialising') {
    return (
      <div className="shell space-y-4 py-24">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return (
      <div className="shell py-16">
        <ErrorState
          title={t('state.error')}
          description={t('state.errorHint')}
          onRetry={() => void bootstrap()}
        />
      </div>
    )
  }

  return <Outlet />
}
