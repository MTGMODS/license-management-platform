import { useEffect, useState } from 'react'

import { useViewerCountry } from '@/features/geo/useViewerCountry'
import { currencyForCountry, formatLocalMoney, localApproxFromRate } from '@/shared/lib/localCurrency'

const RATES_URL = 'https://open.er-api.com/v6/latest/USD'
const RATES_STORAGE_KEY = 'mtg:usd-rates-v1'
const RATES_TTL_MS = 6 * 60 * 60_000

interface RatesPayload {
  fetchedAt: number
  rates: Record<string, number>
}

function readCachedRates(): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem(RATES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RatesPayload
    if (!parsed?.rates || typeof parsed.fetchedAt !== 'number') return null
    if (Date.now() - parsed.fetchedAt > RATES_TTL_MS) return null
    return parsed.rates
  } catch {
    return null
  }
}

function writeCachedRates(rates: Record<string, number>) {
  try {
    const payload: RatesPayload = { fetchedAt: Date.now(), rates }
    sessionStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

/**
 * USD→local FX from a keyless public API. Currency follows IP country
 * (same source as bank-card gating), not UI language.
 */
export function useLocalUsdPrice() {
  const { data: country } = useViewerCountry()
  const currency = currencyForCountry(country)
  const [rates, setRates] = useState<Record<string, number> | null>(() => readCachedRates())

  useEffect(() => {
    if (!currency) return
    if (rates && typeof rates[currency] === 'number') return

    const controller = new AbortController()

    void (async () => {
      try {
        const response = await fetch(RATES_URL, {
          signal: controller.signal,
          credentials: 'omit',
        })
        if (!response.ok) return
        const data = (await response.json()) as { result?: string; rates?: Record<string, number> }
        if (data.result !== 'success' || !data.rates) return
        writeCachedRates(data.rates)
        setRates(data.rates)
      } catch {
        /* keep USD-only while offline / blocked */
      }
    })()

    return () => controller.abort()
  }, [currency, rates])

  const rate = currency && rates ? rates[currency] : undefined
  const approx =
    currency && typeof rate === 'number' && rate > 0 ? localApproxFromRate(rate) : null

  return {
    currency,
    /** True once a local unit rate is available for the visitor's country. */
    ready: approx !== null,
    formatApprox(usd: number): string | null {
      if (!currency || !approx) return null
      return formatLocalMoney(usd * approx.unitRate, currency, approx.fractionDigits)
    },
  }
}
