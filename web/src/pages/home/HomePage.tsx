import { ArrowRight, ArrowUpRight, BarChart3, CircleDollarSign, Code2, Download, Gamepad2, Globe, KeyRound, Monitor, Package, Send, Server, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import screenshot from '@/assets/screenshots/pc/1.png'
import { REPO_GROUPS } from '@/shared/config/profile'
import { CONTACT_URL } from '@/shared/config/payment'
import { Card, GithubIcon, buttonStyles } from '@/shared/ui'

const REPO_ICONS = {
  helper: Gamepad2, installer: Download, frontend: Globe, launcher: Smartphone,
  usage: BarChart3, user: Users, license: KeyRound, distribution: Package,
  telegram: Send, discord: Users,
}

function OpenStats() {
  const { t } = useTranslation('home')

  return (
    <section aria-labelledby="open-data-title">
      <div className="mb-6 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-400 uppercase"><ShieldCheck aria-hidden className="size-4" /> Open Stats</p>
        <h2 id="open-data-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('openData.title')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{t('openData.description')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          { key: 'usage', to: '/helper', icon: BarChart3 },
          { key: 'sales', to: '/vip', icon: CircleDollarSign },
        ] as const).map(({ key, to, icon: Icon }) => (
          <Link key={key} to={to} className="group min-w-0 rounded-2xl">
            <Card interactive className="flex h-full items-start gap-3 border-emerald-400/10 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-400"><Icon aria-hidden className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{t(`openData.${key}.title`)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t(`openData.${key}.description`)}</p>
              </div>
              <ArrowUpRight aria-hidden className="mt-1 size-4 shrink-0 text-fg-subtle group-hover:text-emerald-400" />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function HomePage() {
  const { t } = useTranslation('home')

  return (
    <div className="shell space-y-14 py-10 sm:space-y-20 sm:py-16">
      <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="animate-fade-up">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl"><span className="text-gradient">MTG MODS</span></h1>
          <p className="mt-6 text-xl leading-relaxed text-fg/90 sm:text-2xl">
            <Trans ns="home" i18nKey="hero.tagline" components={{ product: <Link to="/helper" className="text-accent-300 underline decoration-accent-500/40 underline-offset-4 hover:text-accent-200" /> }} />
          </p>
          <p className="mt-4 max-w-xl whitespace-pre-line leading-relaxed text-fg-muted">{t('hero.bio')}</p>
          <p className="mt-5 text-sm text-fg-subtle">{t('hero.author')} <a href={CONTACT_URL} target="_blank" rel="noreferrer noopener" className="text-fg-muted underline decoration-white/20 underline-offset-4 hover:text-accent-300">{t('hero.name')}</a></p>
        </div>
        <Link to="/helper" className="group min-w-0 rounded-2xl">
          <Card interactive className="relative overflow-hidden border-accent-500/20 p-0">
            <div className="relative overflow-hidden bg-ink-900">
              <img src={screenshot} alt={t('hero.preview')} width={1280} height={720} className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
            </div>
            <div className="relative p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-xs text-accent-300"><Monitor aria-hidden className="size-4" /> PC <span className="text-fg-subtle">/</span> <Smartphone aria-hidden className="size-4" /> Android</div>
              <h2 className="text-xl font-semibold tracking-tight">Arizona&Rodina Helper</h2>
              <p className="mt-2 text-sm text-fg-muted">{t('hero.productDescription')}</p>
              <span className={buttonStyles({ size: 'lg', className: 'mt-5' })}>{t('hero.explore')} <ArrowRight aria-hidden className="size-4" /></span>
            </div>
          </Card>
        </Link>
      </section>

      <OpenStats />

      <section aria-labelledby="repositories-title">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-accent-400 uppercase"><Code2 aria-hidden className="size-4" /> Open Source</p>
          <h2 id="repositories-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('repositories.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{t('repositories.subtitle')}</p>
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {REPO_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`repos-${group.id}`} className={group.id === 'bots' ? 'xl:col-span-2' : ''}>
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-400">{group.id === 'product' ? <Gamepad2 aria-hidden className="size-5" /> : group.id === 'backend' ? <Server aria-hidden className="size-5" /> : <Send aria-hidden className="size-5" />}</span>
                <div><h3 id={`repos-${group.id}`} className="text-lg font-semibold">{t(`groups.${group.id}.title`)}</h3><p className="mt-1 text-xs leading-relaxed text-fg-muted">{t(`groups.${group.id}.description`)}</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.repos.map((repo) => {
                  const Icon = REPO_ICONS[repo.key]
                  return (
                    <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer noopener" className="group min-w-0 rounded-2xl">
                      <Card interactive className="flex h-full flex-col p-5">
                        <Icon aria-hidden className="size-5 text-accent-400" />
                        <h4 className="mt-4 text-sm font-semibold">{repo.name}</h4>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{t(`repositories.${repo.key}`)}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-xs text-fg-subtle group-hover:text-fg"><GithubIcon aria-hidden className="size-3.5" /> {t('repositories.viewCode')}</span>
                      </Card>
                    </a>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
