import { ArrowLeft, Info, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router'

import { useAuthStore, useOAuthSignIn } from '@/features/auth'
import type { OAuthProvider } from '@/shared/api/user'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui'
import { DiscordIcon, TelegramIcon } from '@/shared/ui/BrandIcons'

const PROVIDERS: {
  id: OAuthProvider
  labelKey: 'provider.discord' | 'provider.telegram'
  icon: typeof DiscordIcon
  /** Vendor brand colours, used only on these two buttons. */
  className: string
}[] = [
  {
    id: 'discord',
    labelKey: 'provider.discord',
    icon: DiscordIcon,
    className: 'bg-[#5865F2] hover:bg-[#4752c4] shadow-[0_10px_30px_-12px_#5865F2]',
  },
  {
    id: 'telegram',
    labelKey: 'provider.telegram',
    icon: TelegramIcon,
    className: 'bg-[#229ED9] hover:bg-[#1c86b8] shadow-[0_10px_30px_-12px_#229ED9]',
  },
]

export function LoginPage() {
  const { t } = useTranslation(['login', 'common'])
  const status = useAuthStore((state) => state.status)
  const { pendingProvider, signIn } = useOAuthSignIn()

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="shell flex flex-col items-center py-16 sm:py-24">
      {/* The brief opens with a deliberate off-ramp: most visitors do not need
          an account at all, and saying so up front prevents pointless sign-ups. */}
      <div className="mb-10 max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('login:warning.title')}
        </h1>
        <p className="mt-4 leading-relaxed text-fg-muted">{t('login:warning.body')}</p>
        <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-ink-850 px-3 py-2 text-sm text-fg-subtle">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('login:warning.note')}
        </p>
      </div>

      <Card className="w-full max-w-md p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">{t('login:card.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('login:card.subtitle')}</p>

        <div className="mt-7 flex flex-col gap-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon
            const busy = pendingProvider === provider.id
            const otherBusy = pendingProvider !== null && !busy

            return (
              <button
                key={provider.id}
                type="button"
                disabled={pendingProvider !== null}
                aria-busy={busy || undefined}
                onClick={() => void signIn(provider.id)}
                className={cn(
                  'inline-flex h-13 items-center justify-center gap-3 rounded-xl px-6',
                  'font-medium text-white transition-all duration-200 ease-out-soft',
                  'active:translate-y-px disabled:pointer-events-none',
                  otherBusy ? 'opacity-40' : 'opacity-100',
                  provider.className,
                )}
              >
                {busy ? (
                  <Loader2 aria-hidden className="size-5 animate-spin" />
                ) : (
                  <Icon className="size-5" />
                )}
                {busy ? t('login:provider.pending') : t(`login:${provider.labelKey}`)}
              </button>
            )
          })}
        </div>
      </Card>

      <Link
        to="/helper"
        className="mt-8 inline-flex items-center gap-2 text-sm text-fg-subtle transition-colors hover:text-fg-muted"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t('login:back')}
      </Link>
    </div>
  )
}
