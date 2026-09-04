import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { copyText } from '@/shared/lib/clipboard'
import { Badge, Button, buttonStyles } from '@/shared/ui'

export function PromoBackLink({ label }: { label: string }) {
  return (
    <Link
      to="/promo"
      className="text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
    >
      ← {label}
    </Link>
  )
}

export function PromoSectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead: string
}) {
  return (
    <div className="max-w-3xl">
      <Badge tone="accent" className="px-2 py-0.5 text-[0.7rem] font-medium normal-case tracking-normal">
        {eyebrow}
      </Badge>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{lead}</p>
    </div>
  )
}

export function PromoSteps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-200">
            {index + 1}
          </span>
          <span className="min-w-0 pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  )
}

export function PromoBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400/70" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PromoCopySnippet({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation(['promo', 'common'])
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-ink-900/50 p-3 ring-1 ring-white/6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="text-xs text-fg-subtle">{label}</p>
        <p className="mt-0.5 break-words font-mono text-[0.8rem] leading-snug text-fg sm:text-sm">
          {value}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 self-start sm:self-center"
        onClick={() => {
          void copyText(value).then((ok) => {
            if (!ok) {
              toast.error(t('common:actions.copyFailed'))
              return
            }
            setCopied(true)
            toast.success(t('copy.done'))
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        {copied ? t('copy.done') : t('copy.label')}
      </Button>
    </div>
  )
}

export function PromoLinkChip({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon?: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-ink-850/80 px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-white/15 hover:bg-ink-800"
    >
      {icon}
      {label}
      <ExternalLink aria-hidden className="size-3.5 opacity-50" />
    </a>
  )
}

export function PromoCtaLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={buttonStyles({ variant })}>
      {children}
    </a>
  )
}
