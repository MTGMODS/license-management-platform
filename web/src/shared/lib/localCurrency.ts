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

/** Established marks only. Missing ones stay ISO text (`UZS`), not a fake `$`. */
const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
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

export function hasEstablishedCurrencySymbol(currency: string): boolean {
  return Object.hasOwn(CURRENCY_SYMBOLS, currency)
}

/** ₴ / € / ₸ from the curated list; otherwise the ISO code. */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
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

/** Symbol on the right: `123₴` / `13,80€`. No thousands grouping. ISO codes get a nbsp. */
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
  const symbol = currencySymbol(currency)
  if (hasEstablishedCurrencySymbol(currency)) {
    return `${number}${symbol}`
  }
  return `${number}\u00a0${symbol}`
}

export interface LocalApproxDisplay {
  text: string
  /** Integer digits of the converted amount (`135₴` → 3). */
  integerDigits: number
  hasSymbol: boolean
}

export function localApproxDisplay(
  amount: number,
  currency: string,
  fractionDigits = 0,
): LocalApproxDisplay {
  return {
    text: formatLocalMoney(amount, currency, fractionDigits),
    integerDigits: String(Math.trunc(Math.abs(amount))).length,
    hasSymbol: hasEstablishedCurrencySymbol(currency),
  }
}
