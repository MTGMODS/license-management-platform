import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '../src/features/auth/authStore'
import { resources } from '../src/i18n/resources'
import { UsersPanel } from '../src/pages/admin/UsersPanel'
import { DashboardPage } from '../src/pages/dashboard/DashboardPage'
import type { LicenseInfo } from '../src/shared/api/license'
import type { User } from '../src/shared/api/user'

const mocks = vi.hoisted(() => ({ unlink: vi.fn(), update: vi.fn(), copy: vi.fn() }))
const user: User = { id: 42, nickname: 'Tester', role: 'USER', status: 'ACTIVE', telegram_id: '123', discord_id: '456', avatar_url: null, created_at: null }
const info: LicenseInfo = {
  license: { id: 7, user_id: 42, key: 'A7K2-P9M4-X3R8-T6V1', status: 'EXPIRED', duration_days: 30, max_devices: 1, reset_limit: 0, activated_at: null, expires_at: null },
  devices: [], transaction: null,
}
vi.mock('@/shared/api/user', async importOriginal => ({ ...await importOriginal<typeof import('../src/shared/api/user')>(), unlinkSocialAccount: mocks.unlink }))
vi.mock('@/shared/lib/clipboard', () => ({ copyText: mocks.copy }))
vi.mock('@/features/auth/useOAuthSignIn', () => ({ useOAuthSignIn: () => ({ pendingProvider: null, blockedProvider: null, link: vi.fn() }) }))
vi.mock('@/features/license/useLicense', async importOriginal => ({
  ...await importOriginal<typeof import('../src/features/license/useLicense')>(),
  useLicenseInfo: () => ({ data: info, isPending: false, isError: false }),
  useLicenseHistory: () => ({ data: [], isPending: false, isError: false }),
}))
vi.mock('@/features/admin/useAdmin', () => ({
  useAdminUserSearch: () => ({ data: [user], isPending: false, isError: false }),
  useUpdateAdminUser: () => ({ mutateAsync: mocks.update, isPending: false }),
}))
const i18n = createInstance()
await i18n.init({ lng: 'ru', resources })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', user })
  mocks.unlink.mockResolvedValue({ ...user, telegram_id: null, discord_id: null })
  mocks.update.mockResolvedValue(user)
  mocks.copy.mockResolvedValue(true)
})

function renderPage(admin = false) {
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          {admin ? <UsersPanel initialUserId={42} onConsumedInitialUserId={() => {}} onOpenLicenses={() => {}} /> : <DashboardPage />}
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

it.each(['telegram', 'discord'] as const)('requires confirmation before unlinking %s in the account', async provider => {
  renderPage()
  fireEvent.click(screen.getByRole('button', { name: 'Аккаунт' }))
  const index = provider === 'telegram' ? 0 : 1
  fireEvent.click(screen.getAllByRole('button', { name: 'Отвязать' })[index]!)
  expect(mocks.unlink).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
  expect(mocks.unlink).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Отвязать' })[index]!)
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
  await waitFor(() => expect(mocks.unlink).toHaveBeenCalledExactlyOnceWith(provider))
})

it.each(['telegram_id', 'discord_id'] as const)('requires confirmation before unlinking %s in admin', async field => {
  renderPage(true)
  const index = field === 'telegram_id' ? 0 : 1
  fireEvent.click(screen.getAllByRole('button', { name: 'Отвязать' })[index]!)
  expect(mocks.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
  expect(mocks.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Отвязать' })[index]!)
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
  await waitFor(() => expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ userId: 42, payload: { [field]: null } }))
})

it('copies the full key while keeping it hidden and puts copy before reveal', async () => {
  renderPage()
  expect(screen.queryByText(info.license.key)).toBeNull()
  const copy = screen.getByRole('button', { name: 'Скопировать ключ' })
  const reveal = screen.getByRole('button', { name: 'Показать ключ' })
  expect(copy.compareDocumentPosition(reveal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(copy)
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledExactlyOnceWith(info.license.key))
  expect(screen.queryByText(info.license.key)).toBeNull()
  fireEvent.click(reveal)
  expect(screen.getByText(info.license.key)).toBeTruthy()
})
