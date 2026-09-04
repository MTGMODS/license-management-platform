/**
 * Content for the brand / developer profile page.
 *
 * Repository URLs are verified against the actual git remotes of the MTG
 * projects. The three core services live as directories inside the backend
 * monorepo, so they deep-link into it rather than to separate repositories.
 */

export const GITHUB_ORG_URL = 'https://github.com/MTGMODS'

const MONOREPO = `${GITHUB_ORG_URL}/license-management-platform`

export interface RepoLink {
  /** Display name; intentionally untranslated, these are product names. */
  name: string
  url: string
  /** Key inside the `home` namespace describing the repository. */
  descriptionKey:
    | 'openSource.services.user'
    | 'openSource.services.license'
    | 'openSource.services.usage'
    | 'openSource.services.distribution'
    | 'openSource.services.frontend'
    | 'openSource.services.telegramBot'
    | 'openSource.services.discordBot'
}

export interface RepoGroup {
  titleKey: 'openSource.backend' | 'openSource.frontend' | 'openSource.bots'
  repos: RepoLink[]
}

export const REPO_GROUPS: RepoGroup[] = [
  {
    titleKey: 'openSource.backend',
    repos: [
      {
        name: 'User Service',
        url: `${MONOREPO}/tree/main/user_service`,
        descriptionKey: 'openSource.services.user',
      },
      {
        name: 'License Service',
        url: `${MONOREPO}/tree/main/license_service`,
        descriptionKey: 'openSource.services.license',
      },
      {
        name: 'Usage Service',
        url: `${MONOREPO}/tree/main/usage_service`,
        descriptionKey: 'openSource.services.usage',
      },
      {
        name: 'Distribution Service',
        url: `${MONOREPO}/tree/main/distribution_service`,
        descriptionKey: 'openSource.services.distribution',
      },
    ],
  },
  {
    titleKey: 'openSource.frontend',
    repos: [
      {
        name: 'mtg_frontend',
        url: `${GITHUB_ORG_URL}/mtg_frontend`,
        descriptionKey: 'openSource.services.frontend',
      },
    ],
  },
  {
    titleKey: 'openSource.bots',
    repos: [
      {
        name: 'mtg_telegram_bot',
        url: `${GITHUB_ORG_URL}/mtg_telegram_bot`,
        descriptionKey: 'openSource.services.telegramBot',
      },
      {
        name: 'mtg_discord_bot',
        url: `${GITHUB_ORG_URL}/mtg_discord_bot`,
        descriptionKey: 'openSource.services.discordBot',
      },
    ],
  },
]

/** Technologies actually used across the MTG repositories. */
export const SKILLS: string[] = [
  'Python',
  'FastAPI',
  'SQLAlchemy',
  'PostgreSQL',
  'RabbitMQ',
  'Docker',
  'Lua',
  'TypeScript',
  'React',
]

export type SocialId = 'github' | 'telegram' | 'discord'

export interface SocialLink {
  id: SocialId
  label: string
  url: string
}

/**
 * Only verified destinations are listed. Personal Telegram and Discord handles
 * are still to be supplied; adding an entry here is all that is needed.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'github', label: 'GitHub', url: GITHUB_ORG_URL },
]
