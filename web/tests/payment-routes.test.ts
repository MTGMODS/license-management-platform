import { expect, it } from 'vitest'

import { routesForWallet, WALLETS } from '../src/shared/config/payment'

it('offers only supported checkout routes, without direct card transfer', () => {
  expect(routesForWallet('card')).toEqual(['funpay', 'tgStars'])
  expect(routesForWallet('crypto')).toEqual(['fragment', 'funpay', 'crypto'])
  expect(routesForWallet('stars')).toEqual(['stars'])
  expect(routesForWallet('paypal')).toEqual(['paypal'])
  expect(WALLETS.every((wallet) => routesForWallet(wallet).length > 0)).toBe(true)
})
