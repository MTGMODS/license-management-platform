import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'

import logo from '@/assets/logo.png'
import { cn } from '@/shared/lib/cn'

import { AccountControl } from './AccountControl'

const NAV_ITEMS = [
  { to: '/helper', labelKey: 'nav.helper' },
  { to: '/vip', labelKey: 'nav.vip' },
  { to: '/promo', labelKey: 'nav.promo' },
] as const

const ACTIVE_UNDERLINE =
  'after:absolute after:inset-x-3 after:-bottom-px after:h-px after:rounded-full ' +
  'after:bg-accent-400 after:shadow-[0_0_10px_1px_var(--color-accent-500)]'

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
    isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
    isActive && ACTIVE_UNDERLINE,
  )
}

export function Header() {
  const { t } = useTranslation('header')
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // A route change from inside the sheet should dismiss it.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-white/5 glass">
      <div className="shell grid h-16 min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold tracking-tight text-fg transition-colors duration-200 hover:text-fg',
              isActive && ACTIVE_UNDERLINE,
            )
          }
        >
          <img src={logo} alt="" width={24} height={24} className="size-6 rounded-sm" aria-hidden />
          MTG MODS
        </NavLink>

        <nav className="hidden justify-center gap-1 md:flex" aria-label={t('nav.label')}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClasses}>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <AccountControl />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="header-mobile-nav"
            aria-label={menuOpen ? t('menu.close') : t('menu.open')}
            className="grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg md:hidden"
          >
            {menuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="header-mobile-nav" className="border-t border-white/5 md:hidden">
          <nav className="shell flex flex-col gap-1 py-3" aria-label={t('nav.label')}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
