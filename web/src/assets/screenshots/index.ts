import type { DeviceKind } from '@/shared/lib/device'

export interface HelperScreenshot {
  src: string
  index: number
}

const PC_SHOTS = import.meta.glob<string>('./pc/{1,2,3,4,5,6,7,8,9}.png', {
  eager: true,
  import: 'default',
})

const MOBILE_SHOTS = import.meta.glob<string>('./mobile/{1,2,3,4,5,6,7,8,9}.png', {
  eager: true,
  import: 'default',
})

function listShots(modules: Record<string, string>): HelperScreenshot[] {
  return Object.entries(modules)
    .flatMap(([path, src]) => {
      const file = path.split('/').pop() ?? ''
      const index = Number.parseInt(file, 10)
      return Number.isInteger(index) && index >= 1 && index <= 9 ? [{ src, index }] : []
    })
    .sort((a, b) => a.index - b.index)
}

const BY_DEVICE: Record<DeviceKind, HelperScreenshot[]> = {
  pc: listShots(PC_SHOTS),
  mobile: listShots(MOBILE_SHOTS),
}

/** PC or mobile set of 1.png…9.png; falls back to PC if the mobile folder is empty. */
export function helperScreenshots(device: DeviceKind): HelperScreenshot[] {
  const preferred = BY_DEVICE[device]
  return preferred.length > 0 ? preferred : BY_DEVICE.pc
}
