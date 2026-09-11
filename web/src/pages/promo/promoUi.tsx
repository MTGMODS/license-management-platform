import { Check, Copy } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { copyText } from '@/shared/lib/clipboard'
import { Button, buttonStyles } from '@/shared/ui'

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
  title,
  lead,
}: {
  title: string
  lead: string
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
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

export function PromoCopySnippet({ value }: { value: string }) {
  const { t } = useTranslation(['promo', 'common'])
  const [copied, setCopied] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    const el = textRef.current
    if (!box || !el) return

    const fit = () => {
      el.style.fontSize = ''
      let size = Number.parseFloat(getComputedStyle(el).fontSize)
      while (el.scrollWidth > el.clientWidth + 1 && size > 8) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={boxRef}
      className="@container flex flex-col gap-2 rounded-xl bg-ink-900/50 p-3 ring-1 ring-white/6 sm:flex-row sm:items-center sm:gap-3"
    >
      <p
        ref={textRef}
        className="min-w-0 overflow-hidden font-mono text-[clamp(0.7rem,4.2cqi,0.875rem)] leading-none whitespace-nowrap text-fg sm:flex-1"
      >
        {value}
      </p>
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
