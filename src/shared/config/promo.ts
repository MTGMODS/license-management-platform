import { CONTACT_URL } from '@/shared/config/payment'
import {
  DISCORD_SERVER_URL,
  FREE_LUA_FALLBACK_URL,
} from '@/shared/config/product'

/** Telegram channel posts about the helper and VIP. */
export const TELEGRAM_HELPER_POST_URL = 'https://t.me/mtgmods/3614'
export const TELEGRAM_VIP_POST_URL = 'https://t.me/mtgmods/60'

export const BLASTHACK_HELPER_URL = 'https://www.blast.hk/threads/244597/'

export const PROMO_LINKS = {
  contactTelegram: CONTACT_URL,
  discordServer: DISCORD_SERVER_URL,
  telegramHelper: TELEGRAM_HELPER_POST_URL,
  telegramVip: TELEGRAM_VIP_POST_URL,
  blastHack: BLASTHACK_HELPER_URL,
  githubLua: FREE_LUA_FALLBACK_URL,
} as const
