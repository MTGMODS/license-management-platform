import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

function tabKey(pathname: string) {
  if (pathname.startsWith('/helper')) return 'tab.helper'
  if (pathname.startsWith('/vip')) return 'tab.vip'
  if (pathname.startsWith('/promo')) return 'tab.promo'
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) return 'tab.login'
  if (pathname.startsWith('/admin')) return 'tab.admin'
  if (pathname.startsWith('/dashboard')) return 'tab.dashboard'
  return 'tab.home'
}

/** Keeps the browser tab title in sync with the current route and locale. */
export function useDocumentTitle() {
  const { t, i18n } = useTranslation('common')
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = t(tabKey(pathname))
  }, [pathname, t, i18n.language])
}
