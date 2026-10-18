import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'

import { AppLayout } from '../src/app/AppLayout'

vi.mock('@/widgets/header/Header', () => ({ Header: () => null }))
vi.mock('@/app/usePageMeta', () => ({ usePageMeta: () => {} }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key === 'brand' ? 'MTG MODS' : key }),
}))

it.each([2026, 2027])('starts the copyright at 2023 and keeps the end year dynamic (%s)', (year) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${year}-10-19T12:00:00Z`))
  render(<MemoryRouter><AppLayout /></MemoryRouter>)
  const link = within(screen.getByRole('contentinfo')).getByRole('link', { name: `© 2023–${year} MTG MODS` })
  expect(link.getAttribute('href')).toBe('/')
})
