import { KeyRound, Loader2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/features/auth/authStore'
import { SegmentedControl } from '@/shared/ui'

import { LicensesPanel } from './LicensesPanel'
import { UsersPanel } from './UsersPanel'

export type AdminTab = 'users' | 'licenses'

export function AdminPage() {
  const { t } = useTranslation('admin')
  const status = useAuthStore((state) => state.status)
  const [tab, setTab] = useState<AdminTab>('users')
  const [licenseUserId, setLicenseUserId] = useState<number | null>(null)

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
          { id: 'users', label: t('tabs.users'), icon: Users },
          { id: 'licenses', label: t('tabs.licenses'), icon: KeyRound },
        ]}
      />

      {tab === 'users' ? (
        <UsersPanel
          onOpenLicenses={(userId) => {
            setLicenseUserId(userId)
            setTab('licenses')
          }}
        />
      ) : (
        <LicensesPanel initialUserId={licenseUserId} onConsumedInitialUserId={() => setLicenseUserId(null)} />
      )}
    </div>
  )
}
