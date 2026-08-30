import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

import { GITHUB_ORG_URL } from '@/shared/config/profile'
import { Header } from '@/widgets/header/Header'

import { usePageMeta } from './usePageMeta'

/**
 * Fixed ambient wash behind the page. Two off-screen radial pools keep large
 * dark surfaces from reading as flat grey, and a faint grid adds the technical
 * texture the brief asks for without competing with content.
 */
function BackgroundAmbience() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-clip">
      <div className="absolute -top-40 left-0 size-[36rem] rounded-full bg-accent-600/14 blur-[120px] animate-pulse-glow" />
      <div className="absolute top-1/3 right-0 size-[32rem] translate-x-1/4 rounded-full bg-aqua-500/10 blur-[130px] animate-pulse-glow [animation-delay:1.5s]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
        }}
      />
    </div>
  )
}

function Footer() {
  const { t } = useTranslation('common')

  return (
    <footer className="mt-8 border-t border-white/5 py-6">
      <div className="shell flex flex-col items-center justify-between gap-3 text-sm text-fg-subtle sm:flex-row">
        <span>© {new Date().getFullYear()} {t('brand')}</span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/terms" className="transition-colors hover:text-fg-muted">
            {t('footer.terms')}
          </Link>
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-fg-muted"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

export function AppLayout() {
  const { t } = useTranslation('header')
  usePageMeta()

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <BackgroundAmbience />

      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-60 focus:rounded-lg focus:bg-ink-800 focus:px-4 focus:py-2 focus:text-sm"
      >
        {t('skipToContent')}
      </a>

      <Header />

      <main id="content" className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
