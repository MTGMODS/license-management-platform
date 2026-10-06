import { useTranslation } from 'react-i18next'

import { useOldSalesStats } from '@/features/license/useOldSalesStats'
import { Card, ErrorState, Skeleton } from '@/shared/ui'
import { ForeverStats } from '@/widgets/vip/ForeverStats'

export function OldVipPage() {
  const { t } = useTranslation('vip')
  const { data, isPending, isError, isFetching, refetch } = useOldSalesStats()

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('stats.legacy.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-fg-muted sm:text-base">
          {t('stats.legacy.subtitle')}
        </p>
      </div>

      {isPending ? (
        <Skeleton className="h-80" label={t('stats.legacy.loading')} />
      ) : isError || !data ? (
        <Card className="p-5">
          <ErrorState
            compact
            description={t('stats.legacy.error')}
            retrying={isFetching}
            onRetry={() => void refetch()}
          />
        </Card>
      ) : (
        <ForeverStats data={data} />
      )}
    </div>
  )
}
