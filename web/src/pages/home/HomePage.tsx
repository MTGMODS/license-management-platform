import { ArrowUpRight, BarChart3, CircleDollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { REPO_GROUPS } from '@/shared/config/profile'
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
    </div>
  )
}
