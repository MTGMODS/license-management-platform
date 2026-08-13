import { Inbox, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import { Button } from './Button'

interface StateMessageProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

function StateMessage({ title, description, icon, action, className }: StateMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="text-fg-subtle">{icon}</div> : null}
      <p className="font-medium text-fg">{title}</p>
      {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function EmptyState({ title, description }: { title?: string; description?: string }) {
  const { t } = useTranslation('common')

  return (
    <StateMessage
      icon={<Inbox aria-hidden className="size-7" />}
      title={title ?? t('state.empty')}
      description={description ?? t('state.emptyHint')}
    />
  )
}

interface ErrorStateProps {
  title?: string
  /** Already-translated, user-facing sentence. Never a raw backend payload. */
  description?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
  compact?: boolean
}

export function ErrorState({
  title,
  description,
  onRetry,
  retrying,
  className,
  compact = false,
}: ErrorStateProps) {
  const { t } = useTranslation('common')

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
        <p className="text-sm text-fg-muted">{description ?? title ?? t('state.errorHint')}</p>
        {onRetry ? (
          <Button variant="ghost" size="sm" loading={retrying} onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <StateMessage
      className={className}
      icon={<TriangleAlert aria-hidden className="size-7 text-caution" />}
      title={title ?? t('state.error')}
      description={description ?? t('state.errorHint')}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" loading={retrying} onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        ) : null
      }
    />
  )
}
