import { Check, Copy, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useBankCardAllowed } from '@/features/geo/useViewerCountry'
import { useTariffs } from '@/features/license/useTariffs'
import {
  BRAND_ASSETS,
  ROUTE_BRANDS,
  WALLET_BRANDS,
  type BrandId,
} from '@/shared/config/brands'
import {
  CONTACT_DISCORD_URL,
  CONTACT_URL,
  CRYPTO_BOT_INVOICE_FEE_USD,
  CRYPTO_BOT_INVOICES,
  CRYPTO_EXCHANGES,
  CRYPTO_NETWORKS,
  FRAGMENT_FEE_PERCENT,
  FRAGMENT_STARS_URL,
  FUNPAY_FEE_PERCENT,
  FUNPAY_OFFERS,
  PAYPAL_EMAIL,
  STAR_WITHDRAW_RATE_USD,
  VIP_BOT_START,
  WALLETS,
  routesForWallet,
  type CheckoutRouteId,
  type WalletId,
} from '@/shared/config/payment'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, buttonStyles, Card } from '@/shared/ui'
import { DiscordIcon, TelegramIcon } from '@/shared/ui/BrandIcons'

function BrandMark({ brand, className }: { brand: BrandId; className?: string }) {
  return (
    <img
      src={BRAND_ASSETS[brand]}
      alt=""
      aria-hidden
      className={cn('size-5 object-contain', className)}
      draggable={false}
    />
  )
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function ExternalLink({ href, children, className }: { href: string; children?: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'font-medium text-accent-300 underline decoration-accent-500/40 underline-offset-2 transition-colors hover:text-accent-200',
        className,
      )}
    >
      {children}
    </a>
  )
}

function CopyRow({
  label,
  value,
  brand,
}: {
  label: string
  value: string
  brand?: BrandId
}) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-ink-900/50 p-3 ring-1 ring-white/6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 text-xs text-fg-subtle">
          {brand ? <BrandMark brand={brand} className="size-4" /> : null}
          {label}
        </p>
        <p className="mt-0.5 break-all font-mono text-[0.8rem] leading-snug text-fg sm:text-sm">{value}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 self-start sm:self-center"
        onClick={() => {
          void copyText(value).then(() => {
            setCopied(true)
            toast.success(t('actions.copied'))
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        {copied ? t('actions.copied') : t('actions.copy')}
      </Button>
    </div>
  )
}

function OfferButtons({ offers }: { offers: readonly { days: number; url: string }[] }) {
  const { t } = useTranslation('vip')

  return (
    <div className="flex flex-wrap gap-2">
      {offers.map((offer) => (
        <a
          key={offer.days}
          href={offer.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500/15 px-3.5 py-2 text-sm font-medium text-accent-200 ring-1 ring-accent-400/35 transition-colors hover:bg-accent-500/25"
        >
          {t('payment.buyDays', { count: offer.days })}
          <ExternalLinkIcon aria-hidden className="size-3.5 opacity-70" />
        </a>
      ))}
    </div>
  )
}

function StarsPrices() {
  const { t } = useTranslation('vip')
  const { data } = useTariffs()

  const rows = (data?.plans ?? [])
    .map((plan) => ({
      days: plan.duration_days,
      stars: plan.telegram_stars_price,
    }))
    .filter((plan): plan is { days: number; stars: number } => typeof plan.stars === 'number')

  if (rows.length === 0) return null

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}
    >
      {rows.map((row) => (
        <div
          key={row.days}
          className="min-w-0 rounded-xl bg-ink-900/50 px-2 py-2.5 text-center ring-1 ring-white/6 sm:px-3"
        >
          <p className="truncate text-[0.65rem] text-fg-subtle sm:text-xs">
            {t('payment.daysShort', { count: row.days })}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg sm:text-lg">
            {row.stars} ⭐
          </p>
        </div>
      ))}
    </div>
  )
}

function FunpayBody({ wallet }: { wallet: WalletId }) {
  const { t } = useTranslation('vip')

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted">{t('payment.routes.funpay.what')}</p>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">{t('payment.routes.funpay.acceptsTitle')}</p>
        <ul className="space-y-2 text-sm text-fg-muted">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-400" />
            {wallet === 'crypto' ? t('payment.routes.funpay.accepts.usdt') : t('payment.routes.funpay.accepts.card')}
          </li>
          {wallet === 'card' ? (
            <>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-400" />
                {t('payment.routes.funpay.accepts.wallets')}
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-400" />
                {t('payment.routes.funpay.accepts.usdt')}
              </li>
            </>
          ) : null}
        </ul>
      </div>

      <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-100/90 ring-1 ring-amber-400/20">
        {t('payment.routes.funpay.fee', { fee: FUNPAY_FEE_PERCENT })}
      </p>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">{t('payment.pickPlan')}</p>
        <OfferButtons offers={FUNPAY_OFFERS} />
      </div>

      <p className="text-sm text-fg-muted">{t('payment.routes.funpay.after')}</p>
      <p className="text-sm text-fg-muted">
        <Trans
          i18nKey="payment.routes.funpay.activate"
          ns="vip"
          components={{
            cabinet: (
              <Link
                to="/dashboard"
                className="font-medium text-accent-300 underline decoration-accent-500/40 underline-offset-2 hover:text-accent-200"
              />
            ),
            bot: <ExternalLink href={VIP_BOT_START.activate} />,
          }}
        />
      </p>
    </div>
  )
}

function StarsBody({ wallet }: { wallet: WalletId }) {
  const { t } = useTranslation('vip')

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted">{t('payment.routes.stars.what')}</p>

      <StarsPrices />

      <p className="text-sm text-fg-muted">
        <Trans
          i18nKey="payment.routes.stars.rate"
          ns="vip"
          values={{ rate: STAR_WITHDRAW_RATE_USD }}
          components={{ b: <span className="font-semibold text-fg" /> }}
        />
      </p>

      {wallet === 'stars' ? null : (
        <p className="text-sm text-fg-muted">{t('payment.routes.stars.buyHint')}</p>
      )}

      <a
        href={VIP_BOT_START.pay}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ size: 'lg' })}
      >
        {t('payment.routes.stars.cta')}
        <ExternalLinkIcon aria-hidden className="size-4" />
      </a>
    </div>
  )
}

function FragmentBody({ wallet }: { wallet: WalletId }) {
  const { t } = useTranslation('vip')
  const { data } = useTariffs()
  const plan = data?.plans.find((item) => item.duration_days === 30) ?? data?.plans[0]
  const stars = plan?.telegram_stars_price
  const example =
    plan && typeof stars === 'number'
      ? {
          days: plan.duration_days,
          vip: plan.price,
          stars,
          cost: Number((plan.price * (1 + FRAGMENT_FEE_PERCENT / 100)).toFixed(2)),
          fee: FRAGMENT_FEE_PERCENT,
        }
      : null

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted">
        {wallet === 'card' ? t('payment.routes.fragment.whatCard') : t('payment.routes.fragment.whatCrypto')}
      </p>

      <StarsPrices />

      <ol className="space-y-3">
        {(wallet === 'card'
          ? (['stepCard1', 'stepCard2', 'stepCard3'] as const)
          : (['stepCrypto1', 'stepCrypto2', 'stepCrypto3'] as const)
        ).map((key, index) => (
          <li key={key} className="flex gap-3 text-sm text-fg-muted">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-200">
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5">
              {key === 'stepCrypto1' ? (
                <Trans
                  i18nKey={`payment.routes.fragment.${key}`}
                  ns="vip"
                  components={{ fragment: <ExternalLink href={FRAGMENT_STARS_URL} /> }}
                />
              ) : key === 'stepCard3' || key === 'stepCrypto3' ? (
                <Trans
                  i18nKey={`payment.routes.fragment.${key}`}
                  ns="vip"
                  components={{ bot: <ExternalLink href={VIP_BOT_START.pay} /> }}
                />
              ) : (
                t(`payment.routes.fragment.${key}`)
              )}
            </span>
          </li>
        ))}
      </ol>

      {example ? (
        <p className="rounded-xl bg-ink-900/50 px-3.5 py-2.5 text-sm text-fg-muted ring-1 ring-white/6">
          <Trans
            i18nKey="payment.routes.fragment.example"
            ns="vip"
            values={example}
            components={{ b: <span className="font-semibold text-fg" /> }}
          />
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {wallet === 'crypto' ? (
          <a
            href={FRAGMENT_STARS_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles()}
          >
            {t('payment.routes.fragment.openFragment')}
            <ExternalLinkIcon aria-hidden className="size-4" />
          </a>
        ) : null}
        <a
          href={VIP_BOT_START.pay}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles({ variant: wallet === 'crypto' ? 'secondary' : 'primary' })}
        >
          {t('payment.routes.fragment.openBot')}
          <ExternalLinkIcon aria-hidden className="size-4" />
        </a>
      </div>
    </div>
  )
}

function CryptoBody() {
  const { t } = useTranslation('vip')

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted">{t('payment.routes.crypto.what')}</p>

      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">{t('payment.routes.crypto.exchanges')}</p>
        {CRYPTO_EXCHANGES.map((item) => (
          <CopyRow key={item.id} label={item.label} value={item.value} brand={item.brand} />
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">{t('payment.routes.crypto.networks')}</p>
        {CRYPTO_NETWORKS.map((network) => (
          <CopyRow
            key={network.id}
            label={`${network.label} (${network.assets})`}
            value={network.address}
            brand={network.brand}
          />
        ))}
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-fg">
          <BrandMark brand="cryptobot" className="size-5" />
          {t('payment.routes.crypto.cryptoBot')}
        </p>
        <p className="text-sm text-fg-muted">
          {t('payment.routes.crypto.cryptoBotFee', { fee: CRYPTO_BOT_INVOICE_FEE_USD })}
        </p>
        <OfferButtons offers={CRYPTO_BOT_INVOICES} />
      </div>

      <p className="text-sm text-fg-muted">
        <Trans
          i18nKey="payment.afterContact"
          ns="vip"
          components={{ contact: <ExternalLink href={CONTACT_URL} /> }}
        />
      </p>
    </div>
  )
}

function ContactDmButtons() {
  const { t } = useTranslation('vip')

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <a
        href={CONTACT_URL}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ fullWidth: true })}
      >
        <TelegramIcon className="size-4" />
        {t('payment.routes.bank.telegram')}
      </a>
      <a
        href={CONTACT_DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ fullWidth: true })}
      >
        <DiscordIcon className="size-4" />
        {t('payment.routes.bank.discord')}
      </a>
    </div>
  )
}

function PaypalBody() {
  const { t } = useTranslation('vip')

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-fg-muted">{t('payment.routes.paypal.what')}</p>
      <CopyRow label="PayPal" value={PAYPAL_EMAIL} />
      <ContactDmButtons />
    </div>
  )
}

function BankBody() {
  const { t } = useTranslation('vip')

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-sm leading-relaxed text-fg-muted">
        <p>{t('payment.routes.bank.dm')}</p>
        <p>{t('payment.routes.bank.dmAfter')}</p>
      </div>
      <ContactDmButtons />
    </div>
  )
}

function RouteBody({ route, wallet }: { route: CheckoutRouteId; wallet: WalletId }) {
  switch (route) {
    case 'funpay':
      return <FunpayBody wallet={wallet} />
    case 'stars':
      return <StarsBody wallet={wallet} />
    case 'fragment':
      return <FragmentBody wallet={wallet} />
    case 'crypto':
      return <CryptoBody />
    case 'paypal':
      return <PaypalBody />
    case 'bank':
      return <BankBody />
  }
}

function routeBadges(route: CheckoutRouteId, feeLabel: string, labels: {
  instant: string
  auto: string
  cheapest: string
  manual: string
  inTelegram: string
}) {
  switch (route) {
    case 'funpay':
      return [
        { tone: 'accent' as const, label: labels.instant },
        { tone: 'neutral' as const, label: feeLabel },
      ]
    case 'stars':
      return [
        { tone: 'accent' as const, label: labels.instant },
        { tone: 'neutral' as const, label: labels.inTelegram },
      ]
    case 'fragment':
      return [
        { tone: 'accent' as const, label: labels.auto },
        { tone: 'neutral' as const, label: feeLabel },
      ]
    case 'crypto':
      return [
        { tone: 'accent' as const, label: labels.cheapest },
        { tone: 'neutral' as const, label: labels.manual },
      ]
    case 'bank':
      return []
    case 'paypal':
      return [
        { tone: 'accent' as const, label: labels.cheapest },
        { tone: 'neutral' as const, label: labels.manual },
      ]
  }
}

export function PaymentSection() {
  const { t } = useTranslation('vip')
  const { allowed: allowBankCard } = useBankCardAllowed()
  const [wallet, setWallet] = useState<WalletId>('card')
  const routes = routesForWallet(wallet, allowBankCard)
  const [route, setRoute] = useState<CheckoutRouteId>(routes[0] ?? 'funpay')
  const showRoutePicker = routes.length > 1

  const selectWallet = (next: WalletId) => {
    const nextRoutes = routesForWallet(next, allowBankCard)
    setWallet(next)
    setRoute(nextRoutes[0] ?? 'stars')
  }

  const badgeLabels = {
    instant: t('payment.badges.instant'),
    auto: t('payment.badges.auto'),
    cheapest: t('payment.badges.cheapest'),
    manual: t('payment.badges.manual'),
    inTelegram: t('payment.badges.inTelegram'),
  }

  const activeRoute = routes.includes(route) ? route : (routes[0] ?? 'stars')

  return (
    <section id="vip-payment" className="scroll-mt-24 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('payment.title')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-snug text-fg-muted line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap sm:text-base">
          {t('payment.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-accent-500/20 text-xs font-semibold text-accent-200">
            1
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight sm:text-lg">{t('payment.step1.title')}</h3>
            <p className="text-sm text-fg-subtle">{t('payment.step1.hint')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {WALLETS.map((id) => {
            const active = wallet === id
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => selectWallet(id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl p-3.5 text-left transition-[background-color,border-color,box-shadow] sm:p-4',
                  active
                    ? 'border border-accent-400/50 bg-accent-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                    : 'border border-white/8 bg-ink-850/80 hover:border-white/15 hover:bg-ink-800',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl',
                    active ? 'bg-accent-500/20' : 'bg-ink-800',
                  )}
                >
                  <BrandMark brand={WALLET_BRANDS[id]} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-fg sm:text-[0.95rem]">
                    {t(`payment.wallets.${id}.title`)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-fg-subtle sm:text-[0.8rem]">
                    {t(`payment.wallets.${id}.hint`)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {showRoutePicker ? (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-accent-500/20 text-xs font-semibold text-accent-200">
              2
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">{t('payment.step2.title')}</h3>
              <p className="text-sm text-fg-subtle">{t('payment.step2.hint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {routes.map((id) => {
              const active = activeRoute === id
              const badges = routeBadges(
                id,
                t('payment.badges.fee', {
                  fee: id === 'funpay' ? FUNPAY_FEE_PERCENT : FRAGMENT_FEE_PERCENT,
                }),
                badgeLabels,
              )
              const fullRow =
                id === 'crypto' || id === 'bank' || (id === 'paypal' && !routes.includes('bank'))
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRoute(id)}
                  className={cn(
                    'flex flex-col gap-2.5 rounded-2xl p-4 text-left transition-[background-color,border-color]',
                    fullRow && 'md:col-span-2',
                    active
                      ? 'border border-accent-400/55 bg-gradient-to-b from-accent-500/15 to-transparent'
                      : 'border border-white/8 bg-ink-850/70 hover:border-white/14 hover:bg-ink-800/90',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'grid size-9 place-items-center rounded-xl',
                        active ? 'bg-accent-500/20' : 'bg-ink-800',
                      )}
                    >
                      <BrandMark brand={ROUTE_BRANDS[id]} />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {badges.map((badge) => (
                        <Badge
                          key={badge.label}
                          tone={badge.tone === 'accent' ? 'accent' : 'neutral'}
                          className="px-2 py-0.5 text-[0.65rem]"
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-fg">{t(`payment.routes.${id}.title`)}</p>
                    <p className="mt-1 text-xs leading-snug text-fg-muted sm:text-sm">
                      {t(`payment.routes.${id}.blurb`)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <Card className="space-y-4 border-accent-500/20 p-4 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
            {t('payment.detailsLabel')}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            {t([`payment.routes.${activeRoute}.detailsTitle`, `payment.routes.${activeRoute}.title`])}
          </h3>
        </div>
        <RouteBody route={activeRoute} wallet={wallet} />
      </Card>
    </section>
  )
}
