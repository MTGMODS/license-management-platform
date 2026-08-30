import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { DownloadPage } from '@/pages/helper/DownloadPage'
import { HelperPage } from '@/pages/helper/HelperPage'
import { VipPage } from '@/pages/vip/VipPage'
import { Skeleton } from '@/shared/ui'

import { AppLayout } from './AppLayout'
import { RequireAdmin } from './RequireAdmin'
import { RequireAuth } from './RequireAuth'

const AdminPage = lazy(() =>
  import('@/pages/admin/AdminPage').then((module) => ({ default: module.AdminPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const AuthCallbackPage = lazy(() =>
  import('@/pages/login/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/login/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const PromoPage = lazy(() =>
  import('@/pages/promo/PromoPage').then((module) => ({ default: module.PromoPage })),
)
const TermsPage = lazy(() =>
  import('@/pages/terms/TermsPage').then((module) => ({ default: module.TermsPage })),
)

function RouteFallback() {
  return (
    <div className="shell space-y-4 py-16">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Home / bio page stays off until 1.1 — index is the helper landing. */}
          <Route index element={<Navigate to="/helper" replace />} />
          <Route path="helper" element={<HelperPage />} />
          <Route path="helper/download" element={<DownloadPage />} />
          <Route path="vip" element={<VipPage />} />
          <Route path="promo" element={<PromoPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="terms" element={<TermsPage />} />

          <Route element={<RequireAuth />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
