/** Public source code for the product and its supporting platform. */
export const GITHUB_ORG_URL = 'https://github.com/MTGMODS'
const PLATFORM = `${GITHUB_ORG_URL}/license-management-platform/tree/main`

export const REPO_GROUPS = [
  {
    id: 'product',
    repos: [
      { name: 'Arizona & Rodina Helper', url: `${GITHUB_ORG_URL}/arizona-helper`, key: 'helper' },
      { name: 'Windows Installer', url: `${GITHUB_ORG_URL}/arizona-helper/tree/main/WindowsInstaller`, key: 'installer' },
      { name: 'Front End · /web', url: `${PLATFORM}/web`, key: 'frontend' },
      { name: 'Mobile Launcher Patcher', url: `${GITHUB_ORG_URL}/arz_lua_launcher`, key: 'launcher' },
    ],
  },
  {
    id: 'backend',
    repos: [
      { name: 'Usage Service', url: `${PLATFORM}/services/usage`, key: 'usage' },
      { name: 'User Service', url: `${PLATFORM}/services/user`, key: 'user' },
      { name: 'License Service', url: `${PLATFORM}/services/license`, key: 'license' },
      { name: 'Distribution Service', url: `${PLATFORM}/services/distribution`, key: 'distribution' },
    ],
  },
  {
    id: 'bots',
    repos: [
      { name: 'Telegram Bot', url: `${PLATFORM}/bots/telegram`, key: 'telegram' },
      { name: 'Discord Bot', url: `${PLATFORM}/bots/discord`, key: 'discord' },
    ],
  },
] as const
