import { DEFAULT_OG_IMAGE_PATH, SITE_NAME, siteOrigin } from '@/shared/config/site'

type MetaAttr = 'name' | 'property'

function upsertMeta(attr: MetaAttr, key: string, content: string): void {
  const selector = attr === 'name' ? `meta[name="${key}"]` : `meta[property="${key}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

export interface PageMetaInput {
  title: string
  description: string
  pathname: string
  locale: string
  /** When false, adds noindex,nofollow for private routes. */
  index?: boolean
}

/** Updates title, description, Open Graph, Twitter Card, canonical, and html lang. */
export function applyPageMeta({
  title,
  description,
  pathname,
  locale,
  index = true,
}: PageMetaInput): void {
  document.title = title
  document.documentElement.lang = locale

  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', index ? 'index,follow' : 'noindex,nofollow')

  const url = `${siteOrigin()}${pathname}`
  const image = `${siteOrigin()}${DEFAULT_OG_IMAGE_PATH}`
  const ogLocale = locale === 'uk' ? 'uk_UA' : 'ru_RU'
  const ogLocaleAlternate = locale === 'uk' ? 'ru_RU' : 'uk_UA'

  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:locale', ogLocale)
  upsertMeta('property', 'og:locale:alternate', ogLocaleAlternate)
  upsertMeta('property', 'og:image', image)

  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'twitter:image', image)

  upsertLink('canonical', url)
}
