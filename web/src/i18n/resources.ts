import enAdmin from './locales/en/admin.json'
import enCommon from './locales/en/common.json'
import enDashboard from './locales/en/dashboard.json'
import enDownload from './locales/en/download.json'
import enErrors from './locales/en/errors.json'
import enHeader from './locales/en/header.json'
import enHelper from './locales/en/helper.json'
import enHome from './locales/en/home.json'
import enLogin from './locales/en/login.json'
import enPromo from './locales/en/promo.json'
import enTerms from './locales/en/terms.json'
import enVip from './locales/en/vip.json'
import ruAdmin from './locales/ru/admin.json'
import ruCommon from './locales/ru/common.json'
import ruDashboard from './locales/ru/dashboard.json'
import ruDownload from './locales/ru/download.json'
import ruErrors from './locales/ru/errors.json'
import ruHeader from './locales/ru/header.json'
import ruHelper from './locales/ru/helper.json'
import ruHome from './locales/ru/home.json'
import ruLogin from './locales/ru/login.json'
import ruPromo from './locales/ru/promo.json'
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
import ukPromo from './locales/uk/promo.json'
import ukTerms from './locales/uk/terms.json'
import ukVip from './locales/uk/vip.json'

export const defaultNS = 'common'

export const resources = {
  en: {
    admin: enAdmin,
    common: enCommon,
    dashboard: enDashboard,
    download: enDownload,
    errors: enErrors,
    header: enHeader,
    helper: enHelper,
    home: enHome,
    login: enLogin,
    promo: enPromo,
    terms: enTerms,
    vip: enVip,
  },
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
    promo: ruPromo,
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
    promo: ukPromo,
    terms: ukTerms,
    vip: ukVip,
  },
} as const
