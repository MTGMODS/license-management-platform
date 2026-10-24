import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { triggerFileDownload } from '../src/shared/lib/download'
import { PC_INSTALLER_URL } from '../src/shared/config/product'

const url = 'https://api.example.com/v1/files/downloads/vip/0123456789'
let click: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  delete window.Telegram
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  delete window.Telegram
  vi.restoreAllMocks()
})

function telegram(overrides: Partial<NonNullable<Window['Telegram']>['WebApp']> = {}) {
  const app = {
    initData: '', platform: 'android', ready: vi.fn(), expand: vi.fn(), openLink: vi.fn(),
    ...overrides,
  }
  window.Telegram = { WebApp: app }
  return app
}

it('keeps the existing browser download and removes the temporary anchor', () => {
  click.mockImplementation(function (this: HTMLAnchorElement) {
    expect(document.body.contains(this)).toBe(true)
  })

  triggerFileDownload(url)

  const anchor = click.mock.contexts[0] as HTMLAnchorElement
  expect(click).toHaveBeenCalledTimes(1)
  expect(anchor.href).toBe(url)
  expect(anchor.download).toBe('')
  expect(anchor.rel).toBe('noopener')
  expect(anchor.isConnected).toBe(false)
})

it('downloads the free installer from the public website instead of Distribution or GitHub', () => {
  expect(PC_INSTALLER_URL).toBe('https://mtgmods.com/helper/download/installer')
  triggerFileDownload(PC_INSTALLER_URL)
  const anchor = click.mock.contexts[0] as HTMLAnchorElement
  expect(anchor.href).toBe(PC_INSTALLER_URL)
  expect(click).toHaveBeenCalledTimes(1)
})

it.each(['android', 'ios', 'tdesktop'])('uses openLink in a %s Mini App without starting another download', (platform) => {
  const app = telegram({ platform })

  triggerFileDownload(url)

  expect(app.openLink).toHaveBeenCalledExactlyOnceWith(url)
  expect(click).not.toHaveBeenCalled()
})

it('recognizes a Mini App by initData when platform is unavailable', () => {
  const app = telegram({ platform: undefined, initData: 'query_id=test' })

  triggerFileDownload(url)

  expect(app.openLink).toHaveBeenCalledExactlyOnceWith(url)
  expect(click).not.toHaveBeenCalled()
})

it('does not treat the SDK alone in a regular browser as a Mini App', () => {
  const app = telegram({ platform: 'unknown' })

  triggerFileDownload(url)

  expect(app.openLink).not.toHaveBeenCalled()
  expect(click).toHaveBeenCalledTimes(1)
})

it('keeps the browser fallback when openLink is unavailable', () => {
  telegram({ openLink: undefined })

  triggerFileDownload(url)

  expect(click).toHaveBeenCalledTimes(1)
})

it('does not retry a single-use URL through an anchor if openLink throws', () => {
  telegram({ openLink: vi.fn(() => { throw new Error('Telegram bridge error') }) })

  expect(() => triggerFileDownload(url)).toThrow('Telegram bridge error')
  expect(click).not.toHaveBeenCalled()
})
