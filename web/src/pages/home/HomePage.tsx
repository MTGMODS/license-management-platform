import { ArrowUpRight, BarChart3, CircleDollarSign } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { REPO_GROUPS } from '@/shared/config/profile'
import { CONTACT_URL } from '@/shared/config/payment'
import { Card, GithubIcon } from '@/shared/ui'

export function HomePage() {
  const { t } = useTranslation(['home', 'common'])

  return (
    <div className="shell py-14 sm:py-20">
      <section className="max-w-3xl animate-fade-up">
        <p className="font-mono text-sm text-accent-400">mtgmods</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          {t('hero.greeting')} <a href={CONTACT_URL} target="_blank" rel="noreferrer noopener" className="text-gradient transition-opacity hover:opacity-80">{t('hero.name')}</a>
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-fg/90 sm:text-2xl">
          <Trans ns="home" i18nKey="hero.tagline" components={{
            product: <Link to="/helper" className="text-accent-300 underline decoration-accent-500/40 underline-offset-4 transition-colors hover:text-accent-200" />,
          }} />
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-fg-muted">{t('home:hero.bio')}</p>
      </section>

      <div className="rule-fade my-10 sm:my-14" />

      <section aria-labelledby="about-title" className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <h2 id="about-title" className="text-2xl font-semibold tracking-tight">{t('about.title')}</h2>
        <p className="max-w-3xl leading-relaxed text-fg-muted">{t('about.description')}</p>
      </section>

      <div className="rule-fade my-10 sm:my-14" />

      <section aria-labelledby="repositories-title">
        <h2 id="repositories-title" className="text-2xl font-semibold tracking-tight">
          {t('home:repositories.title')}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">
          {t('home:repositories.subtitle')}
        </p>
        <div className="mt-8 space-y-8">
          {REPO_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`repos-${group.id}`}>
              <h3 id={`repos-${group.id}`} className="text-lg font-semibold">{t(`home:groups.${group.id}.title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t(`home:groups.${group.id}.description`)}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.repos.map((repo) => (
                  <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer noopener" className="group min-w-0 rounded-2xl">
                    <Card interactive className="h-full p-5">
                      <div className="flex items-center gap-3">
                        <GithubIcon aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                        <h4 className="min-w-0 flex-1 break-words text-sm font-semibold">{repo.name}</h4>
                        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-accent-400" />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(`home:repositories.${repo.key}`)}</p>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <div className="rule-fade my-10 sm:my-14" />

      <section aria-labelledby="open-data-title">
        <h2 id="open-data-title" className="text-2xl font-semibold tracking-tight">{t('home:openData.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('home:openData.description')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([
            { to: '/helper', key: 'usage', icon: BarChart3 },
            { to: '/vip', key: 'sales', icon: CircleDollarSign },
          ] as const).map(({ to, key, icon: Icon }) => (
            <Link key={to} to={to} className="group rounded-2xl">
              <Card interactive className="h-full p-5">
                <div className="flex items-center gap-3">
                  <Icon aria-hidden className="size-5 text-accent-400" />
                  <h3 className="flex-1 font-semibold">{t(`home:openData.${key}.title`)}</h3>
                  <ArrowUpRight aria-hidden className="size-4 text-fg-subtle group-hover:text-accent-400" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(`home:openData.${key}.description`)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="rule-fade my-10 sm:my-14" />

    </div>
  )
}
