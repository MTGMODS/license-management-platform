/** ISO 4217 currency for a visitor country (IP). USD / unknown → null (no second line). */
const COUNTRY_TO_CURRENCY: Readonly<Record<string, string>> = {
  UA: 'UAH',
  RU: 'RUB',
  BY: 'BYN',
  KZ: 'KZT',
  MD: 'MDL',
  GE: 'GEL',
  AM: 'AMD',
  AZ: 'AZN',
  UZ: 'UZS',
  KG: 'KGS',
  TJ: 'TJS',
  TM: 'TMT',
  PL: 'PLN',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  IE: 'EUR',
  LT: 'EUR',
  LV: 'EUR',
  EE: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  GR: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  HR: 'EUR',
  CZ: 'CZK',
  RO: 'RON',
  BG: 'BGN',
  HU: 'HUF',
  GB: 'GBP',
  TR: 'TRY',
  IL: 'ILS',
  AE: 'AED',
  SA: 'SAR',
  IN: 'INR',
  BR: 'BRL',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  JP: 'JPY',
  KR: 'KRW',
  CN: 'CNY',
  TW: 'TWD',
  TH: 'THB',
  VN: 'VND',
  ID: 'IDR',
  MY: 'MYR',
  SG: 'SGD',
  PH: 'PHP',
  MX: 'MXN',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  ZA: 'ZAR',
  EG: 'EGP',
  NG: 'NGN',
}

export function currencyForCountry(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null
  const currency = COUNTRY_TO_CURRENCY[countryCode.toUpperCase()]
  if (!currency || currency === 'USD') return null
  return currency
}

/** Narrow symbol for a currency (₴, ₽, €…). Falls back to the ISO code. */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/**
 * Near-parity FX (EUR/GBP/CHF/CAD/…): live rate + 2 decimals.
 * High FX (UAH/RUB/PLN/…): ceil $/unit so plans share a whole multiplier.
 */
const NEAR_USD_RATE_MAX = 2

export function localApproxFromRate(rate: number): {
  unitRate: number
  fractionDigits: number
} {
  if (rate <= NEAR_USD_RATE_MAX) {
    return { unitRate: rate, fractionDigits: 2 }
  }
  return { unitRate: Math.ceil(rate), fractionDigits: 0 }
}

/** Symbol on the right: `123₴` / `13,80€`. */
export function formatLocalMoney(
  amount: number,
  currency: string,
  fractionDigits = 0,
): string {
  const number = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount)
  return `${number}${currencySymbol(currency)}`
}
