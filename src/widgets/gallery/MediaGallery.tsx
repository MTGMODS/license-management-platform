import { ImageIcon, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  HELPER_SCREENSHOTS,
  HELPER_VIDEO_ID,
  youtubeThumbnailUrl,
} from '@/shared/config/product'
import { cn } from '@/shared/lib/cn'

/**
 * Gallery is always video + up to nine CDN screenshots. Missing env values
 * keep the slots as placeholders so layout does not jump when media is added.
 */
type GalleryItem =
  | { kind: 'video'; videoId: string | null }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'image-placeholder'; index: number }

function Viewer({ item }: { item: GalleryItem }) {
  const { t } = useTranslation('helper')

  if (item.kind === 'image') {
    return <img src={item.src} alt={item.alt} className="size-full object-cover" loading="lazy" />
  }

  if (item.kind === 'image-placeholder') {
    return (
      <Placeholder
        icon={<ImageIcon aria-hidden className="size-10" />}
        label={t('gallery.screenshotSoon', { index: item.index })}
      />
    )
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

function Placeholder({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 text-fg-subtle">
      {icon}
      <p className="text-sm">{label}</p>
    </div>
  )
}

function VideoThumb({ videoId }: { videoId: string | null }) {
  if (!videoId) {
    return (
      <span className="grid size-full place-items-center bg-ink-800 text-fg-subtle">
        <PlayCircle aria-hidden className="size-5" />
      </span>
    )
  }

  return (
    <span className="relative block size-full">
      <img
        src={youtubeThumbnailUrl(videoId)}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 grid place-items-center bg-black/35">
        <PlayCircle aria-hidden className="size-6 text-white drop-shadow" />
      </span>
    </span>
  )
}

export function MediaGallery({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('helper')
  const items = useMemo<GalleryItem[]>(() => {
    const screens: GalleryItem[] =
      HELPER_SCREENSHOTS.length > 0
        ? HELPER_SCREENSHOTS.map((shot) => ({
            kind: 'image' as const,
            src: shot.src,
            alt: t('gallery.screenshotAlt', { index: shot.index }),
          }))
        : Array.from({ length: 9 }, (_, offset) => ({
            kind: 'image-placeholder' as const,
            index: offset + 1,
          }))

    return [{ kind: 'video', videoId: HELPER_VIDEO_ID }, ...screens]
  }, [t])

  const [activeIndex, setActiveIndex] = useState(0)
  const active = items[activeIndex] ?? items[0]
  if (!active) return null

  const thumbs = (
    <div
      className={cn(
        'flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1',
        compact ? 'mt-2 shrink-0 justify-start lg:justify-center' : 'mt-4 gap-3 pb-2',
      )}
    >
      {items.map((item, index) => (
        <button
          key={
            item.kind === 'image'
              ? item.src
              : item.kind === 'image-placeholder'
                ? `ph-${item.index}`
                : 'video'
          }
          type="button"
          aria-current={index === activeIndex}
          onClick={() => setActiveIndex(index)}
          className={cn(
            'shrink-0 overflow-hidden rounded-lg border transition-colors duration-200',
            compact
              ? 'h-[clamp(2.25rem,5vh,3.25rem)] w-[clamp(4rem,8.5vh,5.75rem)]'
              : 'h-16 w-28',
            index === activeIndex
              ? 'border-accent-500/60'
              : 'border-white/5 opacity-60 hover:opacity-100',
          )}
        >
          {item.kind === 'image' ? (
            <img src={item.src} alt={item.alt} className="size-full object-cover" />
          ) : item.kind === 'image-placeholder' ? (
            <span className="grid size-full place-items-center bg-ink-800 text-fg-subtle">
              <ImageIcon aria-hidden className="size-5" />
            </span>
          ) : (
            <VideoThumb videoId={item.videoId} />
          )}
        </button>
      ))}
    </div>
  )

  if (compact) {
    return (
      <section
        aria-label={t('gallery.title')}
        className="flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col [container-type:size]"
      >
        <div className="my-auto flex w-full min-w-0 flex-col">
          <div
            className="mx-auto aspect-video overflow-hidden rounded-card border border-white/5 bg-ink-850"
            style={{
              width:
                'min(100cqw, calc((100cqh - 0.75rem - clamp(2.25rem, 5vh, 3.25rem)) * 16 / 9))',
            }}
          >
            <Viewer item={active} />
          </div>
          {thumbs}
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('gallery.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('gallery.subtitle')}</p>
      <div className="mt-6 aspect-video overflow-hidden rounded-card border border-white/5 bg-ink-850">
        <Viewer item={active} />
      </div>
      {thumbs}
    </section>
  )
}
