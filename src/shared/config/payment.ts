/**
 * Hard facts for VIP checkout: links, wallets, invoices.
 * Copy/UI strings live in i18n. Direct bank card is gated by IP country (not locale).
 */

export const VIP_BOT_URL = 'https://t.me/mtgmods_vip_bot'
export const CONTACT_URL = 'https://t.me/mtg_mods'
export const FRAGMENT_STARS_URL = 'https://fragment.com/stars/buy'
export const PAYPAL_EMAIL = 'bogdan.mtg@gmail.com'

export const VIP_BOT_START = {
  ton: `${VIP_BOT_URL}?start=ton`,
  funpay: `${VIP_BOT_URL}?start=funpay`,
  crypto: `${VIP_BOT_URL}?start=crypto`,
  activate: `${VIP_BOT_URL}?start=activate`,
} as const

/** Stars withdrawal rate quoted in the bot (~USD per ⭐). */
export const STAR_WITHDRAW_RATE_USD = 0.013

export const FUNPAY_FEE_PERCENT = 20
export const FRAGMENT_FEE_PERCENT = 15

export interface DurationOffer {
  days: number
  url: string
}

export const FUNPAY_OFFERS: readonly DurationOffer[] = [
  { days: 7, url: 'https://funpay.com/lots/offer?id=75311029' },
  { days: 30, url: 'https://funpay.com/lots/offer?id=53395293' },
  { days: 90, url: 'https://funpay.com/lots/offer?id=53392702' },
  { days: 365, url: 'https://funpay.com/lots/offer?id=65052581' },
]

export const CRYPTO_BOT_INVOICES: readonly DurationOffer[] = [
  { days: 30, url: 'https://t.me/send?start=IVlf1GJfoAsx' },
  { days: 90, url: 'https://t.me/send?start=IVwtjvcrdSUP' },
  { days: 365, url: 'https://t.me/send?start=IVbjbBr50bKw' },
]

export const CRYPTO_EXCHANGES = [
  { id: 'binance', label: 'Binance ID', value: '311112419' },
  { id: 'bybit', label: 'Bybit ID', value: '70782166' },
] as const

export const CRYPTO_NETWORKS = [
  {
    id: 'ton',
    assets: 'TON, USDT',
    label: 'TON',
    address: 'UQAKaddkmi4klTHic7jOk9Z3e7qpl8Z-J9LUB6GRG5Of8NQC',
  },
  {
    id: 'bep20',
    assets: 'BNB, USDT',
    label: 'BEP-20',
    address: '0x7fe30da48b02495cf757e33a3e404f3dad9447cb',
  },
  {
    id: 'erc20',
    assets: 'ETH, USDC',
    label: 'ERC-20',
    address: '0x2bb655acd50304a2c91373cd4f5776367abd7fa9',
  },
  {
    id: 'trc20',
    assets: 'TRON, USDT',
    label: 'TRC-20',
    address: 'TQUzuD2wA5ZCoT7zzuh3kKb5xwEizMhCpc',
  },
] as const

/** Monobank Visa + SWIFT — shown only when IP country is not RU/BY. */
export const BANK_TRANSFER = {
  cardNumber: '4441 1110 5391 5983',
  cardBrand: 'Visa · Monobank',
  iban: 'UA313220010000026205317880285',
  swift: 'UNJSUAUKXXX',
  recipient: 'Marher Bohdan',
} as const

/** Static Fragment walkthrough numbers from the bot copy. */
export const TON_EXAMPLE = {
  days: 30,
  vipUsd: 3,
  stars: 250,
  fragmentUsd: 3.75,
  feePercent: FRAGMENT_FEE_PERCENT,
} as const

/** What the buyer already has — first step of checkout. */
export type WalletId = 'card' | 'crypto' | 'stars' | 'paypal'

/**
 * Concrete checkout paths.
 * `fragment` = buy Telegram Stars (card in TG or crypto→TON on Fragment), then pay VIP.
 * `bank` = direct Monobank / SWIFT (hidden for RU/BY by IP).
 */
export type CheckoutRouteId = 'funpay' | 'stars' | 'fragment' | 'crypto' | 'paypal' | 'bank'

export const WALLETS: readonly WalletId[] = ['card', 'crypto', 'stars', 'paypal']

const CARD_ROUTES_BASE = ['funpay', 'paypal', 'fragment'] as const satisfies readonly CheckoutRouteId[]

/** Routes shown for each starting wallet (bank injected when allowed). */
export const WALLET_ROUTES: Readonly<Record<WalletId, readonly CheckoutRouteId[]>> = {
  card: CARD_ROUTES_BASE,
  crypto: ['funpay', 'fragment', 'crypto'],
  stars: ['stars'],
  paypal: ['paypal'],
}

export function routesForWallet(
  wallet: WalletId,
  allowBankCard: boolean,
): readonly CheckoutRouteId[] {
  if (wallet === 'card' && allowBankCard) {
    return ['bank', ...CARD_ROUTES_BASE]
  }
  return WALLET_ROUTES[wallet]
}
