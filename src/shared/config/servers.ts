/**
 * Server names as the helper itself reports them. The usage payload carries
 * only numeric ids, so without this table the charts read "Server 32" instead
 * of "Space".
 *
 * Mirrors the `servers` table in the Lua source; keep the two in step when a
 * server is added.
 */

export type ServerProject = 'arizona' | 'arizonaMobile' | 'arizonaVc' | 'rodina' | 'rodinaMobile'

interface ServerInfo {
  name: string
  project: ServerProject
}

const ARIZONA: Record<number, string> = {
  1: 'Phoenix',
  2: 'Tucson',
  3: 'Scottdale',
  4: 'Chandler',
  5: 'Brainburg',
  6: 'SaintRose',
  7: 'Mesa',
  8: 'Red Rock',
  9: 'Yuma',
  10: 'Surprise',
  11: 'Prescott',
  12: 'Glendale',
  13: 'Kingman',
  14: 'Winslow',
  15: 'Payson',
  16: 'Gilbert',
  17: 'Show Low',
  18: 'Casa Grande',
  19: 'Page',
  20: 'Sun City',
  21: 'Queen Creek',
  22: 'Sedona',
  23: 'Holiday',
  24: 'Wednesday',
  25: 'Yava',
  26: 'Faraway',
  27: 'Bumble Bee',
  28: 'Christmas',
  29: 'Mirage',
  30: 'Love',
  31: 'Drake',
  32: 'Space',
  33: 'Home',
}

const ARIZONA_MOBILE: Record<number, string> = {
  101: 'Mobile I',
  102: 'Mobile II',
  103: 'Mobile III',
}

const ARIZONA_VC: Record<number, string> = {
  200: 'Vice City',
}

const RODINA: Record<number, string> = {
  301: 'Центральный округ',
  302: 'Южный округ',
  303: 'Северный округ',
  304: 'Восточный округ',
  305: 'Западный округ',
  306: 'Приморский округ',
  307: 'Федеральный округ',
}

const RODINA_MOBILE: Record<number, string> = {
  401: 'Москва',
  402: 'Санкт Петербург',
}

function collect(source: Record<number, string>, project: ServerProject): [number, ServerInfo][] {
  return Object.entries(source).map(([id, name]) => [Number(id), { name, project }])
}

const SERVERS = new Map<number, ServerInfo>([
  ...collect(ARIZONA, 'arizona'),
  ...collect(ARIZONA_MOBILE, 'arizonaMobile'),
  ...collect(ARIZONA_VC, 'arizonaVc'),
  ...collect(RODINA, 'rodina'),
  ...collect(RODINA_MOBILE, 'rodinaMobile'),
])

/**
 * Id 0 is the helper's own "could not detect" bucket rather than a real
 * server, so it has no entry and callers label it themselves.
 */
export const UNKNOWN_SERVER_ID = 0

export function getServer(id: number): ServerInfo | null {
  return SERVERS.get(id) ?? null
}

export function formatServerLabel(id: number, name: string): string {
  return `[${id}] ${name}`
}
