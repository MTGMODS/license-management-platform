import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router'

import { cn } from '@/shared/lib/cn'

import { AccountControl } from './AccountControl'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV_ITEMS = [
  { to: '/helper', labelKey: 'nav.helper' },
  { to: '/vip', labelKey: 'nav.vip' },
] as const

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
    isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
    // A short accent underline marks the active section without the shouty
    // neon the brief warns against.
    isActive &&
      'after:absolute after:inset-x-3 after:-bottom-px after:h-px after:rounded-full ' +
        'after:bg-accent-400 after:shadow-[0_0_10px_1px_var(--color-accent-500)]',
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
    <header className="sticky top-0 z-50 border-b border-white/5 glass">
      <div className="shell grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link
          to="/"
          className="text-base font-semibold tracking-tight text-fg transition-opacity hover:opacity-80"
        >
          MTG<span className="text-accent-400"> MODS</span>
        </Link>

        <nav className="hidden justify-center gap-1 md:flex" aria-label={t('nav.helper')}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClasses}>
              {t(item.labelKey)}
            </NavLink>
          ))}
          {/* Third slot is reserved by the brief but has no destination yet. */}
          <span
            aria-disabled
            className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium text-fg-subtle/60"
          >
            {t('nav.more')}
          </span>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
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
          <nav className="shell flex flex-col gap-1 py-3">
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
            <LanguageSwitcher className="mt-2 self-start sm:hidden" />
          </nav>
        </div>
      ) : null}
    </header>
  )
}
