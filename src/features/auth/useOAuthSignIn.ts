import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { apiErrorTranslationKey } from '@/shared/api'
import {
  createLinkTicket,
  linkSocialAccount,
  authenticateWithTelegramInitData,
  type OAuthProvider,
} from '@/shared/api/user'

import { useAuthStore } from './authStore'
import {
  AuthPopupError,
  isEmbeddedBrowserWithoutPopups,
  openAuthPopup,
  shouldUseFullPageOAuth,
  startFullPageOAuth,
  tryOpenAuthWindow,
} from './popupAuth'
import { getTelegramInitData, getTelegramUserIdFromInitData, isInsideTelegramShell } from './telegram'

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
  link: (provider: OAuthProvider) => Promise<boolean>
  retryAfterAllowingPopups: () => Promise<void>
  dismissPopupBlock: () => void
}

export function useOAuthSignIn(): UseOAuthSignInResult {
  const { t } = useTranslation(['errors'])
  const navigate = useNavigate()
  const completeSignIn = useAuthStore((state) => state.completeSignIn)
  const setUser = useAuthStore((state) => state.setUser)
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [blockedProvider, setBlockedProvider] = useState<OAuthProvider | null>(null)
  const [linkTicket, setLinkTicket] = useState<string | null>(null)

  const runWithPopup = useCallback(
    async (provider: OAuthProvider, popup: Window, ticket?: string) => {
      setBlockedProvider(null)
      setPendingProvider(provider)

      try {
        const response = await openAuthPopup(provider, popup, ticket ? { ticket } : undefined)
        completeSignIn(response)
        void navigate('/dashboard', { replace: true })
        return true
      } catch (error) {
        if (error instanceof AuthPopupError && error.reason === 'blocked') {
          try {
            popup.close()
          } catch {
            // ignore
          }
          setBlockedProvider(provider)
          return false
        }

        const key = failureTranslationKey(error)
        const isCancellation = error instanceof AuthPopupError && error.reason === 'closed'

        if (isCancellation) {
          toast(t(key, { defaultValue: t('errors:auth.failed') }))
        } else {
          toast.error(t(key, { defaultValue: t('errors:auth.failed') }))
        }
        return false
      } finally {
        setPendingProvider(null)
      }
    },
    [completeSignIn, navigate, t],
  )

  const startProviderFlow = useCallback(
    async (provider: OAuthProvider, ticket?: string) => {
      if (isEmbeddedBrowserWithoutPopups()) {
        setBlockedProvider(provider)
        return false
      }

      if (shouldUseFullPageOAuth()) {
        setPendingProvider(provider)
        startFullPageOAuth(provider, ticket ? { ticket } : undefined)
        return false
      }

      const popup = tryOpenAuthWindow()
      if (!popup) {
        setBlockedProvider(provider)
        return false
      }
      return runWithPopup(provider, popup, ticket)
    },
    [runWithPopup],
  )

  const signIn = useCallback(
    async (provider: OAuthProvider) => {
      setLinkTicket(null)

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

        if (isInsideTelegramShell()) {
          toast.error(t('errors:auth.telegramMiniAppRequired'))
          return
        }
      }

      await startProviderFlow(provider)
    },
    [completeSignIn, navigate, startProviderFlow, t],
  )

  const link = useCallback(
    async (provider: OAuthProvider) => {
      if (provider === 'telegram') {
        const initData = getTelegramInitData()
        if (initData) {
          const telegramId = getTelegramUserIdFromInitData(initData)
          if (telegramId) {
            setPendingProvider('telegram')
            try {
              const user = await linkSocialAccount({ telegram_id: telegramId })
              setUser(user)
              return true
            } catch (error) {
              toast.error(
                t(apiErrorTranslationKey(error), { defaultValue: t('errors:auth.failed') }),
              )
              return false
            } finally {
              setPendingProvider(null)
            }
          }
        }

        if (isInsideTelegramShell()) {
          toast.error(t('errors:auth.telegramMiniAppRequired'))
          return false
        }
      }

      try {
        const { ticket } = await createLinkTicket(provider)
        setLinkTicket(ticket)
        return startProviderFlow(provider, ticket)
      } catch (error) {
        toast.error(t(apiErrorTranslationKey(error), { defaultValue: t('errors:auth.failed') }))
        return false
      }
    },
    [setUser, startProviderFlow, t],
  )

  const retryAfterAllowingPopups = useCallback(async () => {
    if (!blockedProvider) return
    const provider = blockedProvider
    const ticket = linkTicket ?? undefined

    if (shouldUseFullPageOAuth()) {
      setBlockedProvider(null)
      setPendingProvider(provider)
      startFullPageOAuth(provider, ticket ? { ticket } : undefined)
      return
    }

    const popup = tryOpenAuthWindow()
    if (!popup) {
      setBlockedProvider(provider)
      return
    }
    await runWithPopup(provider, popup, ticket)
  }, [blockedProvider, linkTicket, runWithPopup])

  const dismissPopupBlock = useCallback(() => {
    setBlockedProvider(null)
    setLinkTicket(null)
  }, [])

  return {
    pendingProvider,
    blockedProvider,
    signIn,
    link,
    retryAfterAllowingPopups,
    dismissPopupBlock,
  }
}
