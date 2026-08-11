import { ImageIcon, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HELPER_SCREENSHOTS, HELPER_VIDEO_ID } from '@/shared/config/product'
import { cn } from '@/shared/lib/cn'

/**
 * The video slot is always present, even before an id exists, so supplying one
 * later is a config change rather than a rewrite of this component.
 */
type GalleryItem =
  | { kind: 'video'; videoId: string | null }
  | { kind: 'image'; src: string; alt: string }

function buildItems(): GalleryItem[] {
  return [
    { kind: 'video', videoId: HELPER_VIDEO_ID },
    ...HELPER_SCREENSHOTS.map((shot) => ({ kind: 'image' as const, ...shot })),
  ]
}

function Placeholder({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 text-fg-subtle">
      {icon}
      <p className="text-sm">{label}</p>
    </div>
  )
}

function Viewer({ item }: { item: GalleryItem }) {
  const { t } = useTranslation('helper')

  if (item.kind === 'image') {
    return <img src={item.src} alt={item.alt} className="size-full object-cover" loading="lazy" />
  }

  if (!item.videoId) {
    return (
      <Placeholder
        icon={<PlayCircle aria-hidden className="size-10" />}
        label={t('gallery.videoSoon')}
      />
    )
  }

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${item.videoId}`}
      title={t('gallery.title')}
      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
      allowFullScreen
      loading="lazy"
      className="size-full border-0"
    />
  )
}

export function MediaGallery() {
  const { t } = useTranslation('helper')
  const items = buildItems()
  const [activeIndex, setActiveIndex] = useState(0)

  const active = items[activeIndex] ?? items[0]
  if (!active) return null

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('gallery.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('gallery.subtitle')}</p>

      <div className="mt-6 aspect-video overflow-hidden rounded-card border border-white/5 bg-ink-850">
        <Viewer item={active} />
      </div>

      {items.length > 1 ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <button
              key={item.kind === 'image' ? item.src : 'video'}
              type="button"
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'h-16 w-28 shrink-0 overflow-hidden rounded-lg border transition-colors duration-200',
                index === activeIndex
                  ? 'border-accent-500/60'
                  : 'border-white/5 opacity-60 hover:opacity-100',
              )}
            >
              {item.kind === 'image' ? (
                <img src={item.src} alt={item.alt} className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-ink-800 text-fg-subtle">
                  <PlayCircle aria-hidden className="size-5" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-fg-subtle">
          <ImageIcon aria-hidden className="size-4" />
          {t('gallery.screenshotsSoon')}
        </p>
      )}
    </section>
  )
}
