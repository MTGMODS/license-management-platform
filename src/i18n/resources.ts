import ruAdmin from './locales/ru/admin.json'
import ruCommon from './locales/ru/common.json'
import ruDashboard from './locales/ru/dashboard.json'
import ruDownload from './locales/ru/download.json'
import ruErrors from './locales/ru/errors.json'
import ruHeader from './locales/ru/header.json'
import ruHelper from './locales/ru/helper.json'
import ruHome from './locales/ru/home.json'
import ruLogin from './locales/ru/login.json'
import ruTerms from './locales/ru/terms.json'
import ruVip from './locales/ru/vip.json'
import ukAdmin from './locales/uk/admin.json'
import ukCommon from './locales/uk/common.json'
import ukDashboard from './locales/uk/dashboard.json'
import ukDownload from './locales/uk/download.json'
import ukErrors from './locales/uk/errors.json'
import ukHeader from './locales/uk/header.json'
import ukHelper from './locales/uk/helper.json'
import ukHome from './locales/uk/home.json'
import ukLogin from './locales/uk/login.json'
import ukTerms from './locales/uk/terms.json'
import ukVip from './locales/uk/vip.json'

export const defaultNS = 'common'

export const resources = {
  ru: {
    admin: ruAdmin,
    common: ruCommon,
    dashboard: ruDashboard,
    download: ruDownload,
    errors: ruErrors,
    header: ruHeader,
    helper: ruHelper,
    home: ruHome,
    login: ruLogin,
    terms: ruTerms,
    vip: ruVip,
  },
  uk: {
    admin: ukAdmin,
    common: ukCommon,
    dashboard: ukDashboard,
    download: ukDownload,
    errors: ukErrors,
    header: ukHeader,
    helper: ukHelper,
    home: ukHome,
    login: ukLogin,
    terms: ukTerms,
    vip: ukVip,
  },
} as const
