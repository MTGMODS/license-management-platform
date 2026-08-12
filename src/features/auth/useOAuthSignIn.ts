import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { apiErrorTranslationKey } from '@/shared/api'
import { authenticateWithTelegramInitData, type OAuthProvider } from '@/shared/api/user'

import { useAuthStore } from './authStore'
import {
  AuthPopupError,
  isEmbeddedBrowserWithoutPopups,
  openAuthPopup,
  shouldUseFullPageOAuth,
  startFullPageOAuth,
  tryOpenAuthWindow,
} from './popupAuth'
import { getTelegramInitData, isInsideTelegramShell } from './telegram'

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
  pendingProvider: OAuthProvider | null
  blockedProvider: OAuthProvider | null
  signIn: (provider: OAuthProvider) => Promise<void>
  retryAfterAllowingPopups: () => Promise<void>
  dismissPopupBlock: () => void
}

export function useOAuthSignIn(): UseOAuthSignInResult {
  const { t } = useTranslation(['errors'])
  const navigate = useNavigate()
  const completeSignIn = useAuthStore((state) => state.completeSignIn)
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [blockedProvider, setBlockedProvider] = useState<OAuthProvider | null>(null)

  const runWithPopup = useCallback(
    async (provider: OAuthProvider, popup: Window) => {
      setBlockedProvider(null)
      setPendingProvider(provider)

      try {
        const response = await openAuthPopup(provider, popup)
        completeSignIn(response)
        void navigate('/dashboard', { replace: true })
      } catch (error) {
        if (error instanceof AuthPopupError && error.reason === 'blocked') {
          try {
            popup.close()
          } catch {
            // ignore
          }
          setBlockedProvider(provider)
          return
        }

        const key = failureTranslationKey(error)
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

  const signIn = useCallback(
    async (provider: OAuthProvider) => {
      if (provider === 'telegram') {
        const initData = getTelegramInitData()

        if (initData) {
          setPendingProvider('telegram')
          try {
            const response = await authenticateWithTelegramInitData(initData)
            completeSignIn(response)
            void navigate('/dashboard', { replace: true })
          } catch (error) {
            toast.error(
              t(apiErrorTranslationKey(error), { defaultValue: t('errors:auth.failed') }),
            )
          } finally {
            setPendingProvider(null)
          }
          return
        }

        // Inside Telegram without initData = opened as a plain link, not Mini App.
        // Do not fall through to OAuth — that is the wrong flow here.
        if (isInsideTelegramShell()) {
          toast.error(t('errors:auth.telegramMiniAppRequired'))
          return
        }
      }

      if (isEmbeddedBrowserWithoutPopups()) {
        setBlockedProvider(provider)
        return
      }

      if (shouldUseFullPageOAuth()) {
        setPendingProvider(provider)
        startFullPageOAuth(provider)
        return
      }

      const popup = tryOpenAuthWindow()
      if (!popup) {
        setBlockedProvider(provider)
        return
      }
      await runWithPopup(provider, popup)
    },
    [completeSignIn, navigate, runWithPopup, t],
  )

  const retryAfterAllowingPopups = useCallback(async () => {
    if (!blockedProvider) return
    const provider = blockedProvider

    if (shouldUseFullPageOAuth()) {
      setBlockedProvider(null)
      setPendingProvider(provider)
      startFullPageOAuth(provider)
      return
    }

    const popup = tryOpenAuthWindow()
    if (!popup) {
      setBlockedProvider(provider)
      return
    }
    await runWithPopup(provider, popup)
  }, [blockedProvider, runWithPopup])

  const dismissPopupBlock = useCallback(() => {
    setBlockedProvider(null)
  }, [])

  return {
    pendingProvider,
    blockedProvider,
    signIn,
    retryAfterAllowingPopups,
    dismissPopupBlock,
  }
}
