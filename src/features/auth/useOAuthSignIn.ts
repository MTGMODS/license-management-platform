import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { apiErrorTranslationKey } from '@/shared/api'
import type { OAuthProvider } from '@/shared/api/user'

import { useAuthStore } from './authStore'
import { AuthPopupError, openAuthPopup } from './popupAuth'

function failureTranslationKey(error: unknown): string {
  if (error instanceof AuthPopupError) {
    switch (error.reason) {
      case 'blocked':
        return 'errors:auth.popupBlocked'
      case 'closed':
        return 'errors:auth.popupClosed'
      default:
        return error.code ? `errors:code.${error.code}` : 'errors:auth.failed'
    }
  }

  return apiErrorTranslationKey(error)
}

interface UseOAuthSignInResult {
  /** Provider whose popup is currently open, if any. */
  pendingProvider: OAuthProvider | null
  signIn: (provider: OAuthProvider) => Promise<void>
}

export function useOAuthSignIn(): UseOAuthSignInResult {
  const { t } = useTranslation(['errors'])
  const navigate = useNavigate()
  const completeSignIn = useAuthStore((state) => state.completeSignIn)
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)

  const signIn = useCallback(
    async (provider: OAuthProvider) => {
      setPendingProvider(provider)

      try {
        const response = await openAuthPopup(provider)
        completeSignIn(response)
        void navigate('/dashboard', { replace: true })
      } catch (error) {
        const key = failureTranslationKey(error)
        // Dismissing the popup is a deliberate user action, not a fault worth
        // an error-styled toast.
        const isCancellation = error instanceof AuthPopupError && error.reason === 'closed'

        if (isCancellation) {
          toast(t(key, { defaultValue: t('errors:auth.failed') }))
        } else {
          toast.error(t(key, { defaultValue: t('errors:auth.failed') }))
        }
      } finally {
        setPendingProvider(null)
      }
    },
    [completeSignIn, navigate, t],
  )

  return { pendingProvider, signIn }
}
