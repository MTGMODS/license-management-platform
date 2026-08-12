import { useTranslation } from 'react-i18next'

const SECTIONS = [
  'general',
  'helper',
  'vip',
  'privacyFree',
  'privacyVip',
  'privacySite',
  'liability',
  'contact',
] as const

type SectionId = (typeof SECTIONS)[number]

function TermsSection({ id }: { id: SectionId }) {
  const { t } = useTranslation('terms')
  const paragraphs = t(`sections.${id}.paragraphs`, { returnObjects: true }) as string[]

  return (
    <section className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-fg">{t(`sections.${id}.title`)}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-fg-muted">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}

export function TermsPage() {
  const { t } = useTranslation('terms')

  return (
    <div className="shell py-16">
      <header className="max-w-3xl">
        <p className="text-sm text-fg-subtle">{t('updated')}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">{t('intro')}</p>
      </header>

      <nav aria-label={t('tocLabel')} className="mt-10 max-w-3xl rounded-card border border-white/5 bg-ink-850/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t('tocLabel')}</p>
        <ol className="mt-3 columns-1 gap-x-8 text-sm sm:columns-2">
          {SECTIONS.map((id, index) => (
            <li key={id} className="mb-1.5 break-inside-avoid">
              <a href={`#${id}`} className="text-fg-muted transition-colors hover:text-accent-300">
                {index + 1}. {t(`sections.${id}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="mt-12 max-w-3xl space-y-12">
        {SECTIONS.map((id) => (
          <div key={id} id={id}>
            <TermsSection id={id} />
          </div>
        ))}
      </article>
    </div>
  )
}
