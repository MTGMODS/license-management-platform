import type { ApiDateTime } from '@/shared/lib/datetime'

export type UserRole = 'USER' | 'SMART' | 'ADMIN'

export type UserStatus = 'ACTIVE' | 'BANNED' | 'DELETED'

/** Mirrors the `User` schema in the User Service OpenAPI document. */
export interface User {
  id: number | null
  /** Serialised as a string by a Pydantic validator, despite a BigInteger column. */
  telegram_id: string | null
  discord_id: string | null
  nickname: string
  /** Absolute URL; Discord hashes are expanded to a CDN URL server-side. */
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  created_at: ApiDateTime | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}
