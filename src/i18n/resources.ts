import ruCommon from './locales/ru/common.json'
import ruDashboard from './locales/ru/dashboard.json'
import ruDownload from './locales/ru/download.json'
import ruErrors from './locales/ru/errors.json'
import ruHeader from './locales/ru/header.json'
import ruHelper from './locales/ru/helper.json'
import ruHome from './locales/ru/home.json'
import ruLogin from './locales/ru/login.json'
import ruVip from './locales/ru/vip.json'
import ukCommon from './locales/uk/common.json'
import ukDashboard from './locales/uk/dashboard.json'
import ukDownload from './locales/uk/download.json'
import ukErrors from './locales/uk/errors.json'
import ukHeader from './locales/uk/header.json'
import ukHelper from './locales/uk/helper.json'
import ukHome from './locales/uk/home.json'
import ukLogin from './locales/uk/login.json'
import ukVip from './locales/uk/vip.json'

export const defaultNS = 'common'

export const resources = {
  ru: {
    common: ruCommon,
    dashboard: ruDashboard,
    download: ruDownload,
    errors: ruErrors,
    header: ruHeader,
    helper: ruHelper,
    home: ruHome,
    login: ruLogin,
    vip: ruVip,
  },
  uk: {
    common: ukCommon,
    dashboard: ukDashboard,
    download: ukDownload,
    errors: ukErrors,
    header: ukHeader,
    helper: ukHelper,
    home: ukHome,
    login: ukLogin,
    vip: ukVip,
  },
} as const
