import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { PAYPAL_EMAIL } from '@/shared/config/payment'
import { GITHUB_ORG_URL } from '@/shared/config/profile'

const LICENSE_URL = 'https://github.com/MTGMODS/arizona-helper/blob/main/LICENSE'
const TELEGRAM_DM_URL = 'https://t.me/mtg_mods'

const SECTIONS = [
  'general',
  'eula',
  'privacy',
  'deletion',
  'vipRules',
  'payment',
  'liability',
  'contact',
] as const

type SectionId = (typeof SECTIONS)[number]

type TermsBlock =
  | { type: 'p'; text: string }
  | { type: 'rich'; key: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; text?: string; lines?: string[] }

type BlockGroup =
  | { kind: 'blocks'; blocks: TermsBlock[] }
  | { kind: 'panel'; title: string; blocks: TermsBlock[] }
  | { kind: 'callout'; block: Extract<TermsBlock, { type: 'callout' }> }

const EXTERNAL_LINK =
  'text-accent-300 underline decoration-accent-500/40 underline-offset-2 transition-colors hover:text-accent-200'

function groupBlocks(blocks: TermsBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = []
  let buffer: TermsBlock[] = []

  const flushBuffer = () => {
    if (buffer.length === 0) return
    groups.push({ kind: 'blocks', blocks: buffer })
    buffer = []
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]

    if (block.type === 'h3') {
      flushBuffer()
      const panelBlocks: TermsBlock[] = []
      let cursor = index + 1
      while (cursor < blocks.length && blocks[cursor].type !== 'h3') {
        panelBlocks.push(blocks[cursor])
        cursor += 1
      }
      groups.push({ kind: 'panel', title: block.text, blocks: panelBlocks })
      index = cursor - 1
      continue
    }

    if (block.type === 'callout') {
      flushBuffer()
      groups.push({ kind: 'callout', block })
      continue
    }

    buffer.push(block)
  }

  flushBuffer()
  return groups
}

function TermsRich({ i18nKey, compact = false }: { i18nKey: string; compact?: boolean }) {
  const components = {
    strong: <strong className="font-semibold text-fg" />,
    license: (
      <a href={LICENSE_URL} target="_blank" rel="noreferrer noopener" className={EXTERNAL_LINK} />
    ),
    github: (
      <a href={GITHUB_ORG_URL} target="_blank" rel="noreferrer noopener" className={EXTERNAL_LINK} />
    ),
    email: <a href={`mailto:${PAYPAL_EMAIL}`} className={EXTERNAL_LINK} />,
    telegram: (
      <a href={TELEGRAM_DM_URL} target="_blank" rel="noreferrer noopener" className={EXTERNAL_LINK} />
    ),
    site: <a href="https://mtgmods.com/terms" className={EXTERNAL_LINK} />,
  }

  return (
    <p className={compact ? 'leading-relaxed' : 'text-sm leading-relaxed text-fg-muted'}>
      <Trans i18nKey={i18nKey} ns="terms" components={components} />
    </p>
  )
}

function TermsPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-ink-800/35">
      {title ? (
        <div className="border-b border-white/[0.06] bg-ink-800/50 px-4 py-2.5">
          <p className="text-sm font-semibold tracking-tight text-fg">{title}</p>
        </div>
      ) : null}
      <div className="space-y-2.5 px-4 py-3.5 text-sm leading-relaxed text-fg-muted">{children}</div>
    </div>
  )
}

function TermsBlockView({ block, compact = false }: { block: TermsBlock; compact?: boolean }) {
  switch (block.type) {
    case 'p':
      return <p className={compact ? 'leading-relaxed' : 'text-sm leading-relaxed text-fg-muted'}>{block.text}</p>
    case 'rich':
      return <TermsRich i18nKey={block.key} compact={compact} />
    case 'ul':
      return (
        <ul className="my-1 list-outside list-disc space-y-2 pl-5 marker:text-fg-subtle">
          {block.items.map((item) => (
            <li key={item} className="pl-0.5">
              {item}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="my-1 list-outside list-decimal space-y-2 pl-5 marker:text-fg-subtle">
          {block.items.map((item) => (
            <li key={item} className="pl-0.5">
              {item}
            </li>
          ))}
        </ol>
      )
    default:
      return null
  }
}

function TermsBlockGroupView({ group }: { group: BlockGroup }) {
  if (group.kind === 'panel') {
    return (
      <TermsPanel title={group.title}>
        {group.blocks.map((block, index) => (
          <TermsBlockView key={`panel-${index}`} block={block} compact />
        ))}
      </TermsPanel>
    )
  }

  if (group.kind === 'callout') {
    const lines = group.block.lines ?? (group.block.text ? [group.block.text] : [])
    return (
      <TermsPanel>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </TermsPanel>
    )
  }

  return (
    <div className="space-y-2.5">
      {group.blocks.map((block, index) => (
        <TermsBlockView key={`block-${index}`} block={block} />
      ))}
    </div>
  )
}

function TermsSection({ id, index }: { id: SectionId; index: number }) {
  const { t } = useTranslation('terms')
  const rawBlocks = t(`sections.${id}.blocks`, { returnObjects: true })
  const blocks = (
    Array.isArray(rawBlocks) ? rawBlocks : Object.values(rawBlocks as Record<string, TermsBlock>)
  ) as TermsBlock[]
  const groups = groupBlocks(blocks)

  return (
    <section className="scroll-mt-24 px-6 py-8 sm:px-8">
      <div className="flex items-baseline gap-3 border-b border-white/[0.06] pb-3">
        <span className="shrink-0 text-sm font-medium tabular-nums text-fg-subtle">{index}.</span>
        <h2 className="text-lg font-semibold tracking-tight text-fg">{t(`sections.${id}.title`)}</h2>
      </div>
      <div className="mt-5 space-y-4">
        {groups.map((group, groupIndex) => (
          <TermsBlockGroupView key={`${id}-group-${groupIndex}`} group={group} />
        ))}
      </div>
    </section>
  )
}

export function TermsPage() {
  const { t } = useTranslation('terms')
  const intro = t('intro', { returnObjects: true })
  const introParagraphs = Array.isArray(intro) ? intro : [intro]

  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-sm text-fg-subtle">{t('updated')}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t('title')}</h1>
          <div className="mt-4 space-y-2.5">
            {introParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-fg-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </header>

        <nav
          aria-label={t('tocLabel')}
          className="mt-10 rounded-lg border border-white/[0.07] bg-ink-850/50 px-5 py-4 sm:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t('tocLabel')}</p>
          <ol className="mt-3 columns-1 gap-x-10 text-sm sm:columns-2">
            {SECTIONS.map((id, index) => (
              <li key={id} className="mb-1 break-inside-avoid">
                <a
                  href={`#${id}`}
                  className="text-fg-muted underline decoration-white/10 underline-offset-2 transition-colors hover:text-fg hover:decoration-white/25"
                >
                  <span className="tabular-nums text-fg-subtle">{index + 1}.</span> {t(`sections.${id}.title`)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="terms-prose mt-10 overflow-hidden rounded-lg border border-white/[0.07] bg-ink-850/40">
          {SECTIONS.map((id, index) => (
            <div key={id} id={id}>
              {index > 0 ? <hr className="border-0 border-t border-white/[0.06]" /> : null}
              <TermsSection id={id} index={index + 1} />
            </div>
          ))}
        </article>
      </div>
    </div>
  )
}
