import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '../src/features/auth/authStore'
import { resources } from '../src/i18n/resources'
import { GameAccountCard } from '../src/widgets/dashboard/GameAccountCard'

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), remove: vi.fn() }))
vi.mock('@/shared/api/license', async importOriginal => ({
  ...await importOriginal<typeof import('../src/shared/api/license')>(),
  getGameAccount: mocks.get, saveGameAccount: mocks.save, deleteGameAccount: mocks.remove,
}))
const i18n = createInstance()
await i18n.init({ lng: 'ru', resources })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', user: { id: 42, nickname: 'Tester', role: 'USER', status: 'ACTIVE', telegram_id: null, discord_id: '123', avatar_url: null, created_at: null } })
  mocks.get.mockResolvedValue(null)
  mocks.save.mockImplementation(async value => value)
  mocks.remove.mockResolvedValue(undefined)
})

function show() {
  return render(<I18nextProvider i18n={i18n}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><GameAccountCard /></QueryClientProvider></I18nextProvider>)
}

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
