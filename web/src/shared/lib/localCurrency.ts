/** ISO 4217 currency for a visitor country (IP). USD / unknown → null (no second price). */
const COUNTRY_TO_CURRENCY: Readonly<Record<string, string>> = {
  US: 'USD',
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
  // US (and any USD mapping) stays USD-only: never `$1 ≈ $1`.
  if (!currency || currency === 'USD') return null
  return currency
}

/** Established marks, glued: `675₴`. Missing ones are not a fake `$`. */
const CURRENCY_MARKS: Readonly<Record<string, string>> = {
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  UAH: '₴',
  TRY: '₺',
  GEL: '₾',
  KZT: '₸',
  AZN: '₼',
  KRW: '₩',
  VND: '₫',
  NGN: '₦',
  PYG: '₲',
  GHS: '₵',
  CRC: '₡',
  THB: '฿',
  PHP: '₱',
  LAK: '₭',
  MNT: '₮',
  ILS: '₪',
  AFN: '؋',
  AMD: '֏',
  BDT: '৳',
  KHR: '៛',
  IRR: '﷼',
  SAR: '﷼',
}

/**
 * Letter abbreviations that sit after the amount: `60 zł`.
 * Prefix-only units (R$, Rp, C$) stay ISO so they are not glued on the wrong side.
 */
const CURRENCY_ABBREVS: Readonly<Record<string, string>> = {
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  BYN: 'Br',
  MDL: 'L',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  KGS: 'сом',
  TJS: 'ЅМ',
  UZS: 'сум',
}

export function hasEstablishedCurrencySymbol(currency: string): boolean {
  return Object.hasOwn(CURRENCY_MARKS, currency)
}

function currencyLabel(currency: string): { text: string; glued: boolean } {
  const mark = CURRENCY_MARKS[currency]
  if (mark) return { text: mark, glued: true }
  const abbrev = CURRENCY_ABBREVS[currency]
  if (abbrev) return { text: abbrev, glued: false }
  return { text: currency, glued: false }
}

/** ₴ / € / zł / ISO code. */
export function currencySymbol(currency: string): string {
  return currencyLabel(currency).text
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

/** `123₴` / `13,80€` / `60 zł` / `80 BRL`. No thousands grouping. */
export function formatLocalMoney(
  amount: number,
  currency: string,
  fractionDigits = 0,
): string {
  const number = new Intl.NumberFormat('uk', {
    useGrouping: false,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount)
  const label = currencyLabel(currency)
  if (label.glued) return `${number}${label.text}`
  return `${number}\u00a0${label.text}`
}

export interface LocalApproxDisplay {
  text: string
}

export function localApproxDisplay(
  amount: number,
  currency: string,
  fractionDigits = 0,
): LocalApproxDisplay {
  return { text: formatLocalMoney(amount, currency, fractionDigits) }
}
