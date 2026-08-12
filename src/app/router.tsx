import { Route, Routes } from 'react-router'

import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DownloadPage } from '@/pages/helper/DownloadPage'
import { HelperPage } from '@/pages/helper/HelperPage'
import { HomePage } from '@/pages/home/HomePage'
import { LoginPage } from '@/pages/login/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { TermsPage } from '@/pages/terms/TermsPage'
import { VipPage } from '@/pages/vip/VipPage'

import { AppLayout } from './AppLayout'
import { RequireAuth } from './RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="helper" element={<HelperPage />} />
        <Route path="helper/download" element={<DownloadPage />} />
        <Route path="vip" element={<VipPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="terms" element={<TermsPage />} />

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
