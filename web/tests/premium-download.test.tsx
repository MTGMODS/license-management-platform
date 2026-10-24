import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import ru from '../src/i18n/locales/ru/dashboard.json'
import uk from '../src/i18n/locales/uk/dashboard.json'
import { PremiumDownloadButton } from '../src/widgets/dashboard/PremiumDownloadButton'

const mocks = vi.hoisted(() => ({ generate: vi.fn(), download: vi.fn(), success: vi.fn(), error: vi.fn() }))
const url = 'https://api.example.com/v1/files/downloads/vip/abcdef1234'
vi.mock('@/features/license/useLicense', () => ({ usePremiumDownload: () => ({ mutateAsync: mocks.generate, isPending: false }) }))
vi.mock('@/features/release/useRelease', () => ({ useRelease: () => ({ data: { vip: { version: '1.9' } } }) }))
vi.mock('@/shared/lib/download', () => ({ triggerFileDownload: mocks.download }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }))

const i18n = createInstance()
await i18n.init({ lng: 'ru', defaultNS: 'dashboard', resources: { ru: { dashboard: ru }, uk: { dashboard: uk } } })

beforeEach(async () => {
  vi.clearAllMocks()
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  mocks.generate.mockResolvedValue({ download_url: url })
  await i18n.changeLanguage('ru')
})
afterEach(() => { vi.restoreAllMocks() })

function renderButton() {
  return render(<I18nextProvider i18n={i18n}><PremiumDownloadButton /></I18nextProvider>)
}
async function openChoice() {
  fireEvent.click(screen.getByRole('button', { name: ru.download.actionVersion.replace('{{version}}', '1.9') }))
  return screen.findByRole('dialog')
}

it.each([false, true])('offers a Windows choice after generation and downloads installer=%s with the same token', async installer => {
  renderButton()
  const dialog = await openChoice()
  const options = within(dialog).getAllByRole('button').filter(button => button.getAttribute('aria-label') !== ru.download.close)
  expect(options[0]?.textContent).toContain(ru.download.installerTitle)
  expect(options[0]?.className).toContain('border-accent-400/40')
  expect(options[1]?.textContent).toContain(ru.download.luaTitle)
  expect(within(dialog).getByText(ru.download.chooseHint)).toBeTruthy()
  expect(mocks.generate).toHaveBeenCalledTimes(1)
  expect(mocks.download).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: new RegExp(installer ? ru.download.installerTitle : ru.download.luaTitle) }))
  expect(mocks.download).toHaveBeenCalledExactlyOnceWith(url + (installer ? '.exe' : ''))
  expect(mocks.generate).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe('')
})

it.each(['Mozilla/5.0 (Linux; Android 14) Mobile', 'Mozilla/5.0 (iPhone)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)'])('keeps direct Lua download on %s', async ua => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
  renderButton()
  fireEvent.click(screen.getByRole('button', { name: /Скачать версию/ }))
  await waitFor(() => expect(mocks.download).toHaveBeenCalledExactlyOnceWith(url))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('does not consume the link when the Windows dialog is dismissed and restores focus', async () => {
  renderButton()
  const trigger = screen.getByRole('button', { name: /Скачать версию/ })
  trigger.focus()
  await openChoice()
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(mocks.download).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(trigger)
})

it('reports generation failure without opening a choice or downloading', async () => {
  mocks.generate.mockRejectedValue(new Error('offline'))
  renderButton()
  fireEvent.click(screen.getByRole('button', { name: /Скачать версию/ }))
  await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1))
  expect(mocks.download).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps the choice open if handing the URL to Telegram fails', async () => {
  mocks.download.mockImplementationOnce(() => { throw new Error('Telegram bridge') })
  renderButton()
  await openChoice()
  fireEvent.click(screen.getByRole('button', { name: /Автоматическая установка/ }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(mocks.error).toHaveBeenCalledTimes(1)
  expect(mocks.success).not.toHaveBeenCalled()
})

it('provides Ukrainian descriptions for both formats', async () => {
  await act(() => i18n.changeLanguage('uk'))
  renderButton()
  fireEvent.click(screen.getByRole('button', { name: /Завантажити версію/ }))
  await screen.findByRole('dialog', { name: uk.download.chooseTitle })
  expect(screen.getByText(uk.download.luaTitle)).toBeTruthy()
  expect(screen.getByText(uk.download.installerTitle)).toBeTruthy()
})
