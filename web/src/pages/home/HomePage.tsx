import { ArrowRight, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { REPO_GROUPS, SKILLS, SOCIAL_LINKS } from '@/shared/config/profile'
import { Card, GithubIcon, buttonStyles } from '@/shared/ui'

function Hero() {
  const { t } = useTranslation(['home', 'common'])

  return (
    <section className="shell pt-20 pb-16 sm:pt-28">
      <div className="max-w-3xl animate-fade-up">
        <p className="font-mono text-sm tracking-widest text-accent-400 uppercase">
          {t('home:hero.role')}
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
          <span className="text-gradient">{t('common:brand')}</span>
        </h1>

        <p className="mt-5 flex items-center gap-2 text-sm text-fg-muted">
          <MapPin aria-hidden className="size-4 text-fg-subtle" />
          {t('home:hero.location')}
        </p>

        <p className="mt-8 text-xl leading-relaxed text-fg/90">{t('home:hero.tagline')}</p>
        <p className="mt-4 max-w-2xl leading-relaxed text-fg-muted">{t('home:hero.bio')}</p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/helper" className={buttonStyles({ size: 'lg' })}>
            {t('home:hero.cta')}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <a
            href={SOCIAL_LINKS[0]?.url}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonStyles({ variant: 'outline', size: 'lg' })}
          >
            <GithubIcon aria-hidden className="size-4" />
            {t('home:hero.ctaSecondary')}
          </a>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
    </div>
  )
}

function Skills() {
  const { t } = useTranslation('home')

  return (
    <section className="shell py-12">
      <SectionHeading title={t('skills.title')} subtitle={t('skills.subtitle')} />
      <ul className="flex flex-wrap gap-2">
        {SKILLS.map((skill) => (
          <li
            key={skill}
            className="rounded-lg border border-white/5 bg-ink-850 px-3 py-1.5 font-mono text-sm text-fg-muted transition-colors duration-200 hover:border-accent-500/30 hover:text-fg"
          >
            {skill}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Socials() {
  const { t } = useTranslation('home')

  return (
    <section className="shell py-12">
      <SectionHeading title={t('socials.title')} subtitle={t('socials.subtitle')} />
      <div className="flex flex-wrap gap-3">
        {SOCIAL_LINKS.map((social) => (
          <a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonStyles({ variant: 'secondary' })}
          >
            {social.id === 'github' ? <GithubIcon aria-hidden className="size-4" /> : null}
            {social.label}
          </a>
        ))}
      </div>
    </section>
  )
}

function OpenSource() {
  const { t } = useTranslation('home')

  return (
    <section className="shell py-12">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t('openSource.title')}</h2>
        <p className="mt-2 text-lg text-fg/90">{t('openSource.lead')}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
          {t('openSource.body')}
        </p>
      </div>

      <div className="space-y-8">
        {REPO_GROUPS.map((group) => (
          <div key={group.titleKey}>
            <h3 className="mb-3 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t(group.titleKey)}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.repos.map((repo) => (
                <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer noopener">
                  <Card interactive className="h-full">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-fg">{repo.name}</span>
                      <GithubIcon aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                      {t(repo.descriptionKey)}
                    </p>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function HomePage() {
  return (
    <>
      <Hero />
      <div className="shell">
        <div className="rule-fade" />
      </div>
      <Skills />
      <Socials />
      <OpenSource />
    </>
  )
}
