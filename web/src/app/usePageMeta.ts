import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { applyPageMeta } from '@/shared/lib/pageMeta'

type TabKey =
  | 'tab.home'
  | 'tab.helper'
  | 'tab.helperDownload'
  | 'tab.vip'
  | 'tab.promo'
  | 'tab.promoLeaders'
  | 'tab.promoSmart'
  | 'tab.login'
  | 'tab.dashboard'
  | 'tab.admin'
  | 'tab.terms'

type DescriptionKey =
  | 'meta.description.home'
  | 'meta.description.helper'
  | 'meta.description.helperDownload'
  | 'meta.description.vip'
  | 'meta.description.promo'
  | 'meta.description.promoLeaders'
  | 'meta.description.promoSmart'
  | 'meta.description.terms'
  | 'meta.description.login'
  | 'meta.description.dashboard'
  | 'meta.description.admin'
  | 'meta.description.notFound'

function resolveRoute(pathname: string): {
  titleKey: TabKey | null
  notFoundTitle?: true
  descriptionKey: DescriptionKey
  index: boolean
  /** Canonical path (may differ from the current URL, e.g. `/` → `/helper`). */
  canonicalPath: string
} {
  if (pathname === '/' || pathname === '') {
    return {
      titleKey: 'tab.helper',
      descriptionKey: 'meta.description.helper',
      index: true,
      canonicalPath: '/helper',
    }
  }
  if (pathname.startsWith('/helper/download')) {
    return {
      titleKey: 'tab.helperDownload',
      descriptionKey: 'meta.description.helperDownload',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/helper')) {
    return {
      titleKey: 'tab.helper',
      descriptionKey: 'meta.description.helper',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/vip')) {
    return {
      titleKey: 'tab.vip',
      descriptionKey: 'meta.description.vip',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/promo/leaders')) {
    return {
      titleKey: 'tab.promoLeaders',
      descriptionKey: 'meta.description.promoLeaders',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/promo/smart')) {
    return {
      titleKey: 'tab.promoSmart',
      descriptionKey: 'meta.description.promoSmart',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/promo')) {
    return {
      titleKey: 'tab.promo',
      descriptionKey: 'meta.description.promo',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/terms')) {
    return {
      titleKey: 'tab.terms',
      descriptionKey: 'meta.description.terms',
      index: true,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return {
      titleKey: 'tab.login',
      descriptionKey: 'meta.description.login',
      index: false,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/admin')) {
    return {
      titleKey: 'tab.admin',
      descriptionKey: 'meta.description.admin',
      index: false,
      canonicalPath: pathname,
    }
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      titleKey: 'tab.dashboard',
      descriptionKey: 'meta.description.dashboard',
      index: false,
      canonicalPath: pathname,
    }
  }

  return {
    titleKey: null,
    notFoundTitle: true,
    descriptionKey: 'meta.description.notFound',
    index: false,
    canonicalPath: pathname,
  }
}

/** Keeps document title, description, OG/Twitter tags, canonical, and lang in sync with the route. */
export function usePageMeta() {
  const { t, i18n } = useTranslation('common')
  const { pathname } = useLocation()

  useEffect(() => {
    const route = resolveRoute(pathname)
    const title = route.notFoundTitle
      ? t('notFound.title')
      : route.titleKey
        ? t(route.titleKey)
        : t('tab.home')

    applyPageMeta({
      title,
      description: t(route.descriptionKey),
      pathname: route.canonicalPath,
      locale: i18n.language,
      index: route.index,
    })
  }, [pathname, t, i18n.language])
}
