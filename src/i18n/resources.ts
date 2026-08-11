import ruCommon from './locales/ru/common.json'
import ruErrors from './locales/ru/errors.json'
import ruHeader from './locales/ru/header.json'
import ruHome from './locales/ru/home.json'
import ruLogin from './locales/ru/login.json'
import ukCommon from './locales/uk/common.json'
import ukErrors from './locales/uk/errors.json'
import ukHeader from './locales/uk/header.json'
import ukHome from './locales/uk/home.json'
import ukLogin from './locales/uk/login.json'

export const defaultNS = 'common'

export const resources = {
  ru: {
    common: ruCommon,
    errors: ruErrors,
    header: ruHeader,
    home: ruHome,
    login: ruLogin,
  },
  uk: {
    common: ukCommon,
    errors: ukErrors,
    header: ukHeader,
    home: ukHome,
    login: ukLogin,
  },
} as const
