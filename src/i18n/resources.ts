import ruCommon from './locales/ru/common.json'
import ruDownload from './locales/ru/download.json'
import ruErrors from './locales/ru/errors.json'
import ruHeader from './locales/ru/header.json'
import ruHelper from './locales/ru/helper.json'
import ruHome from './locales/ru/home.json'
import ruLogin from './locales/ru/login.json'
import ukCommon from './locales/uk/common.json'
import ukDownload from './locales/uk/download.json'
import ukErrors from './locales/uk/errors.json'
import ukHeader from './locales/uk/header.json'
import ukHelper from './locales/uk/helper.json'
import ukHome from './locales/uk/home.json'
import ukLogin from './locales/uk/login.json'

export const defaultNS = 'common'

export const resources = {
  ru: {
    common: ruCommon,
    download: ruDownload,
    errors: ruErrors,
    header: ruHeader,
    helper: ruHelper,
    home: ruHome,
    login: ruLogin,
  },
  uk: {
    common: ukCommon,
    download: ukDownload,
    errors: ukErrors,
    header: ukHeader,
    helper: ukHelper,
    home: ukHome,
    login: ukLogin,
  },
} as const
