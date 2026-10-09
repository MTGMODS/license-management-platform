/** Public repositories presented on the developer's home page. */
export const GITHUB_ORG_URL = 'https://github.com/MTGMODS'

export const REPOSITORIES = [
  {
    name: 'arizona-helper',
    url: `${GITHUB_ORG_URL}/arizona-helper`,
    descriptionKey: 'repositories.helper',
  },
  {
    name: 'arz_lua_launcher',
    url: `${GITHUB_ORG_URL}/arz_lua_launcher`,
    descriptionKey: 'repositories.launcher',
  },
  {
    name: 'license-management-platform',
    url: `${GITHUB_ORG_URL}/license-management-platform`,
    descriptionKey: 'repositories.platform',
  },
] as const
