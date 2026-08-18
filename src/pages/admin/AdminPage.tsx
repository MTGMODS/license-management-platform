import { KeyRound, Loader2, Users, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/authStore'
import { SegmentedControl } from '@/shared/ui'

import { GenerateCard, LicensesPanel } from './LicensesPanel'
import { UsersPanel } from './UsersPanel'

export type AdminTab = 'generate' | 'users' | 'licenses'

export function AdminPage() {
  const { t } = useTranslation('admin')
  const status = useAuthStore((state) => state.status)
  const [tab, setTab] = useState<AdminTab>('generate')
  const [licenseUserId, setLicenseUserId] = useState<number | null>(null)
  const [profileUserId, setProfileUserId] = useState<number | null>(null)

  if (status === 'initialising') {
    return (
      <div className="shell py-16">
        <Loader2 aria-hidden className="size-6 animate-spin text-fg-subtle" />
      </div>
    )
  }

  return (
    <div className="shell space-y-8 py-16">
      <section className="text-center">
        <h1 className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-fg-muted">{t('subtitle')}</p>
      </section>

      <SegmentedControl
        fullWidth
        label={t('title')}
        value={tab}
        onChange={setTab}
        className="p-1.5"
        options={[
          { id: 'generate', label: t('tabs.generate'), icon: Wand2 },
          { id: 'licenses', label: t('tabs.licenses'), icon: KeyRound },
          { id: 'users', label: t('tabs.users'), icon: Users },
        ]}
      />

      {tab === 'generate' ? <GenerateCard /> : null}
      {tab === 'users' ? (
        <UsersPanel
          initialUserId={profileUserId}
          onConsumedInitialUserId={() => setProfileUserId(null)}
          onOpenLicenses={(userId) => {
            setLicenseUserId(userId)
            setTab('licenses')
          }}
        />
      ) : null}
      {tab === 'licenses' ? (
        <LicensesPanel
          initialUserId={licenseUserId}
          onConsumedInitialUserId={() => setLicenseUserId(null)}
          onOpenUser={(userId) => {
            setProfileUserId(userId)
            setTab('users')
          }}
        />
      ) : null}
    </div>
  )
}
