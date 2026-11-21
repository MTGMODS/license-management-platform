import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '../src/features/auth/authStore'
import { resources } from '../src/i18n/resources'
import { DashboardPage } from '../src/pages/dashboard/DashboardPage'
import type { LicenseInfo } from '../src/shared/api/license'
import { GameAccountCard } from '../src/widgets/dashboard/GameAccountCard'

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), remove: vi.fn(), getLicense: vi.fn() }))
vi.mock('@/shared/api/license', async importOriginal => ({
  ...await importOriginal<typeof import('../src/shared/api/license')>(),
  getGameAccount: mocks.get, saveGameAccount: mocks.save, deleteGameAccount: mocks.remove,
  getLicenseInfo: mocks.getLicense, getLicenseHistory: async () => [],
}))
const i18n = createInstance()
await i18n.init({ lng: 'ru', resources })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', user: { id: 42, nickname: 'Tester', role: 'USER', status: 'ACTIVE', telegram_id: null, discord_id: '123', avatar_url: null, created_at: null } })
  mocks.get.mockResolvedValue(null)
  mocks.save.mockImplementation(async value => value)
  mocks.remove.mockResolvedValue(undefined)
  mocks.getLicense.mockResolvedValue(null)
})

function show(component = <GameAccountCard />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{component}</MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

const activeLicense: LicenseInfo = {
  license: { id: 1, user_id: 42, key: '', status: 'ACTIVE', duration_days: null, max_devices: 1, reset_limit: 0, activated_at: null, expires_at: null },
  devices: [], transaction: null,
}

it('puts the game account between MTGVIP and Account for active VIP', async () => {
  mocks.getLicense.mockResolvedValue(activeLicense)
  show(<DashboardPage />)
  const gameTab = await screen.findByRole('button', { name: 'Игра' })
  const vipTab = screen.getByRole('button', { name: 'MTGVIP' })
  const accountTab = screen.getByRole('button', { name: 'Аккаунт' })
  expect(vipTab.nextElementSibling).toBe(gameTab)
  expect(gameTab.nextElementSibling).toBe(accountTab)
  fireEvent.click(gameTab)
  expect(screen.getByRole('heading', { name: 'Игровой аккаунт' })).toBeTruthy()
  expect(await screen.findByLabelText('Игровой никнейм')).toBeTruthy()
  expect(screen.getByText('Если укажете, они станут публичными!')).toBeTruthy()
  fireEvent.click(accountTab)
  expect(screen.queryByLabelText('Игровой никнейм')).toBeNull()
})

it.each([null, { ...activeLicense, license: { ...activeLicense.license, expires_at: '2000-01-01T00:00:00Z' } }])(
  'hides the game account without a valid VIP license',
  async license => {
    mocks.getLicense.mockResolvedValue(license)
    show(<DashboardPage />)
    await screen.findByRole('heading', { name: i18n.t('dashboard:activate.title') })
    expect(screen.queryByRole('button', { name: 'Игра' })).toBeNull()
    expect(mocks.get).not.toHaveBeenCalled()
  },
)

it('offers only servers below 200 and preserves an old nickname for reassignment', async () => {
  mocks.get.mockResolvedValue({ server_id: 301, nickname: 'Test_Player' })
  show()
  const server = await screen.findByLabelText<HTMLSelectElement>('Сервер')
  expect(server.value).toBe('0')
  expect([...server.options].map(option => Number(option.value))).toEqual([
    0, ...Array.from({ length: 33 }, (_, i) => i + 1), 101, 102, 103,
  ])
  expect(screen.getByLabelText<HTMLInputElement>('Игровой никнейм').value).toBe('Test_Player')
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить' }).disabled).toBe(true)
})

it('saves and removes a game account with a public-format preview', async () => {
  show()
  const server = await screen.findByLabelText('Сервер')
  fireEvent.change(server, { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('Игровой никнейм'), { target: { value: 'Test_Player' } })
  expect(screen.getByText('[20]Test_Player')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ server_id: 20, nickname: 'Test_Player' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Удалить из списка' }))
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce())
  await waitFor(() => expect((screen.getByLabelText('Игровой никнейм') as HTMLInputElement).value).toBe(''))
})

it('disables saving malformed nicknames and unchanged accounts', async () => {
  mocks.get.mockResolvedValue({ server_id: 20, nickname: 'Test_Player' })
  show()
  const nickname = await screen.findByLabelText('Игровой никнейм')
  expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(nickname, { target: { value: '[1]Fake' } })
  expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(true)
  expect(mocks.save).not.toHaveBeenCalled()
})

it('offers retry after a failed load instead of showing an empty editable account', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline'))
  show()
  expect(await screen.findByText('Не удалось загрузить игровой аккаунт')).toBeTruthy()
  expect(screen.queryByLabelText('Игровой никнейм')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(await screen.findByLabelText('Игровой никнейм')).toBeTruthy()
})

it('accepts 50-character nicknames and rejects longer values', async () => {
  show()
  fireEvent.change(await screen.findByLabelText('Сервер'), { target: { value: '20' } })
  const nickname = screen.getByLabelText('Игровой никнейм') as HTMLInputElement
  expect(nickname.maxLength).toBe(50)
  fireEvent.change(nickname, { target: { value: 'A'.repeat(51) } })
  expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(nickname, { target: { value: 'A'.repeat(50) } })
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ server_id: 20, nickname: 'A'.repeat(50) }))
})
