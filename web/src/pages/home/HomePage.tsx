import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { REPOSITORIES } from '@/shared/config/profile'
import { Card, GithubIcon } from '@/shared/ui'

export function HomePage() {
  const { t } = useTranslation(['home', 'common'])

  return (
    <div className="shell py-14 sm:py-20">
      <section className="max-w-3xl animate-fade-up">
        <p className="font-mono text-xs tracking-widest text-accent-400 uppercase sm:text-sm">
          {t('home:hero.role')}
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
          <span className="text-gradient">{t('common:brand')}</span>
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-fg/90 sm:text-2xl">
          {t('home:hero.tagline')}
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-fg-muted">{t('home:hero.bio')}</p>
      </section>

      <div className="rule-fade my-10 sm:my-14" />

      <section aria-labelledby="repositories-title">
        <h2 id="repositories-title" className="text-2xl font-semibold tracking-tight">
          {t('home:repositories.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
          {t('home:repositories.subtitle')}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {REPOSITORIES.map((repo) => (
            <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer noopener" className="group min-w-0 rounded-2xl">
              <Card interactive className="h-full p-5 sm:p-6">
                <div className="flex items-center justify-between text-fg-subtle">
                  <GithubIcon aria-hidden className="size-5" />
                  <ArrowUpRight aria-hidden className="size-4 transition-colors group-hover:text-accent-400" />
                </div>
                <h3 className="mt-5 break-words font-mono text-sm font-semibold text-fg">{repo.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(`home:${repo.descriptionKey}`)}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
